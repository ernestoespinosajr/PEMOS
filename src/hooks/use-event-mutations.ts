'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

// NOTE: cronogramas and cronograma_tareas tables are not yet
// in the generated Supabase types (migration pending). Using `as any` on
// the supabase client for .from() calls until types are regenerated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;
import type {
  CreateEventData,
  UpdateEventData,
  CreateTaskData,
  UpdateTaskData,
} from '@/types/schedule';

interface MutationState {
  isLoading: boolean;
  error: string | null;
}

interface UseEventMutationsReturn {
  // Event mutations
  createEvent: (data: CreateEventData) => Promise<string | null>;
  updateEvent: (data: UpdateEventData) => Promise<boolean>;
  deleteEvent: (id: string) => Promise<boolean>;
  // Task mutations
  createTask: (data: CreateTaskData) => Promise<string | null>;
  updateTask: (data: UpdateTaskData) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  toggleTask: (id: string, completada: boolean) => Promise<boolean>;
  // State
  state: MutationState;
  clearError: () => void;
}

/**
 * Mutation hook for schedule events and tasks.
 *
 * Provides create, update, delete operations for both
 * cronogramas and cronograma_tareas.
 * Returns the new ID on create, or boolean success on update/delete.
 * Error messages are in Spanish for user-facing display.
 */
export function useEventMutations(): UseEventMutationsReturn {
  const [state, setState] = useState<MutationState>({
    isLoading: false,
    error: null,
  });

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // ---------- Event Mutations ----------

  const createEvent = useCallback(
    async (data: CreateEventData): Promise<string | null> => {
      setState({ isLoading: true, error: null });
      try {
        const supabase = createClient();
        const { data: result, error } = await (supabase as SupabaseAny)
          .from('cronogramas')
          .insert({
            titulo: data.titulo,
            descripcion: data.descripcion ?? null,
            responsable_id: data.responsable_id ?? null,
            fecha_inicio: data.fecha_inicio,
            fecha_fin: data.fecha_fin,
            todo_el_dia: data.todo_el_dia ?? false,
            categoria: data.categoria,
            prioridad: data.prioridad,
            estado: data.estado ?? 'planificado',
            color: data.color ?? null,
            nivel_geografico: data.nivel_geografico ?? null,
            nivel_id: data.nivel_id ?? null,
            es_recurrente: data.es_recurrente ?? false,
            patron_recurrencia: data.patron_recurrencia ?? null,
          })
          .select('id')
          .single();

        if (error) {
          console.error('Create event error:', error);
          setState({
            isLoading: false,
            error: 'Error al crear la actividad. Intenta nuevamente.',
          });
          return null;
        }

        setState({ isLoading: false, error: null });
        return result.id;
      } catch (err) {
        console.error('Create event exception:', err);
        setState({
          isLoading: false,
          error: 'Error de conexion al crear la actividad.',
        });
        return null;
      }
    },
    []
  );

  const updateEvent = useCallback(
    async (data: UpdateEventData): Promise<boolean> => {
      setState({ isLoading: true, error: null });
      try {
        const supabase = createClient();
        const { id, ...updates } = data;

        const { error } = await (supabase as SupabaseAny)
          .from('cronogramas')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) {
          console.error('Update event error:', error);
          setState({
            isLoading: false,
            error: 'Error al actualizar la actividad. Intenta nuevamente.',
          });
          return false;
        }

        setState({ isLoading: false, error: null });
        return true;
      } catch (err) {
        console.error('Update event exception:', err);
        setState({
          isLoading: false,
          error: 'Error de conexion al actualizar la actividad.',
        });
        return false;
      }
    },
    []
  );

  const deleteEvent = useCallback(async (id: string): Promise<boolean> => {
    setState({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      const { error } = await (supabase as SupabaseAny)
        .from('cronogramas')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete event error:', error);
        setState({
          isLoading: false,
          error: 'Error al eliminar la actividad. Intenta nuevamente.',
        });
        return false;
      }

      setState({ isLoading: false, error: null });
      return true;
    } catch (err) {
      console.error('Delete event exception:', err);
      setState({
        isLoading: false,
        error: 'Error de conexion al eliminar la actividad.',
      });
      return false;
    }
  }, []);

  // ---------- Task Mutations ----------

  const createTask = useCallback(
    async (data: CreateTaskData): Promise<string | null> => {
      setState({ isLoading: true, error: null });
      try {
        const supabase = createClient();
        const { data: result, error } = await (supabase as SupabaseAny)
          .from('cronograma_tareas')
          .insert({
            cronograma_id: data.cronograma_id,
            titulo: data.titulo,
            descripcion: data.descripcion ?? null,
            asignado_a: data.asignado_a ?? null,
            fecha_limite: data.fecha_limite ?? null,
            orden: data.orden ?? 0,
            completada: false,
          })
          .select('id')
          .single();

        if (error) {
          console.error('Create task error:', error);
          setState({
            isLoading: false,
            error: 'Error al crear la tarea. Intenta nuevamente.',
          });
          return null;
        }

        setState({ isLoading: false, error: null });
        return result.id;
      } catch (err) {
        console.error('Create task exception:', err);
        setState({
          isLoading: false,
          error: 'Error de conexion al crear la tarea.',
        });
        return null;
      }
    },
    []
  );

  const updateTask = useCallback(
    async (data: UpdateTaskData): Promise<boolean> => {
      setState({ isLoading: true, error: null });
      try {
        const supabase = createClient();
        const { id, ...updates } = data;

        const { error } = await (supabase as SupabaseAny)
          .from('cronograma_tareas')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) {
          console.error('Update task error:', error);
          setState({
            isLoading: false,
            error: 'Error al actualizar la tarea. Intenta nuevamente.',
          });
          return false;
        }

        setState({ isLoading: false, error: null });
        return true;
      } catch (err) {
        console.error('Update task exception:', err);
        setState({
          isLoading: false,
          error: 'Error de conexion al actualizar la tarea.',
        });
        return false;
      }
    },
    []
  );

  const deleteTask = useCallback(async (id: string): Promise<boolean> => {
    setState({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      const { error } = await (supabase as SupabaseAny)
        .from('cronograma_tareas')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete task error:', error);
        setState({
          isLoading: false,
          error: 'Error al eliminar la tarea. Intenta nuevamente.',
        });
        return false;
      }

      setState({ isLoading: false, error: null });
      return true;
    } catch (err) {
      console.error('Delete task exception:', err);
      setState({
        isLoading: false,
        error: 'Error de conexion al eliminar la tarea.',
      });
      return false;
    }
  }, []);

  const toggleTask = useCallback(
    async (id: string, completada: boolean): Promise<boolean> => {
      setState({ isLoading: true, error: null });
      try {
        const supabase = createClient();
        const { error } = await (supabase as SupabaseAny)
          .from('cronograma_tareas')
          .update({
            completada,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) {
          console.error('Toggle task error:', error);
          setState({
            isLoading: false,
            error: 'Error al actualizar el estado de la tarea.',
          });
          return false;
        }

        setState({ isLoading: false, error: null });
        return true;
      } catch (err) {
        console.error('Toggle task exception:', err);
        setState({
          isLoading: false,
          error: 'Error de conexion al actualizar la tarea.',
        });
        return false;
      }
    },
    []
  );

  return {
    createEvent,
    updateEvent,
    deleteEvent,
    createTask,
    updateTask,
    deleteTask,
    toggleTask,
    state,
    clearError,
  };
}
