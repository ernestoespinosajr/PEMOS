-- =============================================================================
-- Migration: Create Indexes
-- =============================================================================
-- B-tree indexes on all foreign key columns, composite indexes for
-- geographic hierarchy traversal, GIN index on JSONB, and indexes on
-- estado and tenant_id columns for filtering performance.
--
-- PostgreSQL automatically creates indexes for PRIMARY KEY and UNIQUE
-- constraints, so those are not duplicated here.
--
-- Rollback: DROP INDEX IF EXISTS <index_name>; for each index below.
-- =============================================================================

-- ===========================================================================
-- GEOGRAPHIC TABLES: Foreign Key Indexes
-- ===========================================================================

-- municipios
CREATE INDEX idx_municipios_provincia_id ON municipios(provincia_id);
CREATE INDEX idx_municipios_tenant_id ON municipios(tenant_id);
CREATE INDEX idx_municipios_estado ON municipios(estado);

-- circunscripciones
CREATE INDEX idx_circunscripciones_municipio_id ON circunscripciones(municipio_id);
CREATE INDEX idx_circunscripciones_tenant_id ON circunscripciones(tenant_id);
CREATE INDEX idx_circunscripciones_estado ON circunscripciones(estado);

-- sectores
CREATE INDEX idx_sectores_circunscripcion_id ON sectores(circunscripcion_id);
CREATE INDEX idx_sectores_tenant_id ON sectores(tenant_id);
CREATE INDEX idx_sectores_estado ON sectores(estado);

-- comites
CREATE INDEX idx_comites_sector_id ON comites(sector_id);
CREATE INDEX idx_comites_tenant_id ON comites(tenant_id);
CREATE INDEX idx_comites_estado ON comites(estado);

-- niveles_intermedios
CREATE INDEX idx_niveles_intermedios_comite_id ON niveles_intermedios(comite_id);
CREATE INDEX idx_niveles_intermedios_tenant_id ON niveles_intermedios(tenant_id);
CREATE INDEX idx_niveles_intermedios_estado ON niveles_intermedios(estado);

-- provincias (no FK, but tenant_id and estado)
CREATE INDEX idx_provincias_tenant_id ON provincias(tenant_id);
CREATE INDEX idx_provincias_estado ON provincias(estado);

-- ===========================================================================
-- MEMBER TABLE: Foreign Key, Search, and JSONB Indexes
-- ===========================================================================

CREATE INDEX idx_miembros_coordinador_id ON miembros(coordinador_id);
CREATE INDEX idx_miembros_sector_id ON miembros(sector_id);
CREATE INDEX idx_miembros_comite_id ON miembros(comite_id);
CREATE INDEX idx_miembros_nivel_intermedio_id ON miembros(nivel_intermedio_id);
CREATE INDEX idx_miembros_recinto_id ON miembros(recinto_id);
CREATE INDEX idx_miembros_tipo_miembro ON miembros(tipo_miembro);
CREATE INDEX idx_miembros_tenant_id ON miembros(tenant_id);
CREATE INDEX idx_miembros_estado ON miembros(estado);

-- GIN index for JSONB queries on social media data
CREATE INDEX idx_miembros_redes_sociales ON miembros USING GIN (redes_sociales);

-- Composite index for geographic hierarchy member lookups
-- Covers queries like "all members in sector X who are active"
CREATE INDEX idx_miembros_sector_estado ON miembros(sector_id, estado);
CREATE INDEX idx_miembros_comite_estado ON miembros(comite_id, estado);

-- ===========================================================================
-- ELECTORAL TABLES: Foreign Key Indexes
-- ===========================================================================

-- partidos
CREATE INDEX idx_partidos_tenant_id ON partidos(tenant_id);
CREATE INDEX idx_partidos_estado ON partidos(estado);

-- cargos
CREATE INDEX idx_cargos_tenant_id ON cargos(tenant_id);
CREATE INDEX idx_cargos_estado ON cargos(estado);

-- candidatos
CREATE INDEX idx_candidatos_miembro_id ON candidatos(miembro_id);
CREATE INDEX idx_candidatos_partido_id ON candidatos(partido_id);
CREATE INDEX idx_candidatos_cargo_id ON candidatos(cargo_id);
CREATE INDEX idx_candidatos_periodo_electoral ON candidatos(periodo_electoral);
CREATE INDEX idx_candidatos_tenant_id ON candidatos(tenant_id);
CREATE INDEX idx_candidatos_estado ON candidatos(estado);

-- recintos
CREATE INDEX idx_recintos_municipio_id ON recintos(municipio_id);
CREATE INDEX idx_recintos_circunscripcion_id ON recintos(circunscripcion_id);
CREATE INDEX idx_recintos_tenant_id ON recintos(tenant_id);
CREATE INDEX idx_recintos_estado ON recintos(estado);

-- votaciones
CREATE INDEX idx_votaciones_recinto_id ON votaciones(recinto_id);
CREATE INDEX idx_votaciones_usuario_id ON votaciones(usuario_id);
CREATE INDEX idx_votaciones_periodo_electoral ON votaciones(periodo_electoral);
CREATE INDEX idx_votaciones_fecha ON votaciones(fecha);
CREATE INDEX idx_votaciones_tenant_id ON votaciones(tenant_id);
CREATE INDEX idx_votaciones_estado ON votaciones(estado);

-- Composite index for vote queries by recinto and period
CREATE INDEX idx_votaciones_recinto_periodo ON votaciones(recinto_id, periodo_electoral);

-- candidato_votos
CREATE INDEX idx_candidato_votos_votacion_id ON candidato_votos(votacion_id);
CREATE INDEX idx_candidato_votos_candidato_id ON candidato_votos(candidato_id);
CREATE INDEX idx_candidato_votos_tenant_id ON candidato_votos(tenant_id);

-- ===========================================================================
-- USER AND OPERATIONS TABLES: Foreign Key Indexes
-- ===========================================================================

-- usuarios
CREATE INDEX idx_usuarios_auth_user_id ON usuarios(auth_user_id);
CREATE INDEX idx_usuarios_provincia_id ON usuarios(provincia_id);
CREATE INDEX idx_usuarios_municipio_id ON usuarios(municipio_id);
CREATE INDEX idx_usuarios_circunscripcion_id ON usuarios(circunscripcion_id);
CREATE INDEX idx_usuarios_role ON usuarios(role);
CREATE INDEX idx_usuarios_tenant_id ON usuarios(tenant_id);
CREATE INDEX idx_usuarios_estado ON usuarios(estado);

-- asignacion_recintos
CREATE INDEX idx_asignacion_recintos_usuario_id ON asignacion_recintos(usuario_id);
CREATE INDEX idx_asignacion_recintos_recinto_id ON asignacion_recintos(recinto_id);
CREATE INDEX idx_asignacion_recintos_periodo ON asignacion_recintos(periodo_electoral);
CREATE INDEX idx_asignacion_recintos_tenant_id ON asignacion_recintos(tenant_id);
CREATE INDEX idx_asignacion_recintos_estado ON asignacion_recintos(estado);

-- seguimiento_no_inscritos
CREATE INDEX idx_seguimiento_sector_id ON seguimiento_no_inscritos(sector_id);
CREATE INDEX idx_seguimiento_responsable_id ON seguimiento_no_inscritos(responsable_id);
CREATE INDEX idx_seguimiento_estado_seguimiento ON seguimiento_no_inscritos(estado_seguimiento);
CREATE INDEX idx_seguimiento_tenant_id ON seguimiento_no_inscritos(tenant_id);

-- cronogramas
CREATE INDEX idx_cronogramas_nivel_geografico ON cronogramas(nivel_geografico);
CREATE INDEX idx_cronogramas_periodo_electoral ON cronogramas(periodo_electoral);
CREATE INDEX idx_cronogramas_fecha_inicio ON cronogramas(fecha_inicio);
CREATE INDEX idx_cronogramas_tenant_id ON cronogramas(tenant_id);
CREATE INDEX idx_cronogramas_estado ON cronogramas(estado);
