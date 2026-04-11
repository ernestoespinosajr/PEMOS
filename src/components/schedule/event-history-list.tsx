'use client';

import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  User,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  type ScheduleEvent,
  type EventCategory,
  type EventStatus,
} from '@/types/schedule';

interface EventHistoryListProps {
  events: ScheduleEvent[];
  total: number;
  isLoading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onEventClick: (event: ScheduleEvent) => void;
}

/**
 * Past events with completion status.
 *
 * Sorted by end date (most recent first). Paginated.
 * Shows category badge, status badge, and completion indicator.
 */
export function EventHistoryList({
  events,
  total,
  isLoading,
  page,
  pageSize,
  onPageChange,
  onEventClick,
}: EventHistoryListProps) {
  const totalPages = Math.ceil(total / pageSize);

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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
              <div className="h-10 w-10 rounded-full bg-neutral-100" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-neutral-100" />
                <div className="h-3 w-1/2 rounded bg-neutral-100" />
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
        <History
          size={48}
          strokeWidth={1}
          className="mb-4 text-placeholder"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-primary-text">
          No hay actividades pasadas
        </p>
        <p className="mt-1 text-sm text-secondary-text">
          El historial se poblara conforme se completen actividades.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-3" role="list" aria-label="Historial de actividades">
        {events.map((event) => {
          const catColors =
            CATEGORY_COLORS[event.categoria as EventCategory] ??
            CATEGORY_COLORS.otro;
          const statColors =
            STATUS_COLORS[event.estado as EventStatus] ??
            STATUS_COLORS.planificado;
          const isCompleted = event.estado === 'completado';
          const isCancelled = event.estado === 'cancelado';

          return (
            <li key={event.id}>
              <Card
                className={cn(
                  'cursor-pointer shadow-sm transition-shadow hover:shadow-md',
                  (isCancelled) && 'opacity-70'
                )}
                onClick={() => onEventClick(event)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onEventClick(event);
                  }
                }}
                aria-label={`${event.titulo}, ${formatDate(event.fecha_fin)}`}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  {/* Status icon */}
                  <div className="flex-shrink-0 pt-0.5">
                    {isCompleted ? (
                      <CheckCircle2
                        size={24}
                        className="text-green-600"
                        aria-label="Completada"
                      />
                    ) : isCancelled ? (
                      <XCircle
                        size={24}
                        className="text-red-500"
                        aria-label="Cancelada"
                      />
                    ) : (
                      <Clock
                        size={24}
                        className="text-yellow-600"
                        aria-label="En progreso"
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <h3
                      className={cn(
                        'truncate text-sm font-medium',
                        isCancelled
                          ? 'text-secondary-text line-through'
                          : 'text-primary-text'
                      )}
                    >
                      {event.titulo}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-secondary-text">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} aria-hidden="true" />
                        {formatDate(event.fecha_inicio)} - {formatDate(event.fecha_fin)}
                      </span>
                      {event.responsable_nombre && (
                        <span className="flex items-center gap-1">
                          <User size={12} aria-hidden="true" />
                          {event.responsable_nombre}
                        </span>
                      )}
                    </div>
                    {event.tareas_total != null && event.tareas_total > 0 && (
                      <p className="mt-1 text-xs text-secondary-text">
                        {event.tareas_completadas} de {event.tareas_total} tarea
                        {event.tareas_total !== 1 ? 's' : ''} completada
                        {event.tareas_total !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex flex-shrink-0 flex-col gap-1 sm:flex-row">
                    <Badge
                      className={cn('border-0 text-[10px]', statColors.bg)}
                    >
                      {STATUS_LABELS[event.estado as EventStatus] ??
                        event.estado}
                    </Badge>
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
          aria-label="Paginacion del historial"
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
