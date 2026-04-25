'use client';

import { useCallback, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateClickArg } from '@fullcalendar/interaction';
import type { DatesSetArg, EventContentArg, EventClickArg } from '@fullcalendar/core';
import { cn } from '@/lib/utils';
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  type EventCategory,
  type ScheduleEvent,
} from '@/types/schedule';
import type { CalendarEvent } from '@/hooks/use-schedule-events';

interface ScheduleCalendarProps {
  events: CalendarEvent[];
  isLoading?: boolean;
  /** ISO date string to navigate the calendar to (e.g., first event date). */
  initialDate?: string;
  onDateClick?: (dateStr: string) => void;
  onEventClick?: (event: ScheduleEvent) => void;
  onDatesChange?: (start: string, end: string) => void;
  className?: string;
}

/**
 * FullCalendar wrapper component for the schedule module.
 *
 * Configured with:
 * - dayGrid, timeGrid, list plugins
 * - Spanish locale and button text
 * - Interaction plugin for date/event clicks
 * - Custom event rendering with category color coding
 * - Responsive: full calendar on desktop/tablet
 *
 * IMPORTANT: This component uses DOM APIs (FullCalendar) and must be
 * dynamically imported with next/dynamic and ssr: false.
 * See schedule-calendar.dynamic.tsx for the dynamic export.
 */
export function ScheduleCalendar({
  events,
  isLoading = false,
  initialDate,
  onDateClick,
  onEventClick,
  onDatesChange,
  className,
}: ScheduleCalendarProps) {
  const calendarRef = useRef<FullCalendar>(null);

  // Navigate FullCalendar to the target date when initialDate is provided.
  // This handles the case where events exist in a future period (e.g., election
  // year 2028) and the calendar must jump from the current date to show them.
  // Uses a ref to ensure we only auto-navigate once per distinct initialDate.
  // The cleanup resets the ref so that React 18 Strict Mode's
  // unmount-then-remount cycle does not skip the navigation on the second mount.
  const lastNavigatedDate = useRef<string | null>(null);
  useEffect(() => {
    if (
      initialDate &&
      initialDate !== lastNavigatedDate.current &&
      calendarRef.current
    ) {
      const api = calendarRef.current.getApi();
      api.gotoDate(initialDate);
      lastNavigatedDate.current = initialDate;
    }
    return () => {
      lastNavigatedDate.current = null;
    };
  }, [initialDate]);

  const handleDateClick = useCallback(
    (info: DateClickArg) => {
      onDateClick?.(info.dateStr);
    },
    [onDateClick]
  );

  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      const scheduleEvent = info.event.extendedProps.event as ScheduleEvent;
      onEventClick?.(scheduleEvent);
    },
    [onEventClick]
  );

  const handleDatesSet = useCallback(
    (info: DatesSetArg) => {
      onDatesChange?.(info.startStr, info.endStr);
    },
    [onDatesChange]
  );

  /**
   * Custom event content renderer.
   * Shows a colored dot + title for month/day views,
   * and full content for list views.
   */
  function renderEventContent(eventInfo: EventContentArg) {
    const scheduleEvent = eventInfo.event.extendedProps
      .event as ScheduleEvent;
    const colors =
      CATEGORY_COLORS[scheduleEvent?.categoria as EventCategory] ??
      CATEGORY_COLORS.otro;

    // List view -- show more detail
    if (eventInfo.view.type.startsWith('list')) {
      return (
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
            style={{ backgroundColor: colors.dot }}
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-primary-text">
            {eventInfo.event.title}
          </span>
          <span className="text-xs text-secondary-text">
            {CATEGORY_LABELS[scheduleEvent?.categoria as EventCategory] ??
              ''}
          </span>
        </div>
      );
    }

    // Grid views (month/week/day)
    return (
      <div className="flex items-center gap-1 overflow-hidden px-1">
        <span
          className="h-2 w-2 flex-shrink-0 rounded-full"
          style={{ backgroundColor: colors.dot }}
          aria-hidden="true"
        />
        {eventInfo.timeText && (
          <span className="flex-shrink-0 text-[10px] font-medium opacity-75">
            {eventInfo.timeText}
          </span>
        )}
        <span className="truncate text-xs font-medium">
          {eventInfo.event.title}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'pemos-calendar rounded-lg border border-border bg-surface p-4 shadow-sm',
        isLoading && 'opacity-60',
        className
      )}
    >
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale="es"
        // Spanish button text
        buttonText={{
          today: 'Hoy',
          month: 'Mes',
          week: 'Semana',
          day: 'Dia',
          list: 'Lista',
        }}
        // Header toolbar
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
        }}
        // Events
        events={events}
        eventContent={renderEventContent}
        // Interaction
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        datesSet={handleDatesSet}
        // Appearance
        height="auto"
        dayMaxEvents={3}
        navLinks
        nowIndicator
        weekNumbers={false}
        // Accessibility
        eventInteractive
        // First day = Monday
        firstDay={1}
      />

      {/* Custom styles for FullCalendar integration with PEMOS design system */}
      <style jsx global>{`
        /* FullCalendar PEMOS Design System Overrides */
        .pemos-calendar .fc {
          --fc-border-color: #e5e5e5;
          --fc-button-bg-color: #ffffff;
          --fc-button-border-color: #e5e5e5;
          --fc-button-text-color: #525252;
          --fc-button-hover-bg-color: #f5f5f5;
          --fc-button-hover-border-color: #d4d4d4;
          --fc-button-active-bg-color: #2d6a4f;
          --fc-button-active-border-color: #2d6a4f;
          --fc-button-active-text-color: #ffffff;
          --fc-today-bg-color: #e8f5e9;
          --fc-neutral-bg-color: #fafafa;
          --fc-list-event-hover-bg-color: #f5f5f5;
          --fc-highlight-color: rgba(45, 106, 79, 0.08);
          --fc-event-border-color: transparent;
          --fc-page-bg-color: #ffffff;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }

        /* Toolbar buttons */
        .pemos-calendar .fc .fc-button {
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          padding: 6px 12px;
          transition: all 150ms ease;
          box-shadow: none;
        }

        .pemos-calendar .fc .fc-button:focus {
          box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #2d6a4f;
          outline: none;
        }

        .pemos-calendar .fc .fc-button-group > .fc-button {
          border-radius: 0;
        }

        .pemos-calendar .fc .fc-button-group > .fc-button:first-child {
          border-top-left-radius: 8px;
          border-bottom-left-radius: 8px;
        }

        .pemos-calendar .fc .fc-button-group > .fc-button:last-child {
          border-top-right-radius: 8px;
          border-bottom-right-radius: 8px;
        }

        /* Toolbar title */
        .pemos-calendar .fc .fc-toolbar-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #171717;
          text-transform: capitalize;
        }

        /* Day headers */
        .pemos-calendar .fc .fc-col-header-cell {
          padding: 8px 0;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #737373;
        }

        /* Day numbers */
        .pemos-calendar .fc .fc-daygrid-day-number {
          font-size: 0.875rem;
          color: #525252;
          padding: 4px 8px;
        }

        .pemos-calendar .fc .fc-day-today .fc-daygrid-day-number {
          background-color: #2d6a4f;
          color: #ffffff;
          border-radius: 9999px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }

        /* Events */
        .pemos-calendar .fc .fc-event {
          border-radius: 4px;
          border: none;
          padding: 1px 0;
          cursor: pointer;
          transition: opacity 150ms ease;
        }

        .pemos-calendar .fc .fc-event:hover {
          opacity: 0.85;
        }

        .pemos-calendar .fc .fc-event:focus {
          box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #2d6a4f;
          outline: none;
        }

        /* Day grid more link */
        .pemos-calendar .fc .fc-daygrid-more-link {
          font-size: 0.75rem;
          font-weight: 500;
          color: #2d6a4f;
          padding: 2px 4px;
        }

        /* List view */
        .pemos-calendar .fc .fc-list-day-cushion {
          background-color: #fafafa;
          font-weight: 600;
          color: #404040;
        }

        .pemos-calendar .fc .fc-list-event td {
          padding: 8px 12px;
          border-color: #e5e5e5;
        }

        /* Time grid */
        .pemos-calendar .fc .fc-timegrid-slot {
          height: 40px;
          border-color: #e5e5e5;
        }

        .pemos-calendar .fc .fc-timegrid-slot-label {
          font-size: 0.75rem;
          color: #a3a3a3;
        }

        /* Now indicator */
        .pemos-calendar .fc .fc-timegrid-now-indicator-line {
          border-color: #dc2626;
        }

        .pemos-calendar .fc .fc-timegrid-now-indicator-arrow {
          border-color: #dc2626;
        }

        /* Responsive: stack toolbar on small screens */
        @media (max-width: 640px) {
          .pemos-calendar .fc .fc-toolbar {
            flex-direction: column;
            gap: 8px;
          }

          .pemos-calendar .fc .fc-toolbar-title {
            font-size: 1rem;
          }

          .pemos-calendar .fc .fc-button {
            font-size: 0.75rem;
            padding: 4px 8px;
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .pemos-calendar .fc .fc-event {
            transition: none;
          }
          .pemos-calendar .fc .fc-button {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
