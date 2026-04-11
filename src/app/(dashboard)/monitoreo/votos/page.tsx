'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { PeriodoSelector } from '@/components/electoral/periodo-selector';
import { VoteColegioSelector } from '@/components/electoral/vote-colegio-selector';
import { VoteRecordingForm } from '@/components/electoral/vote-recording-form';
import { createClient } from '@/lib/supabase/client';

interface SelectedColegio {
  colegioId: string;
  recintoId: string;
  recintoNombre: string;
  colegioNombre: string;
}

export default function VotosPage() {
  const [periodoId, setPeriodoId] = useState('');
  const [partidoId, setPartidoId] = useState('');
  const [selectedColegio, setSelectedColegio] =
    useState<SelectedColegio | null>(null);

  // Get partido_id from the active periodo electoral
  useEffect(() => {
    async function fetchPartidoId() {
      try {
        const supabase = createClient();
        const { data: activePeriodo } = await supabase
          .from('periodos_electorales')
          .select('partido_id')
          .eq('activo', true)
          .eq('estado', true)
          .limit(1)
          .maybeSingle();

        if (activePeriodo) {
          setPartidoId(activePeriodo.partido_id);
        }
      } catch (err) {
        console.error('Error fetching partido_id:', err);
      }
    }
    fetchPartidoId();
  }, []);

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
          Registro de Votos
        </h2>
        <p className="mt-space-1 text-sm text-secondary-text">
          Selecciona un colegio y registra los votos por candidato
        </p>
      </div>

      {/* Periodo Selector */}
      <div className="mb-space-4">
        <PeriodoSelector
          value={periodoId}
          onChange={(id) => {
            setPeriodoId(id);
            setSelectedColegio(null);
          }}
          autoSelectActive
          className="max-w-sm"
        />
      </div>

      {/* Step 1: Select Colegio or Step 2: Record Votes */}
      {periodoId && !selectedColegio && (
        <VoteColegioSelector
          periodoId={periodoId}
          partidoId={partidoId}
          onSelect={(choice) => setSelectedColegio(choice)}
        />
      )}

      {periodoId && selectedColegio && partidoId && (
        <VoteRecordingForm
          colegioId={selectedColegio.colegioId}
          recintoId={selectedColegio.recintoId}
          periodoId={periodoId}
          partidoId={partidoId}
          recintoNombre={selectedColegio.recintoNombre}
          colegioNombre={selectedColegio.colegioNombre}
          onBack={() => setSelectedColegio(null)}
        />
      )}
    </div>
  );
}
