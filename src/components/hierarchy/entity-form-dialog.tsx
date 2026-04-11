'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { HierarchyEntity, HierarchyLevel } from '@/types/hierarchy';
import { LEVEL_LABELS, LEVEL_TABLE, LEVEL_PARENT_FK } from '@/types/hierarchy';

// ---------- Zod Schema ----------

const entitySchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  codigo: z.string().min(1, 'El codigo es requerido'),
});

type EntityFormData = z.infer<typeof entitySchema>;

// ---------- Create Dialog ----------

interface CreateEntityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  level: HierarchyLevel;
  /** Parent entity ID (null for provincias). */
  parentId: string | null;
  /** Display name of the parent entity for context. */
  parentName: string | null;
  onSuccess: () => void;
}

export function CreateEntityDialog({
  open,
  onOpenChange,
  level,
  parentId,
  parentName,
  onSuccess,
}: CreateEntityDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EntityFormData>({
    resolver: zodResolver(entitySchema),
    defaultValues: { nombre: '', codigo: '' },
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      reset({ nombre: '', codigo: '' });
      setApiError(null);
    }
  }, [open, reset]);

  async function onSubmit(data: EntityFormData) {
    setSubmitting(true);
    setApiError(null);

    try {
      const supabase = createClient();
      const table = LEVEL_TABLE[level];
      const parentFk = LEVEL_PARENT_FK[level];

      // Build the insert payload
      const payload: Record<string, unknown> = {
        nombre: data.nombre,
        estado: true,
      };

      // For circunscripciones the identifier column is `numero`, not `codigo`
      if (level === 'circunscripcion') {
        payload.numero = parseInt(data.codigo, 10) || 0;
      } else {
        payload.codigo = data.codigo;
      }

      // Add parent FK if applicable
      if (parentFk && parentId) {
        payload[parentFk] = parentId;
      }

      const { error } = await supabase.from(table).insert(payload);

      if (error) {
        setApiError(error.message);
        return;
      }

      onSuccess();
      onOpenChange(false);
    } catch {
      setApiError('Error de conexion. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  }

  const labels = LEVEL_LABELS[level];
  const parentLevel = LEVEL_PARENT_FK[level]
    ? level === 'municipio'
      ? 'Provincia'
      : level === 'circunscripcion'
        ? 'Municipio'
        : level === 'sector'
          ? 'Circunscripcion'
          : level === 'comite'
            ? 'Sector'
            : level === 'nivel_intermedio'
              ? 'Comite'
              : null
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear {labels.singular}</DialogTitle>
          <DialogDescription>
            Ingresa los datos para crear{' '}
            {level === 'circunscripcion' ? 'una' : 'un'} nueva{' '}
            {labels.singular.toLowerCase()}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Parent context (read-only) */}
          {parentLevel && parentName && (
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">{parentLevel}</Label>
              <p className="rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                {parentName}
              </p>
            </div>
          )}

          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="entity-nombre">Nombre</Label>
            <Input
              id="entity-nombre"
              {...register('nombre')}
              placeholder={`Nombre de ${level === 'circunscripcion' ? 'la' : 'el'} ${labels.singular.toLowerCase()}`}
              aria-invalid={errors.nombre ? 'true' : undefined}
              aria-describedby={
                errors.nombre ? 'entity-nombre-error' : undefined
              }
            />
            {errors.nombre && (
              <p
                id="entity-nombre-error"
                className="text-xs text-destructive"
                role="alert"
              >
                {errors.nombre.message}
              </p>
            )}
          </div>

          {/* Codigo / Numero */}
          <div className="space-y-1.5">
            <Label htmlFor="entity-codigo">
              {level === 'circunscripcion' ? 'Numero' : 'Codigo'}
            </Label>
            <Input
              id="entity-codigo"
              {...register('codigo')}
              placeholder={
                level === 'circunscripcion'
                  ? 'Ej: 1'
                  : 'Codigo identificador'
              }
              aria-invalid={errors.codigo ? 'true' : undefined}
              aria-describedby={
                errors.codigo ? 'entity-codigo-error' : undefined
              }
            />
            {errors.codigo && (
              <p
                id="entity-codigo-error"
                className="text-xs text-destructive"
                role="alert"
              >
                {errors.codigo.message}
              </p>
            )}
          </div>

          {/* API Error */}
          {apiError && (
            <div
              className="rounded-md border border-destructive/20 bg-destructive/5 p-3"
              role="alert"
            >
              <p className="text-sm text-destructive">{apiError}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && (
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              )}
              Crear {labels.singular}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Edit Dialog ----------

interface EditEntityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: HierarchyEntity | null;
  level: HierarchyLevel;
  onSuccess: () => void;
}

export function EditEntityDialog({
  open,
  onOpenChange,
  entity,
  level,
  onSuccess,
}: EditEntityDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EntityFormData>({
    resolver: zodResolver(entitySchema),
  });

  // Populate form when entity changes
  useEffect(() => {
    if (entity && open) {
      reset({
        nombre: entity.nombre,
        codigo: entity.codigo,
      });
      setApiError(null);
    }
  }, [entity, open, reset]);

  async function onSubmit(data: EntityFormData) {
    if (!entity) return;

    setSubmitting(true);
    setApiError(null);

    try {
      const supabase = createClient();
      const table = LEVEL_TABLE[level];

      const payload: Record<string, unknown> = {
        nombre: data.nombre,
      };

      if (level === 'circunscripcion') {
        payload.numero = parseInt(data.codigo, 10) || 0;
      } else {
        payload.codigo = data.codigo;
      }

      const { error } = await supabase
        .from(table)
        .update(payload)
        .eq('id', entity.id);

      if (error) {
        setApiError(error.message);
        return;
      }

      onSuccess();
      onOpenChange(false);
    } catch {
      setApiError('Error de conexion. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  }

  const labels = LEVEL_LABELS[level];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar {labels.singular}</DialogTitle>
          <DialogDescription>
            Modifica los datos de{' '}
            {level === 'circunscripcion' ? 'la' : 'el'}{' '}
            {labels.singular.toLowerCase()}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-nombre">Nombre</Label>
            <Input
              id="edit-nombre"
              {...register('nombre')}
              aria-invalid={errors.nombre ? 'true' : undefined}
              aria-describedby={
                errors.nombre ? 'edit-nombre-error' : undefined
              }
            />
            {errors.nombre && (
              <p
                id="edit-nombre-error"
                className="text-xs text-destructive"
                role="alert"
              >
                {errors.nombre.message}
              </p>
            )}
          </div>

          {/* Codigo / Numero */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-codigo">
              {level === 'circunscripcion' ? 'Numero' : 'Codigo'}
            </Label>
            <Input
              id="edit-codigo"
              {...register('codigo')}
              aria-invalid={errors.codigo ? 'true' : undefined}
              aria-describedby={
                errors.codigo ? 'edit-codigo-error' : undefined
              }
            />
            {errors.codigo && (
              <p
                id="edit-codigo-error"
                className="text-xs text-destructive"
                role="alert"
              >
                {errors.codigo.message}
              </p>
            )}
          </div>

          {/* API Error */}
          {apiError && (
            <div
              className="rounded-md border border-destructive/20 bg-destructive/5 p-3"
              role="alert"
            >
              <p className="text-sm text-destructive">{apiError}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && (
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              )}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
