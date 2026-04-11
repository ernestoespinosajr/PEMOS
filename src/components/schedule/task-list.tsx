'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Loader2,
  Plus,
  Trash2,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ScheduleTask } from '@/types/schedule';

interface TaskListProps {
  tasks: ScheduleTask[];
  /** Whether the user can add/edit/delete tasks. */
  editable?: boolean;
  onToggle?: (taskId: string, completada: boolean) => Promise<void>;
  onAdd?: (titulo: string) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
}

/**
 * Displays sub-tasks for a schedule event as a checklist.
 *
 * Features:
 * - Checkbox toggle for task completion
 * - Inline add new task
 * - Delete task button (editable mode only)
 * - Progress indicator (e.g., "3 de 5 tareas completadas")
 * - Accessible checkbox implementation using real input elements
 */
export function TaskList({
  tasks,
  editable = false,
  onToggle,
  onAdd,
  onDelete,
}: TaskListProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const completedCount = tasks.filter((t) => t.completada).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  async function handleToggle(task: ScheduleTask) {
    if (!onToggle) return;
    setTogglingId(task.id);
    try {
      await onToggle(task.id, !task.completada);
    } finally {
      setTogglingId(null);
    }
  }

  async function handleAdd() {
    if (!onAdd || !newTaskTitle.trim()) return;
    setAddingTask(true);
    try {
      await onAdd(newTaskTitle.trim());
      setNewTaskTitle('');
    } finally {
      setAddingTask(false);
    }
  }

  async function handleDelete(taskId: string) {
    if (!onDelete) return;
    setDeletingId(taskId);
    try {
      await onDelete(taskId);
    } finally {
      setDeletingId(null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  }

  return (
    <div className="space-y-3">
      {/* Progress */}
      {totalCount > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-body-text">
              Tareas
            </span>
            <span className="text-xs text-secondary-text">
              {completedCount} de {totalCount} completada
              {totalCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100"
            role="progressbar"
            aria-valuenow={completedCount}
            aria-valuemin={0}
            aria-valuemax={totalCount}
            aria-label={`${completedCount} de ${totalCount} tareas completadas`}
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Task Items */}
      {totalCount > 0 && (
        <ul className="space-y-1" role="list" aria-label="Lista de tareas">
          {tasks.map((task) => {
            const isToggling = togglingId === task.id;
            const isDeleting = deletingId === task.id;

            return (
              <li
                key={task.id}
                className="group flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-neutral-50"
              >
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={() => handleToggle(task)}
                  disabled={isToggling || !editable}
                  className="flex-shrink-0 text-secondary-text transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
                  aria-label={
                    task.completada
                      ? `Marcar "${task.titulo}" como pendiente`
                      : `Marcar "${task.titulo}" como completada`
                  }
                >
                  {isToggling ? (
                    <Loader2
                      size={20}
                      className="animate-spin text-primary"
                      aria-hidden="true"
                    />
                  ) : task.completada ? (
                    <CheckCircle2
                      size={20}
                      className="text-primary"
                      aria-hidden="true"
                    />
                  ) : (
                    <Circle size={20} aria-hidden="true" />
                  )}
                </button>

                {/* Title */}
                <span
                  className={cn(
                    'flex-1 text-sm',
                    task.completada
                      ? 'text-secondary-text line-through'
                      : 'text-primary-text'
                  )}
                >
                  {task.titulo}
                </span>

                {/* Responsable */}
                {task.asignado_nombre && (
                  <span className="hidden items-center gap-1 text-xs text-secondary-text sm:flex">
                    <User size={12} aria-hidden="true" />
                    {task.asignado_nombre}
                  </span>
                )}

                {/* Delete */}
                {editable && onDelete && (
                  <button
                    type="button"
                    onClick={() => handleDelete(task.id)}
                    disabled={isDeleting}
                    className="flex-shrink-0 text-placeholder opacity-0 transition-all hover:text-error focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary group-hover:opacity-100"
                    aria-label={`Eliminar tarea "${task.titulo}"`}
                  >
                    {isDeleting ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Trash2 size={16} aria-hidden="true" />
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Empty state */}
      {totalCount === 0 && !editable && (
        <p className="py-2 text-sm text-secondary-text">
          No hay tareas asociadas a esta actividad.
        </p>
      )}

      {/* Add task inline */}
      {editable && onAdd && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Agregar nueva tarea..."
              disabled={addingTask}
              aria-label="Titulo de la nueva tarea"
              className="pr-10"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdd}
            disabled={addingTask || !newTaskTitle.trim()}
            aria-label="Agregar tarea"
          >
            {addingTask ? (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <Plus size={16} aria-hidden="true" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
