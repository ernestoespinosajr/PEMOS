'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, FileText, Loader2 } from 'lucide-react';
import type { PlantillaLlamada, FollowupQueueItem } from '@/types/seguimiento';

interface CallScriptDisplayProps {
  /** The individual being called -- data used for template substitution */
  item: FollowupQueueItem;
}

/**
 * Displays a personalized call script for field workers.
 * Fetches the active call script template and substitutes placeholders
 * with the individual's data.
 * Collapsible on mobile to save screen space.
 */
export function CallScriptDisplay({ item }: CallScriptDisplayProps) {
  const [plantilla, setPlantilla] = useState<PlantillaLlamada | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    async function fetchPlantilla() {
      setLoading(true);
      try {
        const res = await fetch('/api/seguimiento/plantillas?activa=true');
        const json = await res.json();
        if (res.ok && json.data && json.data.length > 0) {
          setPlantilla(json.data[0] as PlantillaLlamada);
        }
      } catch (err) {
        console.error('Error fetching plantilla:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPlantilla();
  }, []);

  /**
   * Substitute template placeholders with actual data.
   */
  function renderScript(template: string): string {
    return template
      .replace(/\{nombre\}/g, item.nombres ?? '')
      .replace(/\{apellido\}/g, item.apellidos ?? '')
      .replace(/\{telefono\}/g, item.telefonos ?? '')
      .replace(/\{recinto\}/g, item.nombre_recinto ?? item.cod_recinto ?? '')
      .replace(/\{colegio\}/g, item.colegio ?? '')
      .replace(/\{direccion\}/g, item.direccion_recinto ?? '')
      .replace(/\{cedula\}/g, item.cedula ?? '')
      .replace(/\{multiplicador\}/g, ''); // Placeholder for future multiplicador resolution
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-blue-50/50 p-3">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <span className="text-sm text-blue-700">Cargando guion de llamada...</span>
      </div>
    );
  }

  if (!plantilla) {
    return null;
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/50">
      {/* Header (clickable to toggle) */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-3 text-left"
      >
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-blue-600" aria-hidden="true" />
          <span className="text-sm font-medium text-blue-800">
            Guion de Llamada
          </span>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-blue-600" aria-hidden="true" />
        ) : (
          <ChevronDown size={16} className="text-blue-600" aria-hidden="true" />
        )}
      </button>

      {/* Script content */}
      {expanded && (
        <div className="border-t border-blue-200 px-4 py-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-blue-900">
            {renderScript(plantilla.contenido)}
          </p>
        </div>
      )}
    </div>
  );
}
