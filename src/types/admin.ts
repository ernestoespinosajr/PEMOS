/**
 * Types for the Admin User Management feature.
 */

import type { UserRole } from '@/types/auth';

/**
 * A user record as returned by the admin users API.
 */
export interface AdminUser {
  id: string;
  auth_user_id: string | null;
  nombre: string;
  apellido: string;
  email: string;
  role: UserRole;
  estado: boolean;
  provincia_id: string | null;
  municipio_id: string | null;
  circunscripcion_id: string | null;
  tenant_id: string | null;
  created_at: string;
  /** Resolved names for display (joined from geographic tables) */
  provincia_nombre?: string | null;
  municipio_nombre?: string | null;
  circunscripcion_nombre?: string | null;
}

/**
 * Payload for creating a new user via POST /api/admin/users.
 */
export interface CreateUserPayload {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  role: UserRole;
  provincia_id?: string | null;
  municipio_id?: string | null;
  circunscripcion_id?: string | null;
}

/**
 * Payload for updating a user via PATCH /api/admin/users/[id].
 */
export interface UpdateUserPayload {
  nombre?: string;
  apellido?: string;
  role?: UserRole;
  estado?: boolean;
  provincia_id?: string | null;
  municipio_id?: string | null;
  circunscripcion_id?: string | null;
}

/**
 * A geographic entity (provincia, municipio, or circunscripcion).
 */
export interface GeoEntity {
  id: string;
  nombre: string;
  codigo?: string;
}
