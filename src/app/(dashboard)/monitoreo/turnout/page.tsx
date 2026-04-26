'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { SelectNative } from '@/components/ui/select-native';
import { Label } from '@/components/ui/label';
import { TurnoutStatsDisplay } from '@/components/electoral/turnout-stats';
import { TurnoutTable } from '@/components/electoral/turnout-table';
import { createClient } from '@/lib/supabase/client';
import type { TurnoutMember, TurnoutStats } from '@/types/electoral';

interface RecintoOption {
  id: string;
  nombre: string;
  cod_recinto: string;
}

export default function TurnoutPage() {
  const [recintos, setRecintos] = useState<RecintoOption[]>([]);
  const [selectedRecintoId, setSelectedRecintoId] = useState('');
  const [members, setMembers] = useState<TurnoutMember[]>([]);
  const [stats, setStats] = useState<TurnoutStats>({
    total: 0,
    votaron: 0,
    no_votaron: 0,
    porcentaje: 0,
  });
  const [loadingRecintos, setLoadingRecintos] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);

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

  // Fetch turnout data
  const fetchTurnout = useCallback(async () => {
    if (!selectedRecintoId) return;

    setLoadingMembers(true);
    try {
      const params = new URLSearchParams();
      params.set('recinto_id', selectedRecintoId);

      const res = await fetch(`/api/electoral/turnout?${params.toString()}`);
      const json = await res.json();

      if (res.ok) {
        setMembers(json.data ?? []);
        setStats(
          json.stats ?? { total: 0, votaron: 0, no_votaron: 0, porcentaje: 0 }
        );
      } else {
        console.error('Error fetching turnout:', json.error);
        setMembers([]);
      }
    } catch (err) {
      console.error('Error fetching turnout:', err);
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }, [selectedRecintoId]);

  useEffect(() => {
    fetchTurnout();
  }, [fetchTurnout]);

  async function handleToggleVotacion(member: TurnoutMember) {
    try {
      const res = await fetch('/api/electoral/turnout', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: member.id,
          votacion: !member.votacion,
        }),
      });

      if (res.ok) {
        // Optimistic update
        setMembers((prev) =>
          prev.map((m) =>
            m.id === member.id ? { ...m, votacion: !m.votacion } : m
          )
        );

        // Recalculate stats
        const newVotaron = members.filter((m) =>
          m.id === member.id ? !m.votacion : m.votacion
        ).length;
        const total = members.length;
        setStats({
          total,
          votaron: newVotaron,
          no_votaron: total - newVotaron,
          porcentaje: total > 0 ? Math.round((newVotaron / total) * 100) : 0,
        });
      }
    } catch (err) {
      console.error('Error toggling votacion:', err);
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-space-6">
        <Link
          href="/monitoreo"
          className="mb-space-2 inline-flex items-center gap-1 text-sm text-secondary-text transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          Volver a Monitoreo
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-primary-text">
          Participacion Electoral
        </h2>
        <p className="mt-space-1 text-sm text-secondary-text">
          Seguimiento de miembros que han ejercido su voto
        </p>
      </div>

      {/* Recinto Selector */}
      <div className="mb-space-4 max-w-sm">
        <Label className="mb-1.5 block text-sm font-medium">Recinto</Label>
        {loadingRecintos ? (
          <div className="flex h-9 items-center gap-2 rounded-md border border-input px-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Cargando recintos...
            </span>
          </div>
        ) : (
          <SelectNative
            value={selectedRecintoId}
            onChange={(e) => setSelectedRecintoId(e.target.value)}
            placeholder="Seleccionar recinto"
          >
            {recintos.map((r) => (
              <option key={r.id} value={r.id}>
                {r.cod_recinto} - {r.nombre}
              </option>
            ))}
          </SelectNative>
        )}
      </div>

      {/* Stats */}
      {selectedRecintoId && (
        <div className="mb-space-4">
          <TurnoutStatsDisplay stats={stats} loading={loadingMembers} />
        </div>
      )}

      {/* Member Table */}
      {selectedRecintoId && (
        <TurnoutTable
          members={members}
          loading={loadingMembers}
          onToggleVotacion={handleToggleVotacion}
        />
      )}
    </div>
  );
}
