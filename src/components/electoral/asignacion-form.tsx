'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import { createClient } from '@/lib/supabase/client';
import type { UsuarioOption, Colegio } from '@/types/electoral';

interface RecintoOption {
  id: string;
  nombre: string;
  cod_recinto: string;
}

interface AsignacionFormProps {
  periodoId: string;
  onCreated: () => void;
  onCancel: () => void;
}

/**
 * Form to assign an observer to a recinto/colegio.
 */
export function AsignacionForm({
  periodoId,
  onCreated,
  onCancel,
}: AsignacionFormProps) {
  const [usuarios, setUsuarios] = useState<UsuarioOption[]>([]);
  const [recintos, setRecintos] = useState<RecintoOption[]>([]);
  const [colegios, setColegios] = useState<Colegio[]>([]);

  const [selectedUsuarioId, setSelectedUsuarioId] = useState('');
  const [selectedRecintoId, setSelectedRecintoId] = useState('');
  const [selectedColegioId, setSelectedColegioId] = useState('');

  const [loadingUsuarios, setLoadingUsuarios] = useState(true);
  const [loadingRecintos, setLoadingRecintos] = useState(true);
  const [loadingColegios, setLoadingColegios] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch usuarios (observers and coordinators)
  useEffect(() => {
    async function fetchUsuarios() {
      setLoadingUsuarios(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('usuarios')
          .select('id, auth_user_id, nombre, apellido, email, role')
          .in('role', ['observer', 'coordinator'])
          .eq('estado', true)
          .order('nombre');

        setUsuarios(
          (data ?? []).map((u) => {
            const r = u as Record<string, unknown>;
            return {
              id: r.auth_user_id as string, // asignacion_recintos.usuario_id references auth.users
              auth_user_id: r.auth_user_id as string,
              nombre: r.nombre as string,
              apellido: r.apellido as string,
              email: r.email as string | null,
              role: r.role as string,
            };
          })
        );
      } catch (err) {
        console.error('Error fetching usuarios:', err);
      } finally {
        setLoadingUsuarios(false);
      }
    }
    fetchUsuarios();
  }, []);

  // Fetch recintos
  useEffect(() => {
    async function fetchRecintos() {
      setLoadingRecintos(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('recintos')
          .select('id, nombre, cod_recinto')
          .eq('estado', true)
          .order('nombre');

        setRecintos((data ?? []) as RecintoOption[]);
      } catch (err) {
        console.error('Error fetching recintos:', err);
      } finally {
        setLoadingRecintos(false);
      }
    }
    fetchRecintos();
  }, []);

  // Fetch colegios when recinto changes
  useEffect(() => {
    if (!selectedRecintoId) {
      setColegios([]);
      setSelectedColegioId('');
      return;
    }

    async function fetchColegios() {
      setLoadingColegios(true);
      try {
        const res = await fetch(
          `/api/electoral/recintos/${selectedRecintoId}/colegios`
        );
        const json = await res.json();
        if (res.ok) {
          setColegios(json.data ?? []);
        }
      } catch (err) {
        console.error('Error fetching colegios:', err);
      } finally {
        setLoadingColegios(false);
      }
    }
    fetchColegios();
  }, [selectedRecintoId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedUsuarioId) {
      setError('Selecciona un observador');
      return;
    }
    if (!selectedRecintoId) {
      setError('Selecciona un recinto');
      return;
    }
    if (!periodoId) {
      setError('No hay periodo electoral seleccionado');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/electoral/asignaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: selectedUsuarioId,
          recinto_id: selectedRecintoId,
          colegio_id: selectedColegioId || null,
          periodo_id: periodoId,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Error al crear asignacion');
        return;
      }

      // Reset and notify
      setSelectedUsuarioId('');
      setSelectedRecintoId('');
      setSelectedColegioId('');
      onCreated();
    } catch {
      setError('Error de conexion');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          className="rounded-md border border-destructive/20 bg-destructive/5 p-3"
          role="alert"
        >
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Usuario (Observer) */}
      <div>
        <Label>Observador *</Label>
        {loadingUsuarios ? (
          <div className="mt-1.5 flex h-9 items-center gap-2 rounded-md border border-input px-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Cargando...</span>
          </div>
        ) : (
          <SelectNative
            value={selectedUsuarioId}
            onChange={(e) => setSelectedUsuarioId(e.target.value)}
            placeholder="Seleccionar observador"
            className="mt-1.5"
          >
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre} {u.apellido}
                {u.email ? ` (${u.email})` : ''}
              </option>
            ))}
          </SelectNative>
        )}
      </div>

      {/* Recinto */}
      <div>
        <Label>Recinto *</Label>
        {loadingRecintos ? (
          <div className="mt-1.5 flex h-9 items-center gap-2 rounded-md border border-input px-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Cargando...</span>
          </div>
        ) : (
          <SelectNative
            value={selectedRecintoId}
            onChange={(e) => setSelectedRecintoId(e.target.value)}
            placeholder="Seleccionar recinto"
            className="mt-1.5"
          >
            {recintos.map((r) => (
              <option key={r.id} value={r.id}>
                {r.cod_recinto} - {r.nombre}
              </option>
            ))}
          </SelectNative>
        )}
      </div>

      {/* Colegio (optional) */}
      <div>
        <Label>Colegio (opcional)</Label>
        {loadingColegios ? (
          <div className="mt-1.5 flex h-9 items-center gap-2 rounded-md border border-input px-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Cargando...</span>
          </div>
        ) : (
          <SelectNative
            value={selectedColegioId}
            onChange={(e) => setSelectedColegioId(e.target.value)}
            placeholder="Todos los colegios"
            className="mt-1.5"
            disabled={!selectedRecintoId || colegios.length === 0}
          >
            <option value="">Todos los colegios</option>
            {colegios.map((c) => (
              <option key={c.id} value={c.id}>
                {c.cod_colegio}
                {c.nombre ? ` - ${c.nombre}` : ''}
              </option>
            ))}
          </SelectNative>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          Asignar Observador
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
