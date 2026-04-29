export interface EquipoEnlaceItem {
  nombre: string;
  email?: string;
  telefono?: string;
}

export interface Movimiento {
  id: string;
  tenant_id: string;
  nombre: string;
  siglas: string | null;
  tipo_estructura: string;
  fecha_fundacion: string | null;
  ambito_accion: string[] | null;
  descripcion: string | null;
  ejes_trabajo: string[] | null;
  provincias_operacion: string[] | null;
  municipios_operacion: string[] | null;
  redes_sociales: Record<string, string> | null;
  logo_url: string | null;
  representante_nombre: string | null;
  representante_cedula: string | null;
  representante_cargo: string | null;
  representante_telefono: string | null;
  representante_email: string | null;
  representante_provincia_id: string | null;
  representante_municipio_id: string | null;
  representante_direccion: string | null;
  equipo_enlace: EquipoEnlaceItem[] | null;
  cantidad_miembros_estimada: string | null;
  estructura_territorial: string[] | null;
  zonas_comunidades: string | null;
  experiencia_previa: string | null;
  estado: boolean;
  created_at: string;
  updated_at: string;
}

export type MovimientoFormData = Omit<
  Movimiento,
  'id' | 'tenant_id' | 'created_at' | 'updated_at'
>;
