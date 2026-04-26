-- =============================================================================
-- Migration: Schedule Management Extensions (ftr-010)
-- =============================================================================
-- Extends the cronogramas table with columns needed for full calendar event
-- management (FullCalendar-compatible), adds the cronograma_tareas sub-task
-- table, applies RLS policies, indexes, and triggers.
--
-- CHANGES SUMMARY:
--   1. ALTER cronogramas: add responsable_id, categoria, prioridad, es_recurrente,
--      patron_recurrencia, recurrencia_padre_id, created_by, todo_el_dia, color
--   2. ALTER cronogramas: convert estado from BOOLEAN to VARCHAR with CHECK
--      constraint (data migration: true -> 'activo', false -> 'cancelado')
--   3. CREATE cronograma_tareas table with RLS, indexes, trigger
--   4. Indexes on new cronogramas columns
--
-- Rollback (run in order):
--   -- Drop cronograma_tareas and its dependencies
--   DROP TRIGGER IF EXISTS trg_cronograma_tareas_updated_at ON cronograma_tareas;
--   REVOKE ALL ON cronograma_tareas FROM authenticated;
--   DROP POLICY IF EXISTS "cronograma_tareas_select" ON cronograma_tareas;
--   DROP POLICY IF EXISTS "cronograma_tareas_insert_admin" ON cronograma_tareas;
--   DROP POLICY IF EXISTS "cronograma_tareas_update" ON cronograma_tareas;
--   DROP POLICY IF EXISTS "cronograma_tareas_delete_admin" ON cronograma_tareas;
--   DROP TABLE IF EXISTS cronograma_tareas;
--
--   -- Drop new indexes on cronogramas
--   DROP INDEX IF EXISTS idx_cronogramas_responsable_id;
--   DROP INDEX IF EXISTS idx_cronogramas_categoria;
--   DROP INDEX IF EXISTS idx_cronogramas_recurrencia_padre_id;
--   DROP INDEX IF EXISTS idx_cronogramas_created_by;
--   DROP INDEX IF EXISTS idx_cronogramas_prioridad;
--   DROP INDEX IF EXISTS idx_cronogramas_es_recurrente;
--
--   -- Revert estado back to BOOLEAN
--   DROP INDEX IF EXISTS idx_cronogramas_estado;
--   ALTER TABLE cronogramas DROP CONSTRAINT IF EXISTS chk_cronogramas_estado;
--   ALTER TABLE cronogramas ADD COLUMN estado_old BOOLEAN NOT NULL DEFAULT true;
--   UPDATE cronogramas SET estado_old = CASE
--     WHEN estado = 'activo' THEN true
--     WHEN estado = 'cancelado' THEN false
--     ELSE true
--   END;
--   ALTER TABLE cronogramas DROP COLUMN estado;
--   ALTER TABLE cronogramas RENAME COLUMN estado_old TO estado;
--   CREATE INDEX idx_cronogramas_estado ON cronogramas(estado);
--
--   -- Drop new columns on cronogramas
--   ALTER TABLE cronogramas DROP COLUMN IF EXISTS color;
--   ALTER TABLE cronogramas DROP COLUMN IF EXISTS todo_el_dia;
--   ALTER TABLE cronogramas DROP COLUMN IF EXISTS created_by;
--   ALTER TABLE cronogramas DROP COLUMN IF EXISTS recurrencia_padre_id;
--   ALTER TABLE cronogramas DROP COLUMN IF EXISTS patron_recurrencia;
--   ALTER TABLE cronogramas DROP COLUMN IF EXISTS es_recurrente;
--   ALTER TABLE cronogramas DROP COLUMN IF EXISTS prioridad;
--   ALTER TABLE cronogramas DROP COLUMN IF EXISTS categoria;
--   ALTER TABLE cronogramas DROP COLUMN IF EXISTS responsable_id;
-- =============================================================================


-- =============================================================================
-- SECTION 1: ALTER cronogramas — Add new columns
-- =============================================================================

-- Responsible party (linked to PEMOS user)
ALTER TABLE cronogramas
  ADD COLUMN responsable_id UUID REFERENCES usuarios(id) ON DELETE SET NULL;

-- Event category with CHECK constraint
ALTER TABLE cronogramas
  ADD COLUMN categoria VARCHAR(50);

ALTER TABLE cronogramas
  ADD CONSTRAINT chk_cronogramas_categoria
  CHECK (categoria IS NULL OR categoria IN (
    'reunion', 'capacitacion', 'operativo', 'electoral', 'administrativo', 'otro'
  ));

-- Priority with CHECK constraint and default
ALTER TABLE cronogramas
  ADD COLUMN prioridad VARCHAR(10) NOT NULL DEFAULT 'media';

ALTER TABLE cronogramas
  ADD CONSTRAINT chk_cronogramas_prioridad
  CHECK (prioridad IN ('alta', 'media', 'baja'));

-- Recurrence support
ALTER TABLE cronogramas
  ADD COLUMN es_recurrente BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE cronogramas
  ADD COLUMN patron_recurrencia JSONB;

-- Self-referencing FK for recurring event instances pointing to their parent
-- ON DELETE SET NULL so deleting a parent does not cascade-delete all instances
ALTER TABLE cronogramas
  ADD COLUMN recurrencia_padre_id UUID REFERENCES cronogramas(id) ON DELETE SET NULL;

-- Audit: who created the event (Supabase auth user)
ALTER TABLE cronogramas
  ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- FullCalendar-compatible flags
ALTER TABLE cronogramas
  ADD COLUMN todo_el_dia BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE cronogramas
  ADD COLUMN color VARCHAR(30);


-- =============================================================================
-- SECTION 2: Convert estado from BOOLEAN to VARCHAR
-- =============================================================================
-- Strategy: add new column, migrate data, drop old, rename new, add constraint.
-- The existing idx_cronogramas_estado index will be dropped automatically when
-- the column is dropped. We recreate it on the new VARCHAR column afterward.
-- =============================================================================

-- Step 2a: Add the new VARCHAR column
ALTER TABLE cronogramas
  ADD COLUMN estado_new VARCHAR(20) NOT NULL DEFAULT 'planificado';

-- Step 2b: Migrate existing data
-- true -> 'activo', false -> 'cancelado'
UPDATE cronogramas SET estado_new = CASE
  WHEN estado = true THEN 'activo'
  WHEN estado = false THEN 'cancelado'
  ELSE 'planificado'
END;

-- Step 2c: Drop the old index on estado (explicit, in case auto-drop fails)
DROP INDEX IF EXISTS idx_cronogramas_estado;

-- Step 2d: Drop old column and rename new column
ALTER TABLE cronogramas DROP COLUMN estado;
ALTER TABLE cronogramas RENAME COLUMN estado_new TO estado;

-- Step 2e: Add CHECK constraint for valid states
ALTER TABLE cronogramas
  ADD CONSTRAINT chk_cronogramas_estado
  CHECK (estado IN ('planificado', 'en_progreso', 'completado', 'cancelado', 'activo'));

-- Step 2f: Recreate index on the new estado column
CREATE INDEX idx_cronogramas_estado ON cronogramas(estado);


-- =============================================================================
-- SECTION 3: Indexes on new cronogramas columns
-- =============================================================================

CREATE INDEX idx_cronogramas_responsable_id ON cronogramas(responsable_id);
CREATE INDEX idx_cronogramas_categoria ON cronogramas(categoria);
CREATE INDEX idx_cronogramas_recurrencia_padre_id ON cronogramas(recurrencia_padre_id);
CREATE INDEX idx_cronogramas_created_by ON cronogramas(created_by);
CREATE INDEX idx_cronogramas_prioridad ON cronogramas(prioridad);
CREATE INDEX idx_cronogramas_es_recurrente ON cronogramas(es_recurrente) WHERE es_recurrente = true;

-- Composite index for calendar date-range queries (common FullCalendar query pattern)
CREATE INDEX idx_cronogramas_fecha_range ON cronogramas(tenant_id, fecha_inicio, fecha_fin);


-- =============================================================================
-- SECTION 4: CREATE cronograma_tareas table
-- =============================================================================

CREATE TABLE cronograma_tareas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cronograma_id UUID NOT NULL REFERENCES cronogramas(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    completada BOOLEAN NOT NULL DEFAULT false,
    fecha_limite DATE,
    asignado_a UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    orden INTEGER NOT NULL DEFAULT 0,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at trigger (reuses the existing update_updated_at_column function)
CREATE TRIGGER trg_cronograma_tareas_updated_at
    BEFORE UPDATE ON cronograma_tareas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- =============================================================================
-- SECTION 5: Indexes on cronograma_tareas
-- =============================================================================

CREATE INDEX idx_cronograma_tareas_cronograma_id ON cronograma_tareas(cronograma_id);
CREATE INDEX idx_cronograma_tareas_asignado_a ON cronograma_tareas(asignado_a);
CREATE INDEX idx_cronograma_tareas_tenant_id ON cronograma_tareas(tenant_id);
CREATE INDEX idx_cronograma_tareas_completada ON cronograma_tareas(completada);

-- Composite index for fetching tasks by event within a tenant
CREATE INDEX idx_cronograma_tareas_tenant_cronograma
  ON cronograma_tareas(tenant_id, cronograma_id);


-- =============================================================================
-- SECTION 6: RLS for cronograma_tareas
-- =============================================================================

ALTER TABLE cronograma_tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cronograma_tareas FORCE ROW LEVEL SECURITY;

-- SELECT: All authenticated users within tenant can read tasks.
-- Geographic scoping is inherited from the parent cronograma via the
-- cronogramas_select policy — if a user cannot see the parent event,
-- they cannot meaningfully use the task data either. However, for defense
-- in depth, we scope tasks to the tenant level here. The parent cronograma
-- RLS handles geographic filtering.
CREATE POLICY "cronograma_tareas_select"
  ON cronograma_tareas FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
  );

-- INSERT: Admin only (within tenant). Tasks inherit the parent event's tenant.
CREATE POLICY "cronograma_tareas_insert_admin"
  ON cronograma_tareas FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'admin'
  );

-- UPDATE: Admin can update all tasks within tenant.
-- Coordinators can update tasks assigned to them (e.g., toggle completada).
CREATE POLICY "cronograma_tareas_update"
  ON cronograma_tareas FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND (
      public.get_my_role() = 'admin'
      OR (
        public.get_my_role() = 'coordinator'
        AND asignado_a = (
          SELECT u.id FROM usuarios u
          WHERE u.auth_user_id = auth.uid()
          AND u.tenant_id = public.get_my_tenant_id()
          LIMIT 1
        )
      )
    )
  )
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND (
      public.get_my_role() = 'admin'
      OR (
        public.get_my_role() = 'coordinator'
        AND asignado_a = (
          SELECT u.id FROM usuarios u
          WHERE u.auth_user_id = auth.uid()
          AND u.tenant_id = public.get_my_tenant_id()
          LIMIT 1
        )
      )
    )
  );

-- DELETE: Admin only (within tenant)
CREATE POLICY "cronograma_tareas_delete_admin"
  ON cronograma_tareas FOR DELETE
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'admin'
  );


-- =============================================================================
-- SECTION 7: GRANT/REVOKE for cronograma_tareas
-- =============================================================================

REVOKE ALL ON cronograma_tareas FROM anon;
REVOKE ALL ON cronograma_tareas FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON cronograma_tareas TO authenticated;
