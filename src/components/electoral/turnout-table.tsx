'use client';

import { Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { TurnoutMember } from '@/types/electoral';

interface TurnoutTableProps {
  members: TurnoutMember[];
  loading: boolean;
  onToggleVotacion: (member: TurnoutMember) => void;
}

export function TurnoutTable({
  members,
  loading,
  onToggleVotacion,
}: TurnoutTableProps) {
  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2
          className="h-8 w-8 animate-spin text-primary"
          aria-label="Cargando miembros"
        />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-border bg-surface">
        <p className="text-sm text-placeholder">
          No hay miembros asignados a este recinto.
        </p>
      </div>
    );
  }

  function formatCedula(cedula: string): string {
    const digits = cedula.replace(/\D/g, '');
    if (digits.length !== 11) return cedula;
    return `${digits.slice(0, 3)}-${digits.slice(3, 10)}-${digits.slice(10)}`;
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cedula</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Contacto</TableHead>
            <TableHead className="w-[120px] text-center">Voto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((m) => (
            <TableRow key={m.id}>
              <TableCell className="font-mono text-sm">
                {formatCedula(m.cedula)}
              </TableCell>
              <TableCell className="font-medium">
                {m.nombre} {m.apellido}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {m.celular ?? m.telefono ?? '-'}
              </TableCell>
              <TableCell className="text-center">
                <button
                  type="button"
                  onClick={() => onToggleVotacion(m)}
                  className="inline-flex items-center"
                  aria-label={
                    m.votacion
                      ? `Marcar ${m.nombre} como no voto`
                      : `Marcar ${m.nombre} como voto`
                  }
                >
                  <Badge
                    variant={m.votacion ? 'default' : 'secondary'}
                    className={
                      m.votacion
                        ? 'cursor-pointer bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'cursor-pointer bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }
                  >
                    {m.votacion ? 'Voto' : 'No Voto'}
                  </Badge>
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
