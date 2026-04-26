'use client';

import { Loader2, Pencil, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { CandidatoListItem } from '@/types/electoral';

interface CandidatoTableProps {
  candidatos: CandidatoListItem[];
  loading: boolean;
  onEdit: (candidato: CandidatoListItem) => void;
  onToggleEstado: (candidato: CandidatoListItem) => void;
}

export function CandidatoTable({
  candidatos,
  loading,
  onEdit,
  onToggleEstado,
}: CandidatoTableProps) {
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2
          className="h-8 w-8 animate-spin text-primary"
          aria-label="Cargando candidatos"
        />
      </div>
    );
  }

  if (candidatos.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-surface">
        <p className="text-sm text-placeholder">
          No se encontraron candidatos para este periodo.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Orden</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Partido</TableHead>
            <TableHead className="w-[100px]">Estado</TableHead>
            <TableHead className="w-[120px] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {candidatos.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-mono text-sm">{c.orden}</TableCell>
              <TableCell className="font-medium">
                {c.nombre ?? 'Sin nombre'}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className="whitespace-nowrap"
                  style={
                    c.partido_color
                      ? {
                          borderColor: c.partido_color,
                          color: c.partido_color,
                        }
                      : undefined
                  }
                >
                  {c.partido_siglas ?? c.partido_nombre ?? '-'}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={c.estado ? 'default' : 'secondary'}
                  className={
                    c.estado
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-100'
                  }
                >
                  {c.estado ? 'Activo' : 'Inactivo'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEdit(c)}
                    aria-label={`Editar ${c.nombre}`}
                  >
                    <Pencil size={14} aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onToggleEstado(c)}
                    aria-label={
                      c.estado
                        ? `Desactivar ${c.nombre}`
                        : `Activar ${c.nombre}`
                    }
                  >
                    <Power size={14} aria-hidden="true" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
