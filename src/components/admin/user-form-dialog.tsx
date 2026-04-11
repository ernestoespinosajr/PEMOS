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
import { SelectNative } from '@/components/ui/select-native';
import { GeographicScopeSelector } from '@/components/admin/geographic-scope-selector';
import { ROLES } from '@/lib/auth/roles';
import { Loader2 } from 'lucide-react';
import type { AdminUser } from '@/types/admin';

// ---------- Zod Schemas ----------

const createUserSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  apellido: z.string().min(1, 'El apellido es requerido'),
  email: z.string().email('Correo electronico invalido'),
  password: z
    .string()
    .min(8, 'La contrasena debe tener al menos 8 caracteres'),
  role: z.enum(['admin', 'coordinator', 'observer', 'field_worker'], {
    required_error: 'Selecciona un rol',
  }),
});

const editUserSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  apellido: z.string().min(1, 'El apellido es requerido'),
  role: z.enum(['admin', 'coordinator', 'observer', 'field_worker'], {
    required_error: 'Selecciona un rol',
  }),
});

type CreateFormData = z.infer<typeof createUserSchema>;
type EditFormData = z.infer<typeof editUserSchema>;

// ---------- Create User Dialog ----------

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateUserDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [provinciaId, setProvinciaId] = useState<string | null>(null);
  const [municipioId, setMunicipioId] = useState<string | null>(null);
  const [circunscripcionId, setCircunscripcionId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      nombre: '',
      apellido: '',
      email: '',
      password: '',
      role: undefined,
    },
  });

  const selectedRole = watch('role');
  const showGeoScope = selectedRole && selectedRole !== 'admin';

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      reset();
      setProvinciaId(null);
      setMunicipioId(null);
      setCircunscripcionId(null);
      setApiError(null);
    }
  }, [open, reset]);

  async function onSubmit(data: CreateFormData) {
    setSubmitting(true);
    setApiError(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          provincia_id: provinciaId,
          municipio_id: municipioId,
          circunscripcion_id: circunscripcionId,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setApiError(json.error ?? 'Error al crear usuario');
        setSubmitting(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear Usuario</DialogTitle>
          <DialogDescription>
            Ingresa los datos del nuevo usuario. Se creara con acceso inmediato
            al sistema.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="create-nombre">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="create-nombre"
              placeholder="Nombre"
              aria-invalid={!!errors.nombre}
              aria-describedby={errors.nombre ? 'create-nombre-error' : undefined}
              {...register('nombre')}
            />
            {errors.nombre && (
              <p
                id="create-nombre-error"
                className="text-xs text-destructive"
                role="alert"
              >
                {errors.nombre.message}
              </p>
            )}
          </div>

          {/* Apellido */}
          <div className="space-y-1.5">
            <Label htmlFor="create-apellido">
              Apellido <span className="text-destructive">*</span>
            </Label>
            <Input
              id="create-apellido"
              placeholder="Apellido"
              aria-invalid={!!errors.apellido}
              aria-describedby={
                errors.apellido ? 'create-apellido-error' : undefined
              }
              {...register('apellido')}
            />
            {errors.apellido && (
              <p
                id="create-apellido-error"
                className="text-xs text-destructive"
                role="alert"
              >
                {errors.apellido.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="create-email">
              Correo electronico <span className="text-destructive">*</span>
            </Label>
            <Input
              id="create-email"
              type="email"
              placeholder="correo@ejemplo.com"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'create-email-error' : undefined}
              {...register('email')}
            />
            {errors.email && (
              <p
                id="create-email-error"
                className="text-xs text-destructive"
                role="alert"
              >
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="create-password">
              Contrasena temporal <span className="text-destructive">*</span>
            </Label>
            <Input
              id="create-password"
              type="password"
              placeholder="Minimo 8 caracteres"
              aria-invalid={!!errors.password}
              aria-describedby={
                errors.password ? 'create-password-error' : undefined
              }
              {...register('password')}
            />
            {errors.password && (
              <p
                id="create-password-error"
                className="text-xs text-destructive"
                role="alert"
              >
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label htmlFor="create-role">
              Rol <span className="text-destructive">*</span>
            </Label>
            <SelectNative
              id="create-role"
              aria-invalid={!!errors.role}
              aria-describedby={errors.role ? 'create-role-error' : undefined}
              {...register('role')}
            >
              <option value="" disabled>
                Seleccionar rol
              </option>
              {Object.values(ROLES).map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </SelectNative>
            {errors.role && (
              <p
                id="create-role-error"
                className="text-xs text-destructive"
                role="alert"
              >
                {errors.role.message}
              </p>
            )}
          </div>

          {/* Geographic Scope */}
          {showGeoScope && (
            <div className="rounded-md border border-border p-3">
              <p className="mb-2 text-sm font-medium">Ambito geografico</p>
              <GeographicScopeSelector
                provinciaId={provinciaId}
                municipioId={municipioId}
                circunscripcionId={circunscripcionId}
                onProvinciaChange={setProvinciaId}
                onMunicipioChange={setMunicipioId}
                onCircunscripcionChange={setCircunscripcionId}
              />
            </div>
          )}

          {/* API Error */}
          {apiError && (
            <div
              className="rounded-md border border-destructive/20 bg-destructive/5 p-3"
              role="alert"
              aria-live="polite"
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
              Crear Usuario
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Edit User Dialog ----------

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUser | null;
  onSuccess: () => void;
}

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: EditUserDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [provinciaId, setProvinciaId] = useState<string | null>(null);
  const [municipioId, setMunicipioId] = useState<string | null>(null);
  const [circunscripcionId, setCircunscripcionId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<EditFormData>({
    resolver: zodResolver(editUserSchema),
  });

  const selectedRole = watch('role');
  const showGeoScope = selectedRole && selectedRole !== 'admin';

  // Populate form when user changes
  useEffect(() => {
    if (user && open) {
      reset({
        nombre: user.nombre,
        apellido: user.apellido,
        role: user.role,
      });
      setProvinciaId(user.provincia_id);
      setMunicipioId(user.municipio_id);
      setCircunscripcionId(user.circunscripcion_id);
      setApiError(null);
    }
  }, [user, open, reset]);

  async function onSubmit(data: EditFormData) {
    if (!user) return;

    setSubmitting(true);
    setApiError(null);

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          provincia_id: data.role === 'admin' ? null : provinciaId,
          municipio_id: data.role === 'admin' ? null : municipioId,
          circunscripcion_id: data.role === 'admin' ? null : circunscripcionId,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setApiError(json.error ?? 'Error al actualizar usuario');
        setSubmitting(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Usuario</DialogTitle>
          <DialogDescription>
            Modifica los datos de{' '}
            {user ? `${user.nombre} ${user.apellido}` : 'este usuario'}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-nombre">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-nombre"
              placeholder="Nombre"
              aria-invalid={!!errors.nombre}
              aria-describedby={errors.nombre ? 'edit-nombre-error' : undefined}
              {...register('nombre')}
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

          {/* Apellido */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-apellido">
              Apellido <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-apellido"
              placeholder="Apellido"
              aria-invalid={!!errors.apellido}
              aria-describedby={
                errors.apellido ? 'edit-apellido-error' : undefined
              }
              {...register('apellido')}
            />
            {errors.apellido && (
              <p
                id="edit-apellido-error"
                className="text-xs text-destructive"
                role="alert"
              >
                {errors.apellido.message}
              </p>
            )}
          </div>

          {/* Email (read-only) */}
          {user && (
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Correo electronico</Label>
              <Input
                id="edit-email"
                type="email"
                value={user.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                El correo electronico no se puede modificar.
              </p>
            </div>
          )}

          {/* Role */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-role">
              Rol <span className="text-destructive">*</span>
            </Label>
            <SelectNative
              id="edit-role"
              aria-invalid={!!errors.role}
              aria-describedby={errors.role ? 'edit-role-error' : undefined}
              {...register('role')}
            >
              {Object.values(ROLES).map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </SelectNative>
            {errors.role && (
              <p
                id="edit-role-error"
                className="text-xs text-destructive"
                role="alert"
              >
                {errors.role.message}
              </p>
            )}
          </div>

          {/* Geographic Scope */}
          {showGeoScope && (
            <div className="rounded-md border border-border p-3">
              <p className="mb-2 text-sm font-medium">Ambito geografico</p>
              <GeographicScopeSelector
                provinciaId={provinciaId}
                municipioId={municipioId}
                circunscripcionId={circunscripcionId}
                onProvinciaChange={setProvinciaId}
                onMunicipioChange={setMunicipioId}
                onCircunscripcionChange={setCircunscripcionId}
              />
            </div>
          )}

          {/* API Error */}
          {apiError && (
            <div
              className="rounded-md border border-destructive/20 bg-destructive/5 p-3"
              role="alert"
              aria-live="polite"
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

// ---------- Deactivate Confirmation Dialog ----------

interface DeactivateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUser | null;
  onSuccess: () => void;
}

export function DeactivateUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: DeactivateUserDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setApiError(null);
    }
  }, [open]);

  async function handleDeactivate() {
    if (!user) return;

    setSubmitting(true);
    setApiError(null);

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: false }),
      });

      const json = await res.json();

      if (!res.ok) {
        setApiError(json.error ?? 'Error al desactivar usuario');
        setSubmitting(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Desactivar Usuario</DialogTitle>
          <DialogDescription>
            {user
              ? `¿Estas seguro de que deseas desactivar a ${user.nombre} ${user.apellido}?`
              : '¿Estas seguro de que deseas desactivar este usuario?'}
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Esta accion impedira que el usuario acceda al sistema. Podras
          reactivarlo en cualquier momento.
        </p>

        {apiError && (
          <div
            className="rounded-md border border-destructive/20 bg-destructive/5 p-3"
            role="alert"
            aria-live="polite"
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
          <Button
            type="button"
            variant="destructive"
            onClick={handleDeactivate}
            disabled={submitting}
          >
            {submitting && (
              <Loader2
                className="mr-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            )}
            Desactivar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
