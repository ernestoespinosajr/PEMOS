'use client';

import { useState, useCallback, Suspense } from 'react';
import {
  CalendarDays,
  Clock,
  Filter,
  History,
  Loader2,
  Plus,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import { DynamicScheduleCalendar } from '@/components/schedule/schedule-calendar.dynamic';
import { UpcomingEventsList } from '@/components/schedule/upcoming-events-list';
import { EventHistoryList } from '@/components/schedule/event-history-list';
import { EventFormDialog } from '@/components/schedule/event-form-dialog';
import { EventDetailModal } from '@/components/schedule/event-detail-modal';
import { useScheduleEvents } from '@/hooks/use-schedule-events';
import { useEventMutations } from '@/hooks/use-event-mutations';
import { useUserScope } from '@/hooks/use-user-scope';
import { cn } from '@/lib/utils';
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  PAGE_SIZE_SCHEDULE,
  type ScheduleView,
  type ScheduleFilters,
  type ScheduleEvent,
  type EventCategory,
  type EventPriority,
  type CreateEventData,
  type UpdateEventData,
} from '@/types/schedule';

// ---------- View Toggle ----------

const VIEW_OPTIONS: { value: ScheduleView; label: string; icon: React.ElementType }[] = [
  { value: 'calendario', label: 'Calendario', icon: CalendarDays },
  { value: 'proximos', label: 'Proximos', icon: Clock },
  { value: 'historial', label: 'Historial', icon: History },
];

// ---------- Page Content ----------

function CronogramaContent() {
  // User scope for role-gated editing
  const { role } = useUserScope();
  const canEdit = role === 'admin' || role === 'coordinator';

  // View state
  const [activeView, setActiveView] = useState<ScheduleView>('calendario');
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<ScheduleFilters>({
    categoria: '',
    prioridad: '',
    search: '',
  });

  // Calendar date range (updated by FullCalendar's datesSet callback)
  const [calendarRange, setCalendarRange] = useState<{
    start: string;
    end: string;
  }>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
  });

  // List pagination
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  // Form dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();

  // Detail modal state
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);

  // Data hooks
  const calendarData = useScheduleEvents({
    startDate: calendarRange.start,
    endDate: calendarRange.end,
    filters: filters.categoria || filters.prioridad || filters.search
      ? filters
      : undefined,
  });

  const upcomingData = useScheduleEvents({
    upcoming: true,
    filters: filters.categoria || filters.prioridad || filters.search
      ? filters
      : undefined,
    page: upcomingPage,
    pageSize: PAGE_SIZE_SCHEDULE,
  });

  const historyData = useScheduleEvents({
    history: true,
    filters: filters.categoria || filters.prioridad || filters.search
      ? filters
      : undefined,
    page: historyPage,
    pageSize: PAGE_SIZE_SCHEDULE,
  });

  // Mutations
  const mutations = useEventMutations();

  // Handlers
  const handleDatesChange = useCallback((start: string, end: string) => {
    setCalendarRange({ start, end });
  }, []);

  const handleDateClick = useCallback((dateStr: string) => {
    setEditingEvent(null);
    setDefaultDate(dateStr);
    setFormOpen(true);
  }, []);

  const handleEventClick = useCallback((event: ScheduleEvent) => {
    setSelectedEvent(event);
    setDetailOpen(true);
  }, []);

  const handleNewEvent = useCallback(() => {
    setEditingEvent(null);
    setDefaultDate(undefined);
    setFormOpen(true);
  }, []);

  const handleEditEvent = useCallback((event: ScheduleEvent) => {
    setDetailOpen(false);
    setEditingEvent(event);
    setFormOpen(true);
  }, []);

  const handleFormSubmit = useCallback(
    async (data: CreateEventData | UpdateEventData): Promise<boolean> => {
      let success: boolean;
      if ('id' in data && data.id) {
        success = await mutations.updateEvent(data as UpdateEventData);
      } else {
        const id = await mutations.createEvent(data as CreateEventData);
        success = !!id;
      }

      if (success) {
        // Refetch all views
        calendarData.refetch();
        upcomingData.refetch();
        historyData.refetch();
      }

      return success;
    },
    [mutations, calendarData, upcomingData, historyData]
  );

  const handleDeleteEvent = useCallback(
    async (eventId: string) => {
      const success = await mutations.deleteEvent(eventId);
      if (success) {
        calendarData.refetch();
        upcomingData.refetch();
        historyData.refetch();
      }
    },
    [mutations, calendarData, upcomingData, historyData]
  );

  const handleTaskToggle = useCallback(
    async (taskId: string, completada: boolean) => {
      await mutations.toggleTask(taskId, completada);
    },
    [mutations]
  );

  const handleTaskAdd = useCallback(
    async (actividadId: string, titulo: string) => {
      await mutations.createTask({ cronograma_id: actividadId, titulo });
    },
    [mutations]
  );

  const handleTaskDelete = useCallback(
    async (taskId: string) => {
      await mutations.deleteTask(taskId);
    },
    [mutations]
  );

  function handleFilterChange(key: keyof ScheduleFilters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setUpcomingPage(1);
    setHistoryPage(1);
  }

  function clearFilters() {
    setFilters({ categoria: '', prioridad: '', search: '' });
    setUpcomingPage(1);
    setHistoryPage(1);
  }

  const hasActiveFilters =
    !!filters.categoria || !!filters.prioridad || !!filters.search;

  return (
    <div>
      {/* Page Header */}
      <div className="mb-space-6 flex flex-col gap-space-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary-text">
            Cronograma Electoral
          </h2>
          <p className="mt-space-1 text-sm text-secondary-text">
            Calendario de actividades, eventos y reuniones
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleNewEvent} className="sm:flex-shrink-0">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Nueva Actividad
          </Button>
        )}
      </div>

      {/* View Toggle + Filters */}
      <div className="mb-space-4 flex flex-col gap-space-3 sm:flex-row sm:items-center sm:justify-between">
        {/* View Toggle */}
        <div
          className="inline-flex rounded-lg border border-border bg-surface p-1"
          role="tablist"
          aria-label="Vista del cronograma"
        >
          {VIEW_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive = activeView === option.value;
            return (
              <button
                key={option.value}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveView(option.value)}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-body-text hover:bg-neutral-100 hover:text-primary-text'
                )}
              >
                <Icon size={16} aria-hidden="true" />
                <span className="hidden sm:inline">{option.label}</span>
              </button>
            );
          })}
        </div>

        {/* Filter toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(hasActiveFilters && 'border-primary text-primary')}
        >
          <Filter size={16} className="mr-1" aria-hidden="true" />
          Filtros
          {hasActiveFilters && (
            <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-white">
              {[filters.categoria, filters.prioridad, filters.search].filter(Boolean).length}
            </span>
          )}
        </Button>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="mb-space-4 rounded-lg border border-border bg-surface p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label
                htmlFor="filter-search"
                className="text-xs font-medium text-body-text"
              >
                Buscar
              </label>
              <Input
                id="filter-search"
                placeholder="Buscar actividades..."
                value={filters.search ?? ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
            <div className="w-full space-y-1.5 sm:w-40">
              <label
                htmlFor="filter-cat"
                className="text-xs font-medium text-body-text"
              >
                Categoria
              </label>
              <SelectNative
                id="filter-cat"
                value={filters.categoria ?? ''}
                onChange={(e) => handleFilterChange('categoria', e.target.value)}
              >
                <option value="">Todas</option>
                {(Object.keys(CATEGORY_LABELS) as EventCategory[]).map(
                  (key) => (
                    <option key={key} value={key}>
                      {CATEGORY_LABELS[key]}
                    </option>
                  )
                )}
              </SelectNative>
            </div>
            <div className="w-full space-y-1.5 sm:w-36">
              <label
                htmlFor="filter-prio"
                className="text-xs font-medium text-body-text"
              >
                Prioridad
              </label>
              <SelectNative
                id="filter-prio"
                value={filters.prioridad ?? ''}
                onChange={(e) => handleFilterChange('prioridad', e.target.value)}
              >
                <option value="">Todas</option>
                {(Object.keys(PRIORITY_LABELS) as EventPriority[]).map(
                  (key) => (
                    <option key={key} value={key}>
                      {PRIORITY_LABELS[key]}
                    </option>
                  )
                )}
              </SelectNative>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-secondary-text"
              >
                <X size={14} className="mr-1" aria-hidden="true" />
                Limpiar
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Error state */}
      {(calendarData.error || upcomingData.error || historyData.error) && (
        <div
          className="mb-space-4 rounded-md border border-destructive/20 bg-destructive/5 p-3"
          role="alert"
          aria-live="polite"
        >
          <p className="text-sm text-destructive">
            {calendarData.error || upcomingData.error || historyData.error}
          </p>
        </div>
      )}

      {/* View Content */}
      <div role="tabpanel" aria-label={`Vista: ${activeView}`}>
        {activeView === 'calendario' && (
          <DynamicScheduleCalendar
            events={calendarData.calendarEvents}
            isLoading={calendarData.isLoading}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
            onDatesChange={handleDatesChange}
          />
        )}

        {activeView === 'proximos' && (
          <UpcomingEventsList
            events={upcomingData.events}
            total={upcomingData.total}
            isLoading={upcomingData.isLoading}
            page={upcomingPage}
            pageSize={PAGE_SIZE_SCHEDULE}
            onPageChange={setUpcomingPage}
            onEventClick={handleEventClick}
          />
        )}

        {activeView === 'historial' && (
          <EventHistoryList
            events={historyData.events}
            total={historyData.total}
            isLoading={historyData.isLoading}
            page={historyPage}
            pageSize={PAGE_SIZE_SCHEDULE}
            onPageChange={setHistoryPage}
            onEventClick={handleEventClick}
          />
        )}
      </div>

      {/* Event Form Dialog */}
      <EventFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        event={editingEvent}
        defaultDate={defaultDate}
        onSubmit={handleFormSubmit}
      />

      {/* Event Detail Modal */}
      <EventDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        event={selectedEvent}
        editable={canEdit}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
        onTaskToggle={handleTaskToggle}
        onTaskAdd={handleTaskAdd}
        onTaskDelete={handleTaskDelete}
      />
    </div>
  );
}

// ---------- Page Export ----------

export default function CronogramaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2
            className="h-8 w-8 animate-spin text-primary"
            aria-label="Cargando cronograma"
          />
        </div>
      }
    >
      <CronogramaContent />
    </Suspense>
  );
}
