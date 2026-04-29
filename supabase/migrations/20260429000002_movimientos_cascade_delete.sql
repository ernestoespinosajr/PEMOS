-- =============================================================================
-- Migration: Change miembros.movimiento_id FK to ON DELETE CASCADE
-- =============================================================================
-- Previously the FK used ON DELETE SET NULL, which orphaned miembro rows when
-- a movimiento was deleted (movimiento_id became NULL but the row remained).
-- The correct behaviour is to delete all miembros scoped to a movimiento when
-- that movimiento is removed.
--
-- usuarios.movimiento_id intentionally keeps ON DELETE SET NULL — deleting a
-- movimiento should unscope user accounts, not remove them.
--
-- Rollback:
--   ALTER TABLE miembros
--     DROP CONSTRAINT IF EXISTS fk_miembros_movimiento,
--     ADD CONSTRAINT fk_miembros_movimiento
--       FOREIGN KEY (movimiento_id) REFERENCES movimientos(id) ON DELETE SET NULL;
-- =============================================================================

ALTER TABLE miembros
  DROP CONSTRAINT IF EXISTS fk_miembros_movimiento,
  ADD CONSTRAINT fk_miembros_movimiento
    FOREIGN KEY (movimiento_id) REFERENCES movimientos(id) ON DELETE CASCADE;
