'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ConversionReport } from '@/components/seguimiento/conversion-report';

export default function ReportesPage() {
  return (
    <div>
      {/* Page Header */}
      <div className="mb-space-6">
        <Link
          href="/seguimiento"
          className="mb-space-2 inline-flex items-center gap-1 text-sm text-secondary-text transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          Volver a Seguimiento
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-primary-text">
          Reporte de Conversiones
        </h2>
        <p className="mt-space-1 text-sm text-secondary-text">
          Tasas de conversion por area geografica y periodo de tiempo
        </p>
      </div>

      {/* Report Component */}
      <ConversionReport />
    </div>
  );
}
