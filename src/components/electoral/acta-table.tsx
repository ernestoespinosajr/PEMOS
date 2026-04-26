'use client';

import { useState } from 'react';
import { Loader2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { ActaListItem } from '@/types/electoral';

interface ActaTableProps {
  actas: ActaListItem[];
  loading: boolean;
}

export function ActaTable({ actas, loading }: ActaTableProps) {
  const [selectedActa, setSelectedActa] = useState<ActaListItem | null>(null);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2
          className="h-8 w-8 animate-spin text-primary"
          aria-label="Cargando actas"
        />
      </div>
    );
  }

  if (actas.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-border bg-surface">
        <p className="text-sm text-placeholder">
          No hay actas registradas para este periodo.
        </p>
      </div>
    );
  }

  function formatDate(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleString('es-DO', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <>
      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Numero</TableHead>
              <TableHead>Recinto</TableHead>
              <TableHead>Colegio</TableHead>
              <TableHead>Registrado Por</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="w-[80px] text-right">Ver</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {actas.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-mono text-sm">
                  {a.numero_acta ?? '-'}
                </TableCell>
                <TableCell>
                  {a.recinto_cod ? `${a.recinto_cod} - ` : ''}
                  {a.recinto_nombre ?? '-'}
                </TableCell>
                <TableCell>
                  {a.colegio_cod ?? '-'}
                  {a.colegio_nombre ? ` - ${a.colegio_nombre}` : ''}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {a.registrado_por_nombre ?? '-'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(a.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSelectedActa(a)}
                    aria-label={`Ver acta ${a.numero_acta ?? a.id}`}
                  >
                    <Eye size={14} aria-hidden="true" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedActa}
        onOpenChange={(open) => {
          if (!open) setSelectedActa(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Acta {selectedActa?.numero_acta ?? ''}
            </DialogTitle>
            <DialogDescription>
              {selectedActa?.recinto_nombre ?? ''} -{' '}
              Colegio {selectedActa?.colegio_cod ?? ''}
            </DialogDescription>
          </DialogHeader>

          {selectedActa && (
            <div className="space-y-4">
              {/* Vote data */}
              <div>
                <p className="mb-2 text-sm font-medium text-primary-text">
                  Votos Registrados
                </p>
                <div className="max-h-60 overflow-y-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Candidato ID</TableHead>
                        <TableHead className="text-right">Votos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(selectedActa.votos_data ?? {}).map(
                        ([candidatoId, votos]) => (
                          <TableRow key={candidatoId}>
                            <TableCell className="text-xs font-mono">
                              {candidatoId.slice(0, 8)}...
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold">
                              {(votos as number).toLocaleString('es-DO')}
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Observaciones */}
              {selectedActa.observaciones && (
                <div>
                  <p className="mb-1 text-sm font-medium text-primary-text">
                    Observaciones
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedActa.observaciones}
                  </p>
                </div>
              )}

              {/* Metadata */}
              <div className="text-xs text-muted-foreground">
                <p>
                  Registrado por:{' '}
                  {selectedActa.registrado_por_nombre ?? selectedActa.registrado_por}
                </p>
                <p>Fecha: {formatDate(selectedActa.created_at)}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
