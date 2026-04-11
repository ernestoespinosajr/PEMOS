'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  ScheduleEvent,
  ScheduleFilters,
  EventCategory,
} from '@/types/schedule';
import { CATEGORY_COLORS as CategoryColors } from '@/types/schedule';

// NOTE: cronogramas table is not yet in the generated Supabase
// types (migration pending). Using `as any` until types are regenerated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

interface UseScheduleEventsOptions {
  /** Start of visible date range (ISO string). */
  startDate?: string;
  /** End of visible date range (ISO string). */
  endDate?: string;
  /** Filter by category, priority, status, search. */
  filters?: ScheduleFilters;
  /** Whether to fetch upcoming (future) events only. */
  upcoming?: boolean;
  /** Whether to fetch past events only. */
  history?: boolean;
  /** Page number for list views (1-based). */
  page?: number;
  /** Items per page for list views. */
  pageSize?: number;
}

interface UseScheduleEventsReturn {
  events: ScheduleEvent[];
  /** Events formatted for FullCalendar. */
  calendarEvents: CalendarEvent[];
  total: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/** FullCalendar-compatible event shape. */
export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: {
    event: ScheduleEvent;
  };
}

/**
 * Hook for fetching schedule events from the `cronogramas` table.
 *
 * Follows the project pattern: Supabase client + useState/useEffect,
 * with abort controller for cleanup and refetch capability.
 */
export function useScheduleEvents({
  startDate,
  endDate,
  filters,
  upcoming = false,
  history = false,
  page = 1,
  pageSize = 20,
}: UseScheduleEventsOptions = {}): UseScheduleEventsReturn {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fetchCountRef = useRef(0);

  const fetchEvents = useCallback(async () => {
    // Cancel previous in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();
    const fetchId = ++fetchCountRef.current;

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const now = new Date().toISOString();

      let query = (supabase as SupabaseAny)
        .from('cronogramas')
        .select(
          `
          *,
          responsable:usuarios!responsable_id(nombre, apellido),
          cronograma_tareas(id, completada)
        `,
          { count: 'exact' }
        );

      // Date range filter (for calendar view)
      if (startDate && endDate) {
        // Events that overlap with the visible range
        query = query
          .lte('fecha_inicio', endDate)
          .gte('fecha_fin', startDate);
      }

      // Upcoming: future events sorted by start date ascending
      if (upcoming) {
        query = query.gte('fecha_inicio', now).order('fecha_inicio', { ascending: true });
      }

      // History: past events sorted by end date descending
      if (history) {
        query = query.lt('fecha_fin', now).order('fecha_fin', { ascending: false });
      }

      // Default sort for calendar
      if (!upcoming && !history) {
        query = query.order('fecha_inicio', { ascending: true });
      }

      // Apply filters
      if (filters?.categoria) {
        query = query.eq('categoria', filters.categoria);
      }
      if (filters?.prioridad) {
        query = query.eq('prioridad', filters.prioridad);
      }
      if (filters?.estado) {
        query = query.eq('estado', filters.estado);
      }
      if (filters?.search) {
        const term = `%${filters.search}%`;
        query = query.or(`titulo.ilike.${term},descripcion.ilike.${term}`);
      }

      // Pagination for list views
      if (upcoming || history) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);
      }

      const { data, count, error: queryError } = await query;

      // Guard against stale responses
      if (fetchId !== fetchCountRef.current) return;

      if (queryError) {
        setError('Error al cargar actividades del cronograma');
        console.error('Schedule fetch error:', queryError);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: ScheduleEvent[] = (data ?? []).map((row: any) => {
        const r = row as Record<string, unknown>;
        const resp = r.responsable as { nombre: string; apellido: string } | null;
        const tareas = (r.cronograma_tareas ?? []) as Array<{
          id: string;
          completada: boolean;
        }>;

        return {
          id: r.id as string,
          titulo: r.titulo as string,
          descripcion: r.descripcion as string | null,
          responsable_id: r.responsable_id as string | null,
          fecha_inicio: r.fecha_inicio as string,
          fecha_fin: r.fecha_fin as string,
          todo_el_dia: (r.todo_el_dia as boolean) ?? false,
          categoria: (r.categoria as EventCategory) ?? 'otro',
          prioridad: (r.prioridad as ScheduleEvent['prioridad']) ?? 'media',
          estado: (r.estado as ScheduleEvent['estado']) ?? 'planificado',
          color: r.color as string | null,
          nivel_geografico: r.nivel_geografico as string | null,
          nivel_id: r.nivel_id as string | null,
          es_recurrente: (r.es_recurrente as boolean) ?? false,
          patron_recurrencia: r.patron_recurrencia as ScheduleEvent['patron_recurrencia'],
          recurrencia_padre_id: r.recurrencia_padre_id as string | null,
          created_at: r.created_at as string,
          updated_at: r.updated_at as string,
          created_by: r.created_by as string | null,
          responsable_nombre: resp
            ? `${resp.nombre} ${resp.apellido}`
            : null,
          tareas_completadas: tareas.filter((t) => t.completada).length,
          tareas_total: tareas.length,
        };
      });

      setEvents(mapped);
      setTotal(count ?? 0);
    } catch (err) {
      if (fetchId !== fetchCountRef.current) return;
      if ((err as Error).name === 'AbortError') return;
      console.error('Schedule fetch exception:', err);
      setError('Error de conexion al cargar el cronograma');
    } finally {
      if (fetchId === fetchCountRef.current) {
        setIsLoading(false);
      }
    }
  }, [startDate, endDate, filters?.categoria, filters?.prioridad, filters?.estado, filters?.search, upcoming, history, page, pageSize]);

  useEffect(() => {
    fetchEvents();
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [fetchEvents]);

  // Transform events to FullCalendar format
  const calendarEvents: CalendarEvent[] = events.map((evt) => {
    const colors = CategoryColors[evt.categoria] ?? CategoryColors.otro;
    return {
      id: evt.id,
      title: evt.titulo,
      start: evt.fecha_inicio,
      end: evt.fecha_fin,
      allDay: evt.todo_el_dia,
      backgroundColor: evt.color ?? colors.bg,
      borderColor: evt.color ?? colors.border,
      textColor: colors.text,
      extendedProps: { event: evt },
    };
  });

  return {
    events,
    calendarEvents,
    total,
    isLoading,
    error,
    refetch: fetchEvents,
  };
}
