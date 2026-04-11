'use client';

import { useState, useEffect } from 'react';
import { Repeat } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import { cn } from '@/lib/utils';
import {
  FREQUENCY_LABELS,
  DAYS_OF_WEEK_LABELS,
  type RecurrencePattern,
  type RecurrenceFrequency,
} from '@/types/schedule';

interface RecurrenceSelectorProps {
  value: RecurrencePattern | null;
  onChange: (pattern: RecurrencePattern | null) => void;
  disabled?: boolean;
}

/**
 * UI for configuring recurring events.
 *
 * Supports daily, weekly (with day-of-week selection), monthly,
 * and yearly frequencies with interval, end date, and occurrence count.
 * Displays a human-readable preview text in Spanish.
 */
export function RecurrenceSelector({
  value,
  onChange,
  disabled = false,
}: RecurrenceSelectorProps) {
  const [enabled, setEnabled] = useState(!!value);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(
    value?.frequency ?? 'semanal'
  );
  const [interval, setInterval] = useState(value?.interval ?? 1);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(
    value?.days_of_week ?? []
  );
  const [endDate, setEndDate] = useState(value?.end_date ?? '');
  const [occurrences, setOccurrences] = useState(value?.occurrences ?? 0);
  const [endType, setEndType] = useState<'never' | 'date' | 'count'>(
    value?.end_date ? 'date' : value?.occurrences ? 'count' : 'never'
  );

  // Sync changes upward
  useEffect(() => {
    if (!enabled) {
      onChange(null);
      return;
    }

    const pattern: RecurrencePattern = {
      frequency,
      interval: Math.max(1, interval),
    };

    if (frequency === 'semanal' && daysOfWeek.length > 0) {
      pattern.days_of_week = [...daysOfWeek].sort();
    }

    if (endType === 'date' && endDate) {
      pattern.end_date = endDate;
    } else if (endType === 'count' && occurrences > 0) {
      pattern.occurrences = occurrences;
    }

    onChange(pattern);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, frequency, interval, daysOfWeek, endDate, occurrences, endType]);

  function toggleDay(day: number) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  // Build preview text
  function getPreviewText(): string {
    if (!enabled) return '';

    const freqText: Record<RecurrenceFrequency, string> = {
      diario: interval === 1 ? 'dia' : `${interval} dias`,
      semanal: interval === 1 ? 'semana' : `${interval} semanas`,
      mensual: interval === 1 ? 'mes' : `${interval} meses`,
      anual: interval === 1 ? 'ano' : `${interval} anos`,
    };

    let text = `Se repite cada ${freqText[frequency]}`;

    if (frequency === 'semanal' && daysOfWeek.length > 0) {
      const dayNames = daysOfWeek
        .sort()
        .map((d) => DAYS_OF_WEEK_LABELS[d])
        .join(', ');
      text += ` los ${dayNames}`;
    }

    if (endType === 'date' && endDate) {
      const formatted = new Date(endDate).toLocaleDateString('es-DO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      text += ` hasta ${formatted}`;
    } else if (endType === 'count' && occurrences > 0) {
      text += `, ${occurrences} ${occurrences === 1 ? 'vez' : 'veces'}`;
    }

    return text;
  }

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="recurrence-toggle"
          className="flex cursor-pointer items-center gap-2 text-sm font-medium text-body-text"
        >
          <input
            id="recurrence-toggle"
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <Repeat size={16} className="text-secondary-text" aria-hidden="true" />
          Evento recurrente
        </label>
      </div>

      {enabled && (
        <div className="space-y-4 rounded-lg border border-border bg-neutral-50 p-4">
          {/* Frequency + Interval */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="recurrence-freq">Frecuencia</Label>
              <SelectNative
                id="recurrence-freq"
                value={frequency}
                onChange={(e) =>
                  setFrequency(e.target.value as RecurrenceFrequency)
                }
                disabled={disabled}
              >
                {(
                  Object.keys(FREQUENCY_LABELS) as RecurrenceFrequency[]
                ).map((key) => (
                  <option key={key} value={key}>
                    {FREQUENCY_LABELS[key]}
                  </option>
                ))}
              </SelectNative>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="recurrence-interval">Cada</Label>
              <Input
                id="recurrence-interval"
                type="number"
                min={1}
                max={365}
                value={interval}
                onChange={(e) =>
                  setInterval(parseInt(e.target.value, 10) || 1)
                }
                disabled={disabled}
              />
            </div>
          </div>

          {/* Days of week (weekly only) */}
          {frequency === 'semanal' && (
            <div className="space-y-1.5">
              <Label>Dias de la semana</Label>
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Seleccionar dias de la semana"
              >
                {Object.entries(DAYS_OF_WEEK_LABELS).map(([key, label]) => {
                  const day = parseInt(key, 10);
                  const selected = daysOfWeek.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      disabled={disabled}
                      className={cn(
                        'flex h-9 w-11 items-center justify-center rounded-md border text-sm font-medium transition-colors',
                        selected
                          ? 'border-primary bg-primary text-white'
                          : 'border-border bg-surface text-body-text hover:bg-neutral-100'
                      )}
                      aria-pressed={selected}
                      aria-label={label}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* End condition */}
          <div className="space-y-3">
            <Label>Finaliza</Label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
              <SelectNative
                value={endType}
                onChange={(e) =>
                  setEndType(e.target.value as 'never' | 'date' | 'count')
                }
                disabled={disabled}
                aria-label="Tipo de finalizacion"
              >
                <option value="never">Nunca</option>
                <option value="date">En fecha</option>
                <option value="count">Despues de</option>
              </SelectNative>

              {endType === 'date' && (
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={disabled}
                  aria-label="Fecha de finalizacion"
                />
              )}

              {endType === 'count' && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={occurrences || ''}
                    onChange={(e) =>
                      setOccurrences(parseInt(e.target.value, 10) || 0)
                    }
                    disabled={disabled}
                    className="w-20"
                    aria-label="Numero de repeticiones"
                  />
                  <span className="text-sm text-secondary-text">
                    {occurrences === 1 ? 'repeticion' : 'repeticiones'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          {getPreviewText() && (
            <p className="text-sm text-secondary-text italic" aria-live="polite">
              {getPreviewText()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
