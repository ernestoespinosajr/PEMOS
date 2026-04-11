'use client';

import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  CalendarDays,
  User,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  type ScheduleEvent,
  type EventCategory,
  type EventPriority,
} from '@/types/schedule';

interface UpcomingEventsListProps {
  events: ScheduleEvent[];
  total: number;
  isLoading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onEventClick: (event: ScheduleEvent) => void;
}

/**
 * List view of upcoming events sorted by date.
 *
 * Card-based layout with category and priority badges.
 * Click to open EventDetailModal. Paginated.
 */
export function UpcomingEventsList({
  events,
  total,
  isLoading,
  page,
  pageSize,
  onPageChange,
  onEventClick,
}: UpcomingEventsListProps) {
  const totalPages = Math.ceil(total / pageSize);

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-DO', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-DO', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-lg border border-border bg-surface p-4 shadow-sm"
          >
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-lg bg-neutral-100" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-neutral-100" />
                <div className="h-3 w-1/2 rounded bg-neutral-100" />
              </div>
              <div className="flex gap-1">
                <div className="h-5 w-16 rounded-md bg-neutral-100" />
                <div className="h-5 w-12 rounded-md bg-neutral-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface px-6 py-16">
        <CalendarDays
          size={48}
          strokeWidth={1}
          className="mb-4 text-placeholder"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-primary-text">
          No hay actividades proximas
        </p>
        <p className="mt-1 text-sm text-secondary-text">
          Las nuevas actividades apareceran aqui cuando sean creadas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Event Cards */}
      <ul className="space-y-3" role="list" aria-label="Proximas actividades">
        {events.map((event) => {
          const catColors =
            CATEGORY_COLORS[event.categoria as EventCategory] ??
            CATEGORY_COLORS.otro;
          const prioColors =
            PRIORITY_COLORS[event.prioridad as EventPriority] ??
            PRIORITY_COLORS.media;

          return (
            <li key={event.id}>
              <Card
                className="cursor-pointer shadow-sm transition-shadow hover:shadow-md"
                onClick={() => onEventClick(event)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onEventClick(event);
                  }
                }}
                aria-label={`${event.titulo}, ${formatDate(event.fecha_inicio)}`}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  {/* Date block */}
                  <div
                    className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-lg"
                    style={{ backgroundColor: catColors.bg }}
                  >
                    <span
                      className="text-xs font-medium uppercase leading-none"
                      style={{ color: catColors.text }}
                    >
                      {new Date(event.fecha_inicio).toLocaleDateString(
                        'es-DO',
                        { month: 'short' }
                      )}
                    </span>
                    <span
                      className="text-lg font-bold leading-tight"
                      style={{ color: catColors.text }}
                    >
                      {new Date(event.fecha_inicio).getDate()}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-medium text-primary-text">
                      {event.titulo}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-secondary-text">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} aria-hidden="true" />
                        {formatDate(event.fecha_inicio)}
                      </span>
                      {!event.todo_el_dia && (
                        <span className="flex items-center gap-1">
                          <Clock size={12} aria-hidden="true" />
                          {formatTime(event.fecha_inicio)}
                        </span>
                      )}
                      {event.responsable_nombre && (
                        <span className="flex items-center gap-1">
                          <User size={12} aria-hidden="true" />
                          {event.responsable_nombre}
                        </span>
                      )}
                    </div>
                    {event.tareas_total != null && event.tareas_total > 0 && (
                      <p className="mt-1 text-xs text-secondary-text">
                        {event.tareas_completadas} de {event.tareas_total}{' '}
                        tarea{event.tareas_total !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex flex-shrink-0 flex-col gap-1 sm:flex-row">
                    <Badge
                      className="border-0 text-[10px]"
                      style={{
                        backgroundColor: catColors.bg,
                        color: catColors.text,
                      }}
                    >
                      {CATEGORY_LABELS[event.categoria as EventCategory] ??
                        event.categoria}
                    </Badge>
                    <Badge
                      className={cn('border-0 text-[10px]', prioColors.bg)}
                    >
                      {PRIORITY_LABELS[event.prioridad as EventPriority] ??
                        event.prioridad}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          className="flex items-center justify-between pt-2"
          aria-label="Paginacion de actividades proximas"
        >
          <p className="text-sm text-secondary-text">
            Mostrando{' '}
            <span className="font-medium text-primary-text">
              {(page - 1) * pageSize + 1}
            </span>
            {' - '}
            <span className="font-medium text-primary-text">
              {Math.min(page * pageSize, total)}
            </span>
            {' de '}
            <span className="font-medium text-primary-text">{total}</span>
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              aria-label="Pagina anterior"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              aria-label="Pagina siguiente"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
