'use client';

import { Loader2, Power } from 'lucide-react';
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
import type { Colegio } from '@/types/electoral';

interface ColegioListProps {
  colegios: Colegio[];
  loading: boolean;
  onToggleEstado: (colegio: Colegio) => void;
}

export function ColegioList({
  colegios,
  loading,
  onToggleEstado,
}: ColegioListProps) {
  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2
          className="h-6 w-6 animate-spin text-primary"
          aria-label="Cargando colegios"
        />
      </div>
    );
  }

  if (colegios.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border">
        <p className="text-sm text-placeholder">
          No hay colegios registrados. Usa el formulario para agregar uno.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Codigo</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead className="w-[100px]">Estado</TableHead>
            <TableHead className="w-[80px] text-right">Accion</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {colegios.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-mono text-sm">
                {c.cod_colegio}
              </TableCell>
              <TableCell>{c.nombre ?? '-'}</TableCell>
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onToggleEstado(c)}
                  aria-label={
                    c.estado
                      ? `Desactivar colegio ${c.cod_colegio}`
                      : `Activar colegio ${c.cod_colegio}`
                  }
                >
                  <Power size={14} aria-hidden="true" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
