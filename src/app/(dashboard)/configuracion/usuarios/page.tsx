'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UsersTable } from '@/components/admin/users-table';
import {
  CreateUserDialog,
  EditUserDialog,
  DeactivateUserDialog,
} from '@/components/admin/user-form-dialog';
import { Plus, Search, Loader2 } from 'lucide-react';
import type { AdminUser } from '@/types/admin';

/**
 * Admin User Management Page
 *
 * Route: /configuracion/usuarios
 * Access: admin only (enforced by middleware route permissions)
 *
 * Displays a table of all system users with capabilities to:
 * - Create new users (with auth + database record)
 * - Edit user profiles, roles, and geographic scope
 * - Deactivate/reactivate users
 */
export default function UsuariosPage() {
  const router = useRouter();

  // Data state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Search/filter
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setFetchError(null);

    try {
      const res = await fetch('/api/admin/users');
      const json = await res.json();

      if (!res.ok) {
        setFetchError(json.error ?? 'Error al obtener usuarios');
        return;
      }

      setUsers(json.users ?? []);
    } catch {
      setFetchError('Error de conexion. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handlers for dialogs
  function handleEdit(user: AdminUser) {
    setSelectedUser(user);
    setEditOpen(true);
  }

  function handleDeactivate(user: AdminUser) {
    setSelectedUser(user);
    setDeactivateOpen(true);
  }

  function handleMutationSuccess() {
    fetchUsers();
    router.refresh();
  }

  // Filter users by search query
  const filteredUsers = searchQuery
    ? users.filter((user) => {
        const query = searchQuery.toLowerCase();
        const fullName = `${user.nombre} ${user.apellido}`.toLowerCase();
        return (
          fullName.includes(query) ||
          user.email.toLowerCase().includes(query) ||
          (user.provincia_nombre?.toLowerCase().includes(query) ?? false) ||
          (user.municipio_nombre?.toLowerCase().includes(query) ?? false)
        );
      })
    : users;

  return (
    <div>
      {/* Page Header */}
      <div className="mb-space-6 flex flex-col gap-space-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary-text">
            Gestion de Usuarios
          </h2>
          <p className="mt-space-1 text-sm text-secondary-text">
            Administra los usuarios del sistema, sus roles y ambitos
            geograficos.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="sm:flex-shrink-0">
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Crear Usuario
        </Button>
      </div>

      {/* Search and Filters Bar */}
      <div className="mb-space-4">
        <div className="relative max-w-sm">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Buscar por nombre, correo o ubicacion..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Buscar usuarios"
          />
        </div>
      </div>

      {/* Error State */}
      {fetchError && (
        <div
          className="mb-space-4 rounded-md border border-destructive/20 bg-destructive/5 p-4"
          role="alert"
        >
          <p className="text-sm text-destructive">{fetchError}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            className="mt-2"
          >
            Reintentar
          </Button>
        </div>
      )}

      {/* User Count */}
      {!loading && !fetchError && (
        <p className="mb-space-4 text-sm text-muted-foreground">
          {filteredUsers.length === users.length
            ? `${users.length} usuario${users.length !== 1 ? 's' : ''} en total`
            : `${filteredUsers.length} de ${users.length} usuarios`}
        </p>
      )}

      {/* Users Table */}
      <UsersTable
        users={filteredUsers}
        loading={loading}
        onEdit={handleEdit}
        onDeactivate={handleDeactivate}
      />

      {/* Dialogs */}
      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleMutationSuccess}
      />

      <EditUserDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        user={selectedUser}
        onSuccess={handleMutationSuccess}
      />

      <DeactivateUserDialog
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        user={selectedUser}
        onSuccess={handleMutationSuccess}
      />
    </div>
  );
}
