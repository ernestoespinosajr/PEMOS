'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AsignacionListItem } from '@/types/electoral';

interface AsignacionTableProps {
  asignaciones: AsignacionListItem[];
  loading: boolean;
  onDelete: (asignacion: AsignacionListItem) => void;
}

export function AsignacionTable({
  asignaciones,
  loading,
  onDelete,
}: AsignacionTableProps) {
  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2
          className="h-8 w-8 animate-spin text-primary"
          aria-label="Cargando asignaciones"
        />
      </div>
    );
  }

  if (asignaciones.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-border bg-surface">
        <p className="text-sm text-placeholder">
          No hay asignaciones para este periodo.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Observador</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Recinto</TableHead>
            <TableHead>Colegio</TableHead>
            <TableHead className="w-[80px] text-right">Accion</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {asignaciones.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">
                {a.usuario_nombre ?? ''} {a.usuario_apellido ?? ''}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {a.usuario_email ?? '-'}
              </TableCell>
              <TableCell>
                {a.recinto_cod ? `${a.recinto_cod} - ` : ''}
                {a.recinto_nombre ?? '-'}
              </TableCell>
              <TableCell>
                {a.colegio_cod
                  ? `${a.colegio_cod}${a.colegio_nombre ? ` - ${a.colegio_nombre}` : ''}`
                  : 'Todos'}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => onDelete(a)}
                  aria-label={`Eliminar asignacion de ${a.usuario_nombre}`}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
