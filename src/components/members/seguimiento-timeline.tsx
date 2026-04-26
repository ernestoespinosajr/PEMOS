'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Phone,
  MapPin,
  MessageSquare,
  Users,
  HelpCircle,
  Plus,
  Loader2,
  Calendar,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import { cn } from '@/lib/utils';
import type { SeguimientoEntry, SeguimientoTipo } from '@/types/member';

// ---------- Constants ----------

const TIPO_OPTIONS: { value: SeguimientoTipo; label: string }[] = [
  { value: 'llamada', label: 'Llamada' },
  { value: 'visita', label: 'Visita' },
  { value: 'mensaje', label: 'WhatsApp / Mensaje' },
  { value: 'reunion', label: 'Reunion' },
  { value: 'otro', label: 'Otro' },
];

const TIPO_ICONS: Record<SeguimientoTipo, React.ElementType> = {
  llamada: Phone,
  visita: MapPin,
  mensaje: MessageSquare,
  reunion: Users,
  otro: HelpCircle,
};

const TIPO_COLORS: Record<SeguimientoTipo, string> = {
  llamada: 'bg-blue-100 text-blue-700 border-blue-200',
  visita: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  mensaje: 'bg-violet-100 text-violet-700 border-violet-200',
  reunion: 'bg-amber-100 text-amber-700 border-amber-200',
  otro: 'bg-neutral-100 text-neutral-600 border-neutral-200',
};

// ---------- Props ----------

interface SeguimientoTimelineProps {
  memberId: string;
}

// ---------- Component ----------

/**
 * Follow-up timeline component for a member.
 *
 * Displays a chronological list of seguimiento entries and provides
 * an inline form to add new entries. Fetches data from and posts to
 * /api/members/[id]/seguimiento.
 *
 * Timeline layout: vertical line with icon dots, reverse chronological.
 */
export function SeguimientoTimeline({ memberId }: SeguimientoTimelineProps) {
  const [entries, setEntries] = useState<SeguimientoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [tipo, setTipo] = useState<SeguimientoTipo>('llamada');
  const [notas, setNotas] = useState('');
  const [resultado, setResultado] = useState('');

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/members/${memberId}/seguimiento`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Error al cargar seguimiento');
        return;
      }

      setEntries(json.data ?? []);
    } catch {
      setError('Error de conexion al cargar seguimiento.');
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!notas.trim()) {
      setFormError('Las notas son requeridas.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/members/${memberId}/seguimiento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          notas: notas.trim(),
          resultado: resultado.trim() || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setFormError(json.error ?? 'Error al agregar seguimiento');
        return;
      }

      // Reset form and refresh list
      setTipo('llamada');
      setNotas('');
      setResultado('');
      setShowForm(false);
      fetchEntries();
    } catch {
      setFormError('Error de conexion. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-DO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  function formatTime(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('es-DO', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  }

  // ---------- Loading State ----------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2
          className="h-5 w-5 animate-spin text-muted-foreground"
          aria-hidden="true"
        />
        <span className="ml-2 text-sm text-muted-foreground">
          Cargando seguimiento...
        </span>
      </div>
    );
  }

  // ---------- Error State ----------

  if (error) {
    return (
      <div
        className="rounded-md border border-destructive/20 bg-destructive/5 p-4"
        role="alert"
      >
        <p className="text-sm text-destructive">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchEntries}
          className="mt-2"
        >
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add button */}
      <div className="flex justify-end">
        <Button
          variant={showForm ? 'outline' : 'default'}
          size="sm"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? (
            'Cancelar'
          ) : (
            <>
              <Plus size={16} className="mr-1.5" aria-hidden="true" />
              Agregar Seguimiento
            </>
          )}
        </Button>
      </div>

      {/* Inline form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-border bg-neutral-50/50 p-4 space-y-4"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Tipo */}
            <div className="space-y-1.5">
              <Label htmlFor="seg-tipo">
                Metodo de contacto <span className="text-destructive">*</span>
              </Label>
              <SelectNative
                id="seg-tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as SeguimientoTipo)}
              >
                {TIPO_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </SelectNative>
            </div>

            {/* Resultado */}
            <div className="space-y-1.5">
              <Label htmlFor="seg-resultado">Resultado</Label>
              <Input
                id="seg-resultado"
                placeholder="Ej: Contactado, No contesto, Interesado..."
                value={resultado}
                onChange={(e) => setResultado(e.target.value)}
              />
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label htmlFor="seg-notas">
              Notas <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="seg-notas"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Describe la interaccion..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              aria-invalid={!!formError && !notas.trim()}
              aria-describedby={formError ? 'seg-form-error' : undefined}
            />
          </div>

          {formError && (
            <p
              id="seg-form-error"
              className="text-xs text-destructive"
              role="alert"
            >
              {formError}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting && (
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              )}
              Guardar Entrada
            </Button>
          </div>
        </form>
      )}

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10">
          <Calendar
            size={36}
            strokeWidth={1}
            className="mb-2 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="text-sm text-secondary-text">
            No hay entradas de seguimiento
          </p>
          <p className="mt-1 text-xs text-placeholder">
            Agrega la primera entrada para este miembro.
          </p>
        </div>
      )}

      {/* Timeline */}
      {entries.length > 0 && (
        <ol
          className="relative border-l-2 border-border ml-3 space-y-6 pl-6"
          aria-label="Historial de seguimiento"
        >
          {entries.map((entry) => {
            const Icon = TIPO_ICONS[entry.tipo] ?? HelpCircle;
            const tipoLabel =
              TIPO_OPTIONS.find((o) => o.value === entry.tipo)?.label ??
              entry.tipo;

            return (
              <li key={entry.id} className="relative">
                {/* Timeline dot */}
                <div
                  className={cn(
                    'absolute -left-[calc(1.5rem+1px)] flex h-8 w-8 items-center justify-center rounded-full border-2',
                    TIPO_COLORS[entry.tipo] ?? TIPO_COLORS.otro
                  )}
                  aria-hidden="true"
                >
                  <Icon size={14} strokeWidth={1.5} />
                </div>

                {/* Entry content */}
                <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span className="text-sm font-medium text-primary-text">
                        {tipoLabel}
                      </span>
                      {entry.resultado && (
                        <span className="ml-2 text-sm text-muted-foreground">
                          &mdash; {entry.resultado}
                        </span>
                      )}
                    </div>
                    <time
                      className="flex-shrink-0 text-xs text-muted-foreground"
                      dateTime={entry.fecha ?? entry.created_at}
                    >
                      {formatDate(entry.fecha ?? entry.created_at)}
                      {' '}
                      {formatTime(entry.created_at)}
                    </time>
                  </div>

                  <p className="mt-2 text-sm text-secondary-text whitespace-pre-line">
                    {entry.notas}
                  </p>

                  {entry.usuario_nombre && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-placeholder">
                      <User size={12} strokeWidth={1.5} aria-hidden="true" />
                      {entry.usuario_nombre}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
