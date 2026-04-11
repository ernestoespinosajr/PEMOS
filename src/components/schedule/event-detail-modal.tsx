'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Edit,
  Loader2,
  MapPin,
  Repeat,
  Trash2,
  User,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TaskList } from './task-list';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

// NOTE: cronogramas/cronograma_tareas tables are not yet in generated Supabase types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  FREQUENCY_LABELS,
  type ScheduleEvent,
  type ScheduleTask,
  type EventCategory,
  type EventPriority,
  type EventStatus,
} from '@/types/schedule';

interface EventDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: ScheduleEvent | null;
  /** Whether the user can edit/delete (admin/coordinator). */
  editable?: boolean;
  onEdit?: (event: ScheduleEvent) => void;
  onDelete?: (eventId: string) => Promise<void>;
  onTaskToggle?: (taskId: string, completada: boolean) => Promise<void>;
  onTaskAdd?: (actividadId: string, titulo: string) => Promise<void>;
  onTaskDelete?: (taskId: string) => Promise<void>;
}

/**
 * Modal showing full event details when an event is clicked on the calendar.
 *
 * Displays: title, description, dates, category badge, priority badge,
 * status badge, responsible person, geographic scope, recurrence info,
 * and task list with interactive checkboxes.
 *
 * Edit and Delete buttons are role-gated (shown only when editable=true).
 */
export function EventDetailModal({
  open,
  onOpenChange,
  event,
  editable = false,
  onEdit,
  onDelete,
  onTaskToggle,
  onTaskAdd,
  onTaskDelete,
}: EventDetailModalProps) {
  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch tasks for the event
  const fetchTasks = useCallback(async () => {
    if (!event?.id) return;
    setLoadingTasks(true);
    try {
      const supabase = createClient();
      const { data, error } = await (supabase as SupabaseAny)
        .from('cronograma_tareas')
        .select(
          `
          *,
          asignado:usuarios!asignado_a(nombre, apellido)
        `
        )
        .eq('cronograma_id', event.id)
        .order('orden', { ascending: true });

      if (!error && data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: ScheduleTask[] = data.map((row: any) => {
          const r = row as Record<string, unknown>;
          const resp = r.asignado as { nombre: string; apellido: string } | null;
          return {
            id: r.id as string,
            cronograma_id: r.cronograma_id as string,
            titulo: r.titulo as string,
            descripcion: r.descripcion as string | null,
            asignado_a: r.asignado_a as string | null,
            fecha_limite: r.fecha_limite as string | null,
            completada: r.completada as boolean,
            orden: (r.orden as number) ?? 0,
            tenant_id: r.tenant_id as string,
            created_at: r.created_at as string,
            updated_at: r.updated_at as string,
            asignado_nombre: resp
              ? `${resp.nombre} ${resp.apellido}`
              : null,
          };
        });
        setTasks(mapped);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  }, [event?.id]);

  useEffect(() => {
    if (open && event) {
      fetchTasks();
    } else {
      setTasks([]);
      setShowDeleteConfirm(false);
    }
  }, [open, event, fetchTasks]);

  if (!event) return null;

  const catColors = CATEGORY_COLORS[event.categoria as EventCategory] ?? CATEGORY_COLORS.otro;
  const prioColors = PRIORITY_COLORS[event.prioridad as EventPriority] ?? PRIORITY_COLORS.media;
  const statusColors = STATUS_COLORS[event.estado as EventStatus] ?? STATUS_COLORS.planificado;

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-DO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-DO', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  async function handleDelete() {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete(event!.id);
      onOpenChange(false);
    } finally {
      setDeleting(false);
    }
  }

  async function handleTaskToggle(taskId: string, completada: boolean) {
    if (onTaskToggle) {
      await onTaskToggle(taskId, completada);
    }
    // Refetch to stay in sync
    await fetchTasks();
  }

  async function handleTaskAdd(titulo: string) {
    if (onTaskAdd && event) {
      await onTaskAdd(event.id, titulo);
    }
    await fetchTasks();
  }

  async function handleTaskDelete(taskId: string) {
    if (onTaskDelete) {
      await onTaskDelete(taskId);
    }
    await fetchTasks();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[680px] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            {/* Category color dot */}
            <span
              className="mt-1.5 h-3 w-3 flex-shrink-0 rounded-full"
              style={{ backgroundColor: catColors.dot }}
              aria-hidden="true"
            />
            <div className="flex-1">
              <DialogTitle className="text-xl">{event.titulo}</DialogTitle>
              <DialogDescription className="sr-only">
                Detalles de la actividad del cronograma
              </DialogDescription>
            </div>
          </div>

          {/* Badges */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge
              className={cn(
                'border-0 text-xs font-medium',
                statusColors.bg
              )}
            >
              {STATUS_LABELS[event.estado as EventStatus] ?? event.estado}
            </Badge>
            <Badge
              className={cn(
                'border-0 text-xs font-medium',
                prioColors.bg
              )}
            >
              {PRIORITY_LABELS[event.prioridad as EventPriority] ?? event.prioridad}
            </Badge>
            <Badge
              className="border-0 text-xs font-medium"
              style={{
                backgroundColor: catColors.bg,
                color: catColors.text,
              }}
            >
              {CATEGORY_LABELS[event.categoria as EventCategory] ?? event.categoria}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Description */}
          {event.descripcion && (
            <p className="text-sm leading-relaxed text-body-text">
              {event.descripcion}
            </p>
          )}

          {/* Dates */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-body-text">
              <Calendar size={16} className="text-secondary-text" aria-hidden="true" />
              <span>{formatDate(event.fecha_inicio)}</span>
              {event.fecha_inicio !== event.fecha_fin && (
                <>
                  <span className="text-secondary-text">-</span>
                  <span>{formatDate(event.fecha_fin)}</span>
                </>
              )}
            </div>
            {!event.todo_el_dia && (
              <div className="flex items-center gap-2 text-sm text-secondary-text">
                <Clock size={16} aria-hidden="true" />
                <span>
                  {formatTime(event.fecha_inicio)} - {formatTime(event.fecha_fin)}
                </span>
              </div>
            )}
            {event.todo_el_dia && (
              <div className="flex items-center gap-2 text-sm text-secondary-text">
                <Clock size={16} aria-hidden="true" />
                <span>Todo el dia</span>
              </div>
            )}
          </div>

          {/* Responsible */}
          {event.responsable_nombre && (
            <div className="flex items-center gap-2 text-sm text-body-text">
              <User size={16} className="text-secondary-text" aria-hidden="true" />
              <span>Responsable: {event.responsable_nombre}</span>
            </div>
          )}

          {/* Geographic scope */}
          {event.nivel_geografico && (
            <div className="flex items-center gap-2 text-sm text-body-text">
              <MapPin size={16} className="text-secondary-text" aria-hidden="true" />
              <span className="capitalize">
                {event.nivel_geografico}
              </span>
            </div>
          )}

          {/* Recurrence */}
          {event.es_recurrente && event.patron_recurrencia && (
            <div className="flex items-center gap-2 text-sm text-body-text">
              <Repeat size={16} className="text-secondary-text" aria-hidden="true" />
              <span>
                {FREQUENCY_LABELS[event.patron_recurrencia.frequency]}
                {event.patron_recurrencia.interval > 1 &&
                  `, cada ${event.patron_recurrencia.interval}`}
              </span>
            </div>
          )}

          {/* Divider */}
          <hr className="border-border" />

          {/* Tasks */}
          <div>
            {loadingTasks ? (
              <div className="flex items-center justify-center py-4">
                <Loader2
                  className="h-5 w-5 animate-spin text-primary"
                  aria-label="Cargando tareas"
                />
              </div>
            ) : (
              <TaskList
                tasks={tasks}
                editable={editable}
                onToggle={handleTaskToggle}
                onAdd={handleTaskAdd}
                onDelete={handleTaskDelete}
              />
            )}
          </div>
        </div>

        {/* Actions */}
        {editable && (
          <DialogFooter className="gap-2 sm:gap-0">
            {showDeleteConfirm ? (
              <div className="flex w-full items-center justify-between gap-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2">
                <span className="text-sm text-destructive">
                  Eliminar esta actividad?
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting && (
                      <Loader2
                        className="mr-1 h-3 w-3 animate-spin"
                        aria-hidden="true"
                      />
                    )}
                    Eliminar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 size={16} className="mr-1" aria-hidden="true" />
                  Eliminar
                </Button>
                <Button
                  size="sm"
                  onClick={() => onEdit?.(event)}
                >
                  <Edit size={16} className="mr-1" aria-hidden="true" />
                  Editar
                </Button>
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
