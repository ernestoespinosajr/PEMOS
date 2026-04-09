export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      asignacion_recintos: {
        Row: {
          created_at: string
          estado: boolean
          id: string
          periodo_electoral: string | null
          recinto_id: string
          tenant_id: string | null
          updated_at: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          estado?: boolean
          id?: string
          periodo_electoral?: string | null
          recinto_id: string
          tenant_id?: string | null
          updated_at?: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          estado?: boolean
          id?: string
          periodo_electoral?: string | null
          recinto_id?: string
          tenant_id?: string | null
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asignacion_recintos_recinto_id_fkey"
            columns: ["recinto_id"]
            isOneToOne: false
            referencedRelation: "mv_vote_totals_by_recinto"
            referencedColumns: ["recinto_id"]
          },
          {
            foreignKeyName: "asignacion_recintos_recinto_id_fkey"
            columns: ["recinto_id"]
            isOneToOne: false
            referencedRelation: "recintos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignacion_recintos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      candidato_votos: {
        Row: {
          candidato_id: string
          created_at: string
          id: string
          tenant_id: string | null
          updated_at: string
          votacion_id: string
          votos: number
        }
        Insert: {
          candidato_id: string
          created_at?: string
          id?: string
          tenant_id?: string | null
          updated_at?: string
          votacion_id: string
          votos?: number
        }
        Update: {
          candidato_id?: string
          created_at?: string
          id?: string
          tenant_id?: string | null
          updated_at?: string
          votacion_id?: string
          votos?: number
        }
        Relationships: [
          {
            foreignKeyName: "candidato_votos_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidato_votos_votacion_id_fkey"
            columns: ["votacion_id"]
            isOneToOne: false
            referencedRelation: "votaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      candidatos: {
        Row: {
          cargo_id: string
          created_at: string
          estado: boolean
          id: string
          miembro_id: string
          partido_id: string
          periodo_electoral: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          cargo_id: string
          created_at?: string
          estado?: boolean
          id?: string
          miembro_id: string
          partido_id: string
          periodo_electoral?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          cargo_id?: string
          created_at?: string
          estado?: boolean
          id?: string
          miembro_id?: string
          partido_id?: string
          periodo_electoral?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidatos_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidatos_miembro_id_fkey"
            columns: ["miembro_id"]
            isOneToOne: false
            referencedRelation: "miembros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidatos_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "mv_vote_totals_by_partido"
            referencedColumns: ["partido_id"]
          },
          {
            foreignKeyName: "candidatos_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "partidos"
            referencedColumns: ["id"]
          },
        ]
      }
      cargos: {
        Row: {
          created_at: string
          descripcion: string | null
          estado: boolean
          id: string
          nivel: string | null
          nombre: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          estado?: boolean
          id?: string
          nivel?: string | null
          nombre: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          estado?: boolean
          id?: string
          nivel?: string | null
          nombre?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      circunscripciones: {
        Row: {
          created_at: string
          estado: boolean
          id: string
          municipio_id: string
          nombre: string
          numero: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          estado?: boolean
          id?: string
          municipio_id: string
          nombre: string
          numero: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          estado?: boolean
          id?: string
          municipio_id?: string
          nombre?: string
          numero?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "circunscripciones_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "municipios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circunscripciones_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "mv_member_count_by_municipio"
            referencedColumns: ["municipio_id"]
          },
        ]
      }
      comites: {
        Row: {
          codigo: string
          created_at: string
          estado: boolean
          id: string
          nombre: string
          sector_id: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          estado?: boolean
          id?: string
          nombre: string
          sector_id: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          estado?: boolean
          id?: string
          nombre?: string
          sector_id?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comites_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectores"
            referencedColumns: ["id"]
          },
        ]
      }
      cronogramas: {
        Row: {
          created_at: string
          descripcion: string | null
          estado: boolean
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          nivel_geografico: string | null
          nivel_id: string | null
          periodo_electoral: string | null
          tenant_id: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          estado?: boolean
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nivel_geografico?: string | null
          nivel_id?: string | null
          periodo_electoral?: string | null
          tenant_id?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          estado?: boolean
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nivel_geografico?: string | null
          nivel_id?: string | null
          periodo_electoral?: string | null
          tenant_id?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      miembros: {
        Row: {
          apellido: string
          cedula: string
          celular: string | null
          comite_id: string | null
          coordinador_id: string | null
          created_at: string
          direccion: string | null
          email: string | null
          estado: boolean
          fecha_nacimiento: string | null
          foto_url: string | null
          id: string
          nivel_intermedio_id: string | null
          nombre: string
          ocupacion: string | null
          recinto_id: string | null
          redes_sociales: Json
          sector_id: string | null
          sexo: string | null
          telefono: string | null
          tenant_id: string | null
          tipo_miembro: Database["public"]["Enums"]["tipo_miembro"]
          updated_at: string
        }
        Insert: {
          apellido: string
          cedula: string
          celular?: string | null
          comite_id?: string | null
          coordinador_id?: string | null
          created_at?: string
          direccion?: string | null
          email?: string | null
          estado?: boolean
          fecha_nacimiento?: string | null
          foto_url?: string | null
          id?: string
          nivel_intermedio_id?: string | null
          nombre: string
          ocupacion?: string | null
          recinto_id?: string | null
          redes_sociales?: Json
          sector_id?: string | null
          sexo?: string | null
          telefono?: string | null
          tenant_id?: string | null
          tipo_miembro: Database["public"]["Enums"]["tipo_miembro"]
          updated_at?: string
        }
        Update: {
          apellido?: string
          cedula?: string
          celular?: string | null
          comite_id?: string | null
          coordinador_id?: string | null
          created_at?: string
          direccion?: string | null
          email?: string | null
          estado?: boolean
          fecha_nacimiento?: string | null
          foto_url?: string | null
          id?: string
          nivel_intermedio_id?: string | null
          nombre?: string
          ocupacion?: string | null
          recinto_id?: string | null
          redes_sociales?: Json
          sector_id?: string | null
          sexo?: string | null
          telefono?: string | null
          tenant_id?: string | null
          tipo_miembro?: Database["public"]["Enums"]["tipo_miembro"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_miembros_recinto"
            columns: ["recinto_id"]
            isOneToOne: false
            referencedRelation: "mv_vote_totals_by_recinto"
            referencedColumns: ["recinto_id"]
          },
          {
            foreignKeyName: "fk_miembros_recinto"
            columns: ["recinto_id"]
            isOneToOne: false
            referencedRelation: "recintos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "miembros_comite_id_fkey"
            columns: ["comite_id"]
            isOneToOne: false
            referencedRelation: "comites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "miembros_coordinador_id_fkey"
            columns: ["coordinador_id"]
            isOneToOne: false
            referencedRelation: "miembros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "miembros_nivel_intermedio_id_fkey"
            columns: ["nivel_intermedio_id"]
            isOneToOne: false
            referencedRelation: "niveles_intermedios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "miembros_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectores"
            referencedColumns: ["id"]
          },
        ]
      }
      municipios: {
        Row: {
          codigo: string
          created_at: string
          estado: boolean
          id: string
          nombre: string
          provincia_id: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          estado?: boolean
          id?: string
          nombre: string
          provincia_id: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          estado?: boolean
          id?: string
          nombre?: string
          provincia_id?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "municipios_provincia_id_fkey"
            columns: ["provincia_id"]
            isOneToOne: false
            referencedRelation: "mv_member_count_by_provincia"
            referencedColumns: ["provincia_id"]
          },
          {
            foreignKeyName: "municipios_provincia_id_fkey"
            columns: ["provincia_id"]
            isOneToOne: false
            referencedRelation: "provincias"
            referencedColumns: ["id"]
          },
        ]
      }
      niveles_intermedios: {
        Row: {
          codigo: string
          comite_id: string
          created_at: string
          estado: boolean
          id: string
          nombre: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          codigo: string
          comite_id: string
          created_at?: string
          estado?: boolean
          id?: string
          nombre: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          codigo?: string
          comite_id?: string
          created_at?: string
          estado?: boolean
          id?: string
          nombre?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "niveles_intermedios_comite_id_fkey"
            columns: ["comite_id"]
            isOneToOne: false
            referencedRelation: "comites"
            referencedColumns: ["id"]
          },
        ]
      }
      partidos: {
        Row: {
          color: string | null
          created_at: string
          estado: boolean
          id: string
          logo_url: string | null
          nombre: string
          siglas: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          estado?: boolean
          id?: string
          logo_url?: string | null
          nombre: string
          siglas: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          estado?: boolean
          id?: string
          logo_url?: string | null
          nombre?: string
          siglas?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      provincias: {
        Row: {
          codigo: string
          created_at: string
          estado: boolean
          id: string
          nombre: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          estado?: boolean
          id?: string
          nombre: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          estado?: boolean
          id?: string
          nombre?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recintos: {
        Row: {
          circunscripcion_id: string | null
          codigo: string
          created_at: string
          direccion: string | null
          estado: boolean
          id: string
          municipio_id: string
          nombre: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          circunscripcion_id?: string | null
          codigo: string
          created_at?: string
          direccion?: string | null
          estado?: boolean
          id?: string
          municipio_id: string
          nombre: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          circunscripcion_id?: string | null
          codigo?: string
          created_at?: string
          direccion?: string | null
          estado?: boolean
          id?: string
          municipio_id?: string
          nombre?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recintos_circunscripcion_id_fkey"
            columns: ["circunscripcion_id"]
            isOneToOne: false
            referencedRelation: "circunscripciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recintos_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "municipios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recintos_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "mv_member_count_by_municipio"
            referencedColumns: ["municipio_id"]
          },
        ]
      }
      sectores: {
        Row: {
          circunscripcion_id: string
          codigo: string
          created_at: string
          estado: boolean
          id: string
          nombre: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          circunscripcion_id: string
          codigo: string
          created_at?: string
          estado?: boolean
          id?: string
          nombre: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          circunscripcion_id?: string
          codigo?: string
          created_at?: string
          estado?: boolean
          id?: string
          nombre?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sectores_circunscripcion_id_fkey"
            columns: ["circunscripcion_id"]
            isOneToOne: false
            referencedRelation: "circunscripciones"
            referencedColumns: ["id"]
          },
        ]
      }
      seguimiento_no_inscritos: {
        Row: {
          apellido: string
          cedula: string
          created_at: string
          estado_seguimiento: Database["public"]["Enums"]["estado_seguimiento"]
          id: string
          nombre: string
          notas: string | null
          responsable_id: string | null
          sector_id: string | null
          telefono: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          apellido: string
          cedula: string
          created_at?: string
          estado_seguimiento?: Database["public"]["Enums"]["estado_seguimiento"]
          id?: string
          nombre: string
          notas?: string | null
          responsable_id?: string | null
          sector_id?: string | null
          telefono?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          apellido?: string
          cedula?: string
          created_at?: string
          estado_seguimiento?: Database["public"]["Enums"]["estado_seguimiento"]
          id?: string
          nombre?: string
          notas?: string | null
          responsable_id?: string | null
          sector_id?: string | null
          telefono?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seguimiento_no_inscritos_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seguimiento_no_inscritos_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectores"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          apellido: string
          auth_user_id: string | null
          circunscripcion_id: string | null
          created_at: string
          email: string
          estado: boolean
          id: string
          municipio_id: string | null
          nombre: string
          provincia_id: string | null
          role: Database["public"]["Enums"]["role_usuario"]
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          apellido: string
          auth_user_id?: string | null
          circunscripcion_id?: string | null
          created_at?: string
          email: string
          estado?: boolean
          id?: string
          municipio_id?: string | null
          nombre: string
          provincia_id?: string | null
          role?: Database["public"]["Enums"]["role_usuario"]
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          apellido?: string
          auth_user_id?: string | null
          circunscripcion_id?: string | null
          created_at?: string
          email?: string
          estado?: boolean
          id?: string
          municipio_id?: string | null
          nombre?: string
          provincia_id?: string | null
          role?: Database["public"]["Enums"]["role_usuario"]
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_circunscripcion_id_fkey"
            columns: ["circunscripcion_id"]
            isOneToOne: false
            referencedRelation: "circunscripciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "municipios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "mv_member_count_by_municipio"
            referencedColumns: ["municipio_id"]
          },
          {
            foreignKeyName: "usuarios_provincia_id_fkey"
            columns: ["provincia_id"]
            isOneToOne: false
            referencedRelation: "mv_member_count_by_provincia"
            referencedColumns: ["provincia_id"]
          },
          {
            foreignKeyName: "usuarios_provincia_id_fkey"
            columns: ["provincia_id"]
            isOneToOne: false
            referencedRelation: "provincias"
            referencedColumns: ["id"]
          },
        ]
      }
      votaciones: {
        Row: {
          acta_url: string | null
          created_at: string
          estado: boolean
          fecha: string | null
          id: string
          observaciones: string | null
          opcion_01: number
          opcion_02: number
          opcion_03: number
          periodo_electoral: string | null
          recinto_id: string
          tenant_id: string | null
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          acta_url?: string | null
          created_at?: string
          estado?: boolean
          fecha?: string | null
          id?: string
          observaciones?: string | null
          opcion_01?: number
          opcion_02?: number
          opcion_03?: number
          periodo_electoral?: string | null
          recinto_id: string
          tenant_id?: string | null
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          acta_url?: string | null
          created_at?: string
          estado?: boolean
          fecha?: string | null
          id?: string
          observaciones?: string | null
          opcion_01?: number
          opcion_02?: number
          opcion_03?: number
          periodo_electoral?: string | null
          recinto_id?: string
          tenant_id?: string | null
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_votaciones_usuario"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votaciones_recinto_id_fkey"
            columns: ["recinto_id"]
            isOneToOne: false
            referencedRelation: "mv_vote_totals_by_recinto"
            referencedColumns: ["recinto_id"]
          },
          {
            foreignKeyName: "votaciones_recinto_id_fkey"
            columns: ["recinto_id"]
            isOneToOne: false
            referencedRelation: "recintos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      mv_member_count_by_municipio: {
        Row: {
          coordinadores: number | null
          multiplicadores: number | null
          municipio_codigo: string | null
          municipio_id: string | null
          municipio_nombre: string | null
          provincia_id: string | null
          provincia_nombre: string | null
          relacionados: number | null
          tenant_id: string | null
          total_miembros: number | null
        }
        Relationships: [
          {
            foreignKeyName: "municipios_provincia_id_fkey"
            columns: ["provincia_id"]
            isOneToOne: false
            referencedRelation: "mv_member_count_by_provincia"
            referencedColumns: ["provincia_id"]
          },
          {
            foreignKeyName: "municipios_provincia_id_fkey"
            columns: ["provincia_id"]
            isOneToOne: false
            referencedRelation: "provincias"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_member_count_by_provincia: {
        Row: {
          coordinadores: number | null
          multiplicadores: number | null
          provincia_codigo: string | null
          provincia_id: string | null
          provincia_nombre: string | null
          relacionados: number | null
          tenant_id: string | null
          total_miembros: number | null
        }
        Relationships: []
      }
      mv_vote_totals_by_partido: {
        Row: {
          partido_color: string | null
          partido_id: string | null
          partido_nombre: string | null
          partido_siglas: string | null
          periodo_electoral: string | null
          recintos_reportados: number | null
          tenant_id: string | null
          total_votos: number | null
        }
        Relationships: []
      }
      mv_vote_totals_by_recinto: {
        Row: {
          municipio_id: string | null
          municipio_nombre: string | null
          periodo_electoral: string | null
          recinto_codigo: string | null
          recinto_id: string | null
          recinto_nombre: string | null
          registros_votacion: number | null
          tenant_id: string | null
          total_opcion_01: number | null
          total_opcion_02: number | null
          total_opcion_03: number | null
          total_votos: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recintos_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "municipios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recintos_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "mv_member_count_by_municipio"
            referencedColumns: ["municipio_id"]
          },
        ]
      }
    }
    Functions: {
      refresh_materialized_views: { Args: never; Returns: undefined }
    }
    Enums: {
      estado_seguimiento:
        | "pendiente"
        | "contactado"
        | "registrado"
        | "no_interesado"
      role_usuario: "admin" | "coordinator" | "observer" | "field_worker"
      tipo_miembro: "coordinador" | "multiplicador" | "relacionado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      estado_seguimiento: [
        "pendiente",
        "contactado",
        "registrado",
        "no_interesado",
      ],
      role_usuario: ["admin", "coordinator", "observer", "field_worker"],
      tipo_miembro: ["coordinador", "multiplicador", "relacionado"],
    },
  },
} as const
