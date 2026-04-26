'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Save, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { VoteRecordItem } from '@/types/electoral';

interface VoteRecordingFormProps {
  colegioId: string;
  recintoId: string;
  periodoId: string;
  partidoId: string;
  recintoNombre: string;
  colegioNombre: string;
  onBack: () => void;
}

interface VoteRow extends VoteRecordItem {
  localVotos: number;
  dirty: boolean;
}

/**
 * Core vote recording form.
 * Lists all candidates ordered by 'orden', with number inputs for vote counts.
 * Mobile-optimized with large touch targets.
 */
export function VoteRecordingForm({
  colegioId,
  recintoId,
  periodoId,
  partidoId,
  recintoNombre,
  colegioNombre,
  onBack,
}: VoteRecordingFormProps) {
  const [rows, setRows] = useState<VoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize vote records and fetch them
  const loadVotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // First, init vote records (idempotent)
      await fetch('/api/electoral/votos/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          colegio_id: colegioId,
          recinto_id: recintoId,
          periodo_id: periodoId,
          partido_id: partidoId,
        }),
      });

      // Then fetch all vote records for this colegio
      const params = new URLSearchParams();
      params.set('colegio_id', colegioId);
      params.set('periodo_id', periodoId);

      const res = await fetch(`/api/electoral/votos?${params.toString()}`);
      const json = await res.json();

      if (res.ok) {
        const voteRows: VoteRow[] = (json.data ?? []).map(
          (v: VoteRecordItem) => ({
            ...v,
            localVotos: v.votos,
            dirty: false,
          })
        );
        setRows(voteRows);
      } else {
        setError(json.error ?? 'Error al cargar votos');
      }
    } catch (err) {
      console.error('Error loading votes:', err);
      setError('Error de conexion al cargar votos');
    } finally {
      setLoading(false);
    }
  }, [colegioId, recintoId, periodoId, partidoId]);

  useEffect(() => {
    loadVotes();
  }, [loadVotes]);

  function handleVoteChange(rowId: string, value: string) {
    const numValue = parseInt(value, 10);
    const newVotos = isNaN(numValue) || numValue < 0 ? 0 : numValue;

    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              localVotos: newVotos,
              dirty: newVotos !== r.votos,
            }
          : r
      )
    );
    setSaveSuccess(false);
  }

  async function handleSave() {
    const dirtyRows = rows.filter((r) => r.dirty);
    if (dirtyRows.length === 0) return;

    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      // Save each dirty row
      const results = await Promise.all(
        dirtyRows.map(async (row) => {
          const res = await fetch(`/api/electoral/votos/${row.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ votos: row.localVotos }),
          });
          return { id: row.id, ok: res.ok };
        })
      );

      const allOk = results.every((r) => r.ok);

      if (allOk) {
        // Update the base votos to match local
        setRows((prev) =>
          prev.map((r) =>
            r.dirty ? { ...r, votos: r.localVotos, dirty: false } : r
          )
        );
        setSaveSuccess(true);
      } else {
        setError('Algunos votos no se pudieron guardar. Intenta de nuevo.');
      }
    } catch (err) {
      console.error('Error saving votes:', err);
      setError('Error de conexion al guardar votos');
    } finally {
      setSaving(false);
    }
  }

  const hasDirtyRows = rows.some((r) => r.dirty);
  const totalVotos = rows.reduce((sum, r) => sum + r.localVotos, 0);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2
          className="h-8 w-8 animate-spin text-primary"
          aria-label="Cargando registros de votos"
        />
      </div>
    );
  }

  return (
    <div>
      {/* Header with colegio info */}
      <div className="mb-space-4 rounded-lg border bg-primary-tint/30 p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          Recinto
        </p>
        <p className="text-sm font-medium text-primary-text">
          {recintoNombre}
        </p>
        <p className="mt-1 text-xs font-medium uppercase text-muted-foreground">
          Colegio
        </p>
        <p className="text-sm font-medium text-primary-text">
          {colegioNombre}
        </p>
      </div>

      {error && (
        <div
          className="mb-space-4 rounded-md border border-destructive/20 bg-destructive/5 p-3"
          role="alert"
        >
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {saveSuccess && (
        <div className="mb-space-4 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3">
          <CheckCircle
            size={16}
            className="text-emerald-600"
            aria-hidden="true"
          />
          <p className="text-sm text-emerald-800">
            Votos guardados exitosamente.
          </p>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-border bg-surface">
          <p className="text-sm text-placeholder">
            No hay candidatos registrados para este periodo.
          </p>
        </div>
      ) : (
        <>
          {/* Vote list -- mobile optimized */}
          <div className="space-y-2">
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex items-center gap-3 rounded-lg border bg-card p-3 sm:p-4"
              >
                {/* Candidate info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary-text truncate">
                    {row.candidato_nombre ?? 'Sin nombre'}
                  </p>
                  <Badge
                    variant="outline"
                    className="mt-1 text-xs"
                    style={
                      row.partido_color
                        ? {
                            borderColor: row.partido_color,
                            color: row.partido_color,
                          }
                        : undefined
                    }
                  >
                    {row.partido_siglas ?? row.partido_nombre ?? '-'}
                  </Badge>
                </div>

                {/* Vote input -- large touch target */}
                <div className="flex-shrink-0">
                  <label className="sr-only" htmlFor={`votos-${row.id}`}>
                    Votos para {row.candidato_nombre}
                  </label>
                  <Input
                    id={`votos-${row.id}`}
                    type="number"
                    min={0}
                    value={row.localVotos}
                    onChange={(e) => handleVoteChange(row.id, e.target.value)}
                    className="h-12 w-24 text-center text-lg font-bold sm:w-28"
                    inputMode="numeric"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Total and save bar */}
          <div className="sticky bottom-0 mt-space-4 flex items-center justify-between rounded-lg border bg-surface p-4 shadow-md">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Total Votos
              </p>
              <p className="text-2xl font-bold text-primary-text">
                {totalVotos.toLocaleString('es-DO')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onBack}>
                Volver
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasDirtyRows || saving}
              >
                {saving ? (
                  <Loader2
                    className="mr-2 h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Save
                    className="mr-2 h-4 w-4"
                    aria-hidden="true"
                  />
                )}
                Guardar Votos
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
