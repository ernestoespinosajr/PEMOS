'use client';

import { useState, useEffect } from 'react';
import { Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { VoteRecordItem } from '@/types/electoral';

interface ActaFormProps {
  colegioId: string;
  recintoId: string;
  periodoId: string;
  recintoNombre: string;
  colegioNombre: string;
  onCreated: () => void;
  onCancel: () => void;
}

/**
 * Form to create an acta.
 * Displays a read-only snapshot of current votes + fields for numero_acta and observaciones.
 */
export function ActaForm({
  colegioId,
  recintoId,
  periodoId,
  recintoNombre,
  colegioNombre,
  onCreated,
  onCancel,
}: ActaFormProps) {
  const [votes, setVotes] = useState<VoteRecordItem[]>([]);
  const [loadingVotes, setLoadingVotes] = useState(true);
  const [numeroActa, setNumeroActa] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current vote records for snapshot display
  useEffect(() => {
    async function fetchVotes() {
      setLoadingVotes(true);
      try {
        const params = new URLSearchParams();
        params.set('colegio_id', colegioId);
        params.set('periodo_id', periodoId);

        const res = await fetch(`/api/electoral/votos?${params.toString()}`);
        const json = await res.json();

        if (res.ok) {
          setVotes(json.data ?? []);
        }
      } catch (err) {
        console.error('Error fetching votes for acta:', err);
      } finally {
        setLoadingVotes(false);
      }
    }
    fetchVotes();
  }, [colegioId, periodoId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/electoral/actas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero_acta: numeroActa.trim() || null,
          recinto_id: recintoId,
          colegio_id: colegioId,
          observaciones: observaciones.trim() || null,
          periodo_id: periodoId,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Error al crear acta');
        return;
      }

      onCreated();
    } catch {
      setError('Error de conexion');
    } finally {
      setSubmitting(false);
    }
  }

  const totalVotos = votes.reduce((sum, v) => sum + (v.votos ?? 0), 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div
          className="rounded-md border border-destructive/20 bg-destructive/5 p-3"
          role="alert"
        >
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Colegio info */}
      <div className="rounded-lg border bg-primary-tint/30 p-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Recinto
            </p>
            <p className="text-sm font-medium text-primary-text">
              {recintoNombre}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Colegio
            </p>
            <p className="text-sm font-medium text-primary-text">
              {colegioNombre}
            </p>
          </div>
        </div>
      </div>

      {/* Vote snapshot (read-only) */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <FileText size={16} className="text-primary" aria-hidden="true" />
          <p className="text-sm font-medium text-primary-text">
            Votos a registrar en el acta
          </p>
        </div>

        {loadingVotes ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : votes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay votos registrados para este colegio.
          </p>
        ) : (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidato</TableHead>
                  <TableHead>Partido</TableHead>
                  <TableHead className="text-right">Votos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {votes.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">
                      {v.candidato_nombre ?? 'Sin nombre'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={
                          v.partido_color
                            ? {
                                borderColor: v.partido_color,
                                color: v.partido_color,
                              }
                            : undefined
                        }
                      >
                        {v.partido_siglas ?? '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {v.votos.toLocaleString('es-DO')}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={2} className="font-bold">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-primary">
                    {totalVotos.toLocaleString('es-DO')}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Numero Acta */}
      <div>
        <Label htmlFor="numero_acta">Numero de Acta</Label>
        <Input
          id="numero_acta"
          value={numeroActa}
          onChange={(e) => setNumeroActa(e.target.value)}
          placeholder="Ej: ACT-001 (opcional)"
          className="mt-1.5 max-w-[200px]"
        />
      </div>

      {/* Observaciones */}
      <div>
        <Label htmlFor="observaciones">Observaciones</Label>
        <textarea
          id="observaciones"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          placeholder="Observaciones o notas sobre el acta (opcional)"
          className="mt-1.5 flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          rows={4}
        />
      </div>

      {/* Warning */}
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
        <p className="text-sm text-amber-800">
          Una vez creada, el acta no puede ser modificada. Verifica los datos
          antes de confirmar.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={submitting || votes.length === 0}>
          {submitting && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          Crear Acta
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
