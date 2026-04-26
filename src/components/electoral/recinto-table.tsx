'use client';

import { useRouter } from 'next/navigation';
import { Loader2, MapPin, Users } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { RecintoListItem } from '@/types/electoral';

interface RecintoTableProps {
  recintos: RecintoListItem[];
  loading: boolean;
}

export function RecintoTable({ recintos, loading }: RecintoTableProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2
          className="h-8 w-8 animate-spin text-primary"
          aria-label="Cargando recintos"
        />
      </div>
    );
  }

  if (recintos.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-surface">
        <p className="text-sm text-placeholder">
          No se encontraron recintos.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Codigo</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Municipio</TableHead>
            <TableHead className="w-[100px] text-center">Colegios</TableHead>
            <TableHead className="w-[120px] text-center">Observadores</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recintos.map((r) => (
            <TableRow
              key={r.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => router.push(`/recintos/${r.id}`)}
            >
              <TableCell className="font-mono text-sm">
                {r.cod_recinto}
              </TableCell>
              <TableCell className="font-medium">{r.nombre}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {r.municipio_nombre ?? '-'}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="outline" className="gap-1">
                  <MapPin size={12} aria-hidden="true" />
                  {r.colegios_count ?? 0}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="outline" className="gap-1">
                  <Users size={12} aria-hidden="true" />
                  {r.observadores_count ?? 0}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
