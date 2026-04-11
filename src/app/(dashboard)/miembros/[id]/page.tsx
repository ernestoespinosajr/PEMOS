'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Pencil,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  Globe,
  ChevronRight,
  Users,
  Loader2,
  UserCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SeguimientoTimeline } from '@/components/members/seguimiento-timeline';
import { cn } from '@/lib/utils';
import type { MemberDetail, MemberListItem, RedesSociales } from '@/types/member';
import {
  formatCedula,
  formatPhone,
  TIPO_MIEMBRO_LABELS,
  TIPO_MIEMBRO_BADGE_STYLES,
} from '@/types/member';

// ---------- Sub-components ----------

/** A labeled row of information within a detail card. */
function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon?: React.ElementType;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  if (!value) return null;

  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && (
        <Icon
          size={16}
          strokeWidth={1.5}
          className="mt-0.5 flex-shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      )}
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </dt>
        <dd className={cn('mt-0.5 text-sm text-primary-text', mono && 'font-mono')}>
          {value}
        </dd>
      </div>
    </div>
  );
}

/** Related member row for the child-members table. */
function RelatedMemberRow({ member }: { member: MemberListItem }) {
  return (
    <Link
      href={`/miembros/${member.id}`}
      className="flex items-center justify-between rounded-md px-3 py-2.5 transition-colors hover:bg-primary-tint/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-primary-text">
          {member.nombre} {member.apellido}
        </p>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
          {formatCedula(member.cedula)}
        </p>
      </div>
      <div className="ml-3 flex flex-shrink-0 items-center gap-2">
        <Badge
          variant="secondary"
          className={cn(
            'border-transparent text-xs',
            TIPO_MIEMBRO_BADGE_STYLES[member.tipo_miembro]
          )}
        >
          {TIPO_MIEMBRO_LABELS[member.tipo_miembro]}
        </Badge>
        <Badge
          variant="secondary"
          className={cn(
            'border-transparent text-xs',
            member.estado
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-red-100 text-red-700'
          )}
        >
          {member.estado ? 'Activo' : 'Inactivo'}
        </Badge>
      </div>
    </Link>
  );
}

// ---------- Main Page ----------

/**
 * Member Detail page.
 *
 * Route: /miembros/[id]
 *
 * Displays full member profile across multiple cards:
 * 1. Header with name, tipo badge, status, and edit button
 * 2. Personal data (cedula, nombre, apodo, fecha nacimiento, sexo)
 * 3. Contact info (phones, email, address, social media)
 * 4. Geographic assignment (provincia > municipio > circunscripcion > sector)
 * 5. Organizational assignment (tipo, coordinator, recinto)
 * 6. Related members (if coordinator/multiplicador)
 * 7. Seguimiento / Follow-up timeline
 */
export default function MiembroDetailPage() {
  const router = useRouter();
  const params = useParams();
  const memberId = params.id as string;

  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Related members (children under this coordinator/multiplicador)
  const [relatedMembers, setRelatedMembers] = useState<MemberListItem[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  const fetchMember = useCallback(async () => {
    setLoading(true);
    setFetchError(null);

    try {
      const res = await fetch(`/api/members/${memberId}`);
      const json = await res.json();

      if (!res.ok) {
        setFetchError(json.error ?? 'Error al cargar miembro');
        return;
      }

      setMember(json.data);
    } catch {
      setFetchError('Error de conexion. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  // Fetch related members (subordinates of this member)
  const fetchRelated = useCallback(async () => {
    setLoadingRelated(true);

    try {
      const res = await fetch(
        `/api/members?coordinador_id=${memberId}&page_size=100`
      );
      const json = await res.json();

      if (res.ok) {
        setRelatedMembers(json.data ?? []);
      }
    } catch {
      // Silently fail for related members
    } finally {
      setLoadingRelated(false);
    }
  }, [memberId]);

  useEffect(() => {
    if (memberId) {
      fetchMember();
      fetchRelated();
    }
  }, [memberId, fetchMember, fetchRelated]);

  // Build geographic breadcrumb segments
  function buildGeoBreadcrumb(): string[] {
    if (!member) return [];
    const segments: string[] = [];
    if (member.provincia_nombre) segments.push(member.provincia_nombre);
    if (member.municipio_nombre) segments.push(member.municipio_nombre);
    if (member.circunscripcion_nombre) segments.push(member.circunscripcion_nombre);
    if (member.sector_nombre) segments.push(member.sector_nombre);
    return segments;
  }

  const redes = (member?.redes_sociales ?? {}) as RedesSociales;
  const hasRedesSociales = redes.facebook || redes.twitter || redes.instagram;
  const isCoordinatorOrMultiplicador =
    member?.tipo_miembro === 'coordinador' || member?.tipo_miembro === 'multiplicador';
  const geoSegments = buildGeoBreadcrumb();

  // ---------- Loading State ----------

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2
          className="h-6 w-6 animate-spin text-muted-foreground"
          aria-hidden="true"
        />
        <span className="ml-2 text-sm text-muted-foreground">
          Cargando miembro...
        </span>
      </div>
    );
  }

  // ---------- Error State ----------

  if (fetchError || !member) {
    return (
      <div>
        <div className="mb-space-6">
          <Link
            href="/miembros"
            className="inline-flex items-center gap-1 text-sm text-secondary-text transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
          >
            <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
            Volver a Miembros
          </Link>
        </div>
        <div
          className="rounded-md border border-destructive/20 bg-destructive/5 p-6"
          role="alert"
        >
          <p className="text-sm text-destructive">
            {fetchError ?? 'Miembro no encontrado.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMember}
            className="mt-3"
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  // ---------- Render ----------

  return (
    <div>
      {/* Back link */}
      <Link
        href="/miembros"
        className="mb-space-4 inline-flex items-center gap-1 text-sm text-secondary-text transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
      >
        <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
        Volver a Miembros
      </Link>

      {/* ================================================================ */}
      {/* HEADER SECTION                                                    */}
      {/* ================================================================ */}
      <div className="mb-space-6 flex flex-col gap-space-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-neutral-50">
            {member.foto_url ? (
              <Image
                src={member.foto_url}
                alt={`Foto de ${member.nombre} ${member.apellido}`}
                width={64}
                height={64}
                className="h-full w-full object-cover"
              />
            ) : (
              <UserCircle
                size={40}
                strokeWidth={1}
                className="text-muted-foreground"
                aria-hidden="true"
              />
            )}
          </div>

          {/* Name & badges */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-primary-text">
              {member.nombre} {member.apellido}
            </h2>
            {member.apodo && (
              <p className="text-sm text-muted-foreground">
                &ldquo;{member.apodo}&rdquo;
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className={cn(
                  'border-transparent text-xs',
                  TIPO_MIEMBRO_BADGE_STYLES[member.tipo_miembro]
                )}
              >
                {TIPO_MIEMBRO_LABELS[member.tipo_miembro]}
              </Badge>
              <Badge
                variant="secondary"
                className={cn(
                  'border-transparent text-xs',
                  member.estado
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-red-100 text-red-700 hover:bg-red-100'
                )}
              >
                {member.estado ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Edit button */}
        <Button
          variant="outline"
          onClick={() => router.push(`/miembros/${memberId}/editar`)}
          className="sm:flex-shrink-0"
        >
          <Pencil size={16} className="mr-2" aria-hidden="true" />
          Editar
        </Button>
      </div>

      {/* ================================================================ */}
      {/* CONTENT GRID                                                      */}
      {/* ================================================================ */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* -------------------------------------------------------------- */}
        {/* PERSONAL DATA CARD                                              */}
        {/* -------------------------------------------------------------- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User size={18} strokeWidth={1.5} aria-hidden="true" />
              Datos Personales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border">
              <DetailRow
                label="Cedula"
                value={formatCedula(member.cedula)}
                mono
              />
              <DetailRow
                icon={User}
                label="Nombre Completo"
                value={`${member.nombre} ${member.apellido}`}
              />
              {member.apodo && (
                <DetailRow label="Apodo" value={member.apodo} />
              )}
              {member.fecha_nacimiento && (
                <DetailRow
                  icon={Calendar}
                  label="Fecha de Nacimiento"
                  value={new Date(member.fecha_nacimiento).toLocaleDateString(
                    'es-DO',
                    { year: 'numeric', month: 'long', day: 'numeric' }
                  )}
                />
              )}
              {member.sexo && (
                <DetailRow
                  label="Sexo"
                  value={member.sexo === 'M' ? 'Masculino' : 'Femenino'}
                />
              )}
              {member.ocupacion && (
                <DetailRow
                  icon={Briefcase}
                  label="Ocupacion"
                  value={member.ocupacion}
                />
              )}
            </dl>
          </CardContent>
        </Card>

        {/* -------------------------------------------------------------- */}
        {/* CONTACT CARD                                                    */}
        {/* -------------------------------------------------------------- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone size={18} strokeWidth={1.5} aria-hidden="true" />
              Contacto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border">
              {member.telefono && (
                <DetailRow
                  icon={Phone}
                  label="Telefono"
                  value={
                    <a
                      href={`tel:${member.telefono}`}
                      className="text-primary hover:underline"
                    >
                      {formatPhone(member.telefono)}
                    </a>
                  }
                />
              )}
              {member.celular && (
                <DetailRow
                  icon={Phone}
                  label="Celular"
                  value={
                    <a
                      href={`tel:${member.celular}`}
                      className="text-primary hover:underline"
                    >
                      {formatPhone(member.celular)}
                    </a>
                  }
                />
              )}
              {member.email && (
                <DetailRow
                  icon={Mail}
                  label="Correo Electronico"
                  value={
                    <a
                      href={`mailto:${member.email}`}
                      className="text-primary hover:underline"
                    >
                      {member.email}
                    </a>
                  }
                />
              )}
              {member.direccion && (
                <DetailRow
                  icon={MapPin}
                  label="Direccion"
                  value={member.direccion}
                />
              )}

              {/* Social Media */}
              {hasRedesSociales && (
                <>
                  <Separator className="my-2" />
                  <div className="pt-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                      Redes Sociales
                    </p>
                    <div className="space-y-1">
                      {redes.facebook && (
                        <DetailRow
                          icon={Globe}
                          label="Facebook"
                          value={redes.facebook}
                        />
                      )}
                      {redes.twitter && (
                        <DetailRow
                          icon={Globe}
                          label="Twitter / X"
                          value={redes.twitter}
                        />
                      )}
                      {redes.instagram && (
                        <DetailRow
                          icon={Globe}
                          label="Instagram"
                          value={redes.instagram}
                        />
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Empty state if no contact info */}
              {!member.telefono &&
                !member.celular &&
                !member.email &&
                !member.direccion &&
                !hasRedesSociales && (
                  <div className="py-4 text-center text-sm text-placeholder">
                    Sin informacion de contacto registrada.
                  </div>
                )}
            </dl>
          </CardContent>
        </Card>

        {/* -------------------------------------------------------------- */}
        {/* GEOGRAPHIC CARD                                                 */}
        {/* -------------------------------------------------------------- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin size={18} strokeWidth={1.5} aria-hidden="true" />
              Ubicacion Geografica
            </CardTitle>
          </CardHeader>
          <CardContent>
            {geoSegments.length > 0 ? (
              <nav aria-label="Ubicacion geografica del miembro">
                <ol className="flex flex-wrap items-center gap-1.5 text-sm">
                  {geoSegments.map((segment, index) => (
                    <li key={index} className="flex items-center gap-1.5">
                      {index > 0 && (
                        <ChevronRight
                          size={14}
                          strokeWidth={1.5}
                          className="text-placeholder"
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className={cn(
                          index === geoSegments.length - 1
                            ? 'font-medium text-primary-text'
                            : 'text-secondary-text'
                        )}
                      >
                        {segment}
                      </span>
                    </li>
                  ))}
                </ol>
              </nav>
            ) : (
              <p className="text-sm text-placeholder">
                Sin ubicacion geografica asignada.
              </p>
            )}
          </CardContent>
        </Card>

        {/* -------------------------------------------------------------- */}
        {/* ORGANIZATION CARD                                               */}
        {/* -------------------------------------------------------------- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users size={18} strokeWidth={1.5} aria-hidden="true" />
              Asignacion Organizacional
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border">
              <DetailRow
                label="Tipo de Miembro"
                value={
                  <Badge
                    variant="secondary"
                    className={cn(
                      'border-transparent text-xs',
                      TIPO_MIEMBRO_BADGE_STYLES[member.tipo_miembro]
                    )}
                  >
                    {TIPO_MIEMBRO_LABELS[member.tipo_miembro]}
                  </Badge>
                }
              />

              {member.coordinador_nombre && (
                <DetailRow
                  icon={User}
                  label="Coordinador"
                  value={
                    member.coordinador_id ? (
                      <Link
                        href={`/miembros/${member.coordinador_id}`}
                        className="text-primary hover:underline"
                      >
                        {member.coordinador_nombre}
                        {member.coordinador_cedula && (
                          <span className="ml-2 font-mono text-xs text-muted-foreground">
                            ({formatCedula(member.coordinador_cedula)})
                          </span>
                        )}
                      </Link>
                    ) : (
                      member.coordinador_nombre
                    )
                  }
                />
              )}

              {(member as MemberDetail & { recinto_nombre?: string })
                .recinto_nombre && (
                <DetailRow
                  icon={MapPin}
                  label="Recinto"
                  value={
                    (member as MemberDetail & { recinto_nombre?: string })
                      .recinto_nombre
                  }
                />
              )}

              {member.tipo_miembro === 'coordinador' &&
                !member.coordinador_nombre && (
                  <div className="py-2 text-sm text-muted-foreground">
                    Los coordinadores no requieren asignacion a otro coordinador.
                  </div>
                )}
            </dl>
          </CardContent>
        </Card>

        {/* -------------------------------------------------------------- */}
        {/* RELATED MEMBERS (full width)                                    */}
        {/* -------------------------------------------------------------- */}
        {isCoordinatorOrMultiplicador && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users size={18} strokeWidth={1.5} aria-hidden="true" />
                  Miembros Relacionados
                  {relatedMembers.length > 0 && (
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      ({relatedMembers.length})
                    </span>
                  )}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {loadingRelated ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2
                    className="h-5 w-5 animate-spin text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="ml-2 text-sm text-muted-foreground">
                    Cargando miembros...
                  </span>
                </div>
              ) : relatedMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8">
                  <Users
                    size={32}
                    strokeWidth={1}
                    className="mb-2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-secondary-text">
                    No hay miembros asignados a este{' '}
                    {TIPO_MIEMBRO_LABELS[member.tipo_miembro].toLowerCase()}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border rounded-lg border border-border">
                  {relatedMembers.map((related) => (
                    <RelatedMemberRow key={related.id} member={related} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* -------------------------------------------------------------- */}
        {/* SEGUIMIENTO TIMELINE (full width)                               */}
        {/* -------------------------------------------------------------- */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar size={18} strokeWidth={1.5} aria-hidden="true" />
              Seguimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SeguimientoTimeline memberId={memberId} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
