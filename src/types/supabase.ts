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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      actas: {
        Row: {
          colegio_id: string
          created_at: string
          estado: boolean
          id: string
          numero_acta: string | null
          observaciones: string | null
          partido_id: string
          periodo_id: string
          recinto_id: string
          registrado_por: string
          tenant_id: string | null
          votos_data: Json
        }
        Insert: {
          colegio_id: string
          created_at?: string
          estado?: boolean
          id?: string
          numero_acta?: string | null
          observaciones?: string | null
          partido_id: string
          periodo_id: string
          recinto_id: string
          registrado_por: string
          tenant_id?: string | null
          votos_data: Json
        }
        Update: {
          colegio_id?: string
          created_at?: string
          estado?: boolean
          id?: string
          numero_acta?: string | null
          observaciones?: string | null
          partido_id?: string
          periodo_id?: string
          recinto_id?: string
          registrado_por?: string
          tenant_id?: string | null
          votos_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "actas_colegio_id_fkey"
            columns: ["colegio_id"]
            isOneToOne: false
            referencedRelation: "colegios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actas_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "mv_vote_totals_by_partido"
            referencedColumns: ["partido_id"]
          },
          {
            foreignKeyName: "actas_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "partidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actas_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "periodos_electorales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actas_recinto_id_fkey"
            columns: ["recinto_id"]
            isOneToOne: false
            referencedRelation: "mv_turnout_por_recinto"
            referencedColumns: ["recinto_id"]
          },
          {
            foreignKeyName: "actas_recinto_id_fkey"
            columns: ["recinto_id"]
            isOneToOne: false
            referencedRelation: "mv_vote_totals_by_recinto"
            referencedColumns: ["recinto_id"]
          },
          {
            foreignKeyName: "actas_recinto_id_fkey"
            columns: ["recinto_id"]
            isOneToOne: false
            referencedRelation: "recintos"
            referencedColumns: ["id"]
          },
        ]
      }
      asignacion_recintos: {
        Row: {
          colegio_id: string | null
          created_at: string
          estado: boolean
          id: string
          partido_id: string
          periodo_id: string
          recinto_id: string
          tenant_id: string | null
          updated_at: string
          usuario_id: string
        }
        Insert: {
          colegio_id?: string | null
          created_at?: string
          estado?: boolean
          id?: string
          partido_id: string
          periodo_id: string
          recinto_id: string
          tenant_id?: string | null
          updated_at?: string
          usuario_id: string
        }
        Update: {
          colegio_id?: string | null
          created_at?: string
          estado?: boolean
          id?: string
          partido_id?: string
          periodo_id?: string
          recinto_id?: string
          tenant_id?: string | null
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asignacion_recintos_colegio_id_fkey"
            columns: ["colegio_id"]
            isOneToOne: false
            referencedRelation: "colegios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignacion_recintos_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "mv_vote_totals_by_partido"
            referencedColumns: ["partido_id"]
          },
          {
            foreignKeyName: "asignacion_recintos_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "partidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignacion_recintos_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "periodos_electorales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignacion_recintos_recinto_id_fkey"
            columns: ["recinto_id"]
            isOneToOne: false
            referencedRelation: "mv_turnout_por_recinto"
            referencedColumns: ["recinto_id"]
          },
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
        ]
      }
      auth_audit_log: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_address: unknown
          metadata: Json
          tenant_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      candidato_votos: {
        Row: {
          candidato_id: string
          colegio_id: string
          created_at: string
          estado: boolean
          id: string
          partido_id: string
          periodo_id: string
          recinto_id: string
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
          votos: number
        }
        Insert: {
          candidato_id: string
          colegio_id: string
          created_at?: string
          estado?: boolean
          id?: string
          partido_id: string
          periodo_id: string
          recinto_id: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          votos?: number
        }
        Update: {
          candidato_id?: string
          colegio_id?: string
          created_at?: string
          estado?: boolean
          id?: string
          partido_id?: string
          periodo_id?: string
          recinto_id?: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
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
            foreignKeyName: "candidato_votos_colegio_id_fkey"
            columns: ["colegio_id"]
            isOneToOne: false
            referencedRelation: "colegios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidato_votos_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "mv_vote_totals_by_partido"
            referencedColumns: ["partido_id"]
          },
          {
            foreignKeyName: "candidato_votos_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "partidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidato_votos_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "periodos_electorales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidato_votos_recinto_id_fkey"
            columns: ["recinto_id"]
            isOneToOne: false
            referencedRelation: "mv_turnout_por_recinto"
            referencedColumns: ["recinto_id"]
          },
          {
            foreignKeyName: "candidato_votos_recinto_id_fkey"
            columns: ["recinto_id"]
            isOneToOne: false
            referencedRelation: "mv_vote_totals_by_recinto"
            referencedColumns: ["recinto_id"]
          },
          {
            foreignKeyName: "candidato_votos_recinto_id_fkey"
            columns: ["recinto_id"]
            isOneToOne: false
            referencedRelation: "recintos"
            referencedColumns: ["id"]
          },
        ]
      }
      candidatos: {
        Row: {
          cargo_id: string | null
          created_at: string
          estado: boolean
          id: string
          miembro_id: string | null
          nombre: string | null
          orden: number | null
          partido_id: string
          periodo_electoral: string | null
          periodo_id: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          cargo_id?: string | null
          created_at?: string
          estado?: boolean
          id?: string
          miembro_id?: string | null
          nombre?: string | null
          orden?: number | null
          partido_id: string
          periodo_electoral?: string | null
          periodo_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          cargo_id?: string | null
          created_at?: string
          estado?: boolean
          id?: string
          miembro_id?: string | null
          nombre?: string | null
          orden?: number | null
          partido_id?: string
          periodo_electoral?: string | null
          periodo_id?: string | null
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
          {
            foreignKeyName: "candidatos_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "periodos_electorales"
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
      colegios: {
        Row: {
          cod_colegio: string
          created_at: string
          estado: boolean
          id: string
          nombre: string | null
          partido_id: string
          recinto_id: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          cod_colegio: string
          created_at?: string
          estado?: boolean
          id?: string
          nombre?: string | null
          partido_id: string
          recinto_id: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          cod_colegio?: string
          created_at?: string
          estado?: boolean
          id?: string
          nombre?: string | null
          partido_id?: string
          recinto_id?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "colegios_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "mv_vote_totals_by_partido"
            referencedColumns: ["partido_id"]
          },
          {
            foreignKeyName: "colegios_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "partidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colegios_recinto_id_fkey"
            columns: ["recinto_id"]
            isOneToOne: false
            referencedRelation: "mv_turnout_por_recinto"
            referencedColumns: ["recinto_id"]
          },
          {
            foreignKeyName: "colegios_recinto_id_fkey"
            columns: ["recinto_id"]
            isOneToOne: false
            referencedRelation: "mv_vote_totals_by_recinto"
            referencedColumns: ["recinto_id"]
          },
          {
            foreignKeyName: "colegios_recinto_id_fkey"
            columns: ["recinto_id"]
            isOneToOne: false
            referencedRelation: "recintos"
            referencedColumns: ["id"]
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
            referencedRelation: "mv_member_count_by_sector"
            referencedColumns: ["sector_id"]
          },
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
          apodo: string | null
          cedula: string
          celular: string | null
          colegio: string | null
          colegio_ubicacion: string | null
          comite_id: string | null
          coordinador_id: string | null
          created_at: string
          created_by: string | null
          direccion: string | null
          direccion_actual: string | null
          email: string | null
          estado: boolean
          fecha_nacimiento: string | null
          foto_url: string | null
          id: string
          movimiento_id: string | null
          nivel_intermedio_id: string | null
          nombre: string
          ocupacion: string | null
          recinto_id: string | null
          redes_sociales: Json
          sector_actual: string | null
          sector_id: string | null
          sexo: string | null
          telefono: string | null
          telefono_residencia: string | null
          tenant_id: string | null
          tipo_miembro: Database["public"]["Enums"]["tipo_miembro"]
          tipo_movimiento: string | null
          trabajo: string | null
          updated_at: string
          vinculado: boolean | null
          votacion: boolean | null
        }
        Insert: {
          apellido: string
          apodo?: string | null
          cedula: string
          celular?: string | null
          colegio?: string | null
          colegio_ubicacion?: string | null
          comite_id?: string | null
          coordinador_id?: string | null
          created_at?: string
          created_by?: string | null
          direccion?: string | null
          direccion_actual?: string | null
          email?: string | null
          estado?: boolean
          fecha_nacimiento?: string | null
          foto_url?: string | null
          id?: string
          movimiento_id?: string | null
          nivel_intermedio_id?: string | null
          nombre: string
          ocupacion?: string | null
          recinto_id?: string | null
          redes_sociales?: Json
          sector_actual?: string | null
          sector_id?: string | null
          sexo?: string | null
          telefono?: string | null
          telefono_residencia?: string | null
          tenant_id?: string | null
          tipo_miembro: Database["public"]["Enums"]["tipo_miembro"]
          tipo_movimiento?: string | null
          trabajo?: string | null
          updated_at?: string
          vinculado?: boolean | null
          votacion?: boolean | null
        }
        Update: {
          apellido?: string
          apodo?: string | null
          cedula?: string
          celular?: string | null
          colegio?: string | null
          colegio_ubicacion?: string | null
          comite_id?: string | null
          coordinador_id?: string | null
          created_at?: string
          created_by?: string | null
          direccion?: string | null
          direccion_actual?: string | null
          email?: string | null
          estado?: boolean
          fecha_nacimiento?: string | null
          foto_url?: string | null
          id?: string
          movimiento_id?: string | null
          nivel_intermedio_id?: string | null
          nombre?: string
          ocupacion?: string | null
          recinto_id?: string | null
          redes_sociales?: Json
          sector_actual?: string | null
          sector_id?: string | null
          sexo?: string | null
          telefono?: string | null
          telefono_residencia?: string | null
          tenant_id?: string | null
          tipo_miembro?: Database["public"]["Enums"]["tipo_miembro"]
          tipo_movimiento?: string | null
          trabajo?: string | null
          updated_at?: string
          vinculado?: boolean | null
          votacion?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_miembros_recinto"
            columns: ["recinto_id"]
            isOneToOne: false
            referencedRelation: "mv_turnout_por_recinto"
            referencedColumns: ["recinto_id"]
          },
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
            foreignKeyName: "miembros_comite_id_fkey"
            columns: ["comite_id"]
            isOneToOne: false
            referencedRelation: "mv_member_count_by_comite"
            referencedColumns: ["comite_id"]
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
            referencedRelation: "mv_member_count_by_sector"
            referencedColumns: ["sector_id"]
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
      miembros_audit: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          id: string
          miembro_id: string
          new_data: Json | null
          old_data: Json | null
          tenant_id: string | null
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          id?: string
          miembro_id: string
          new_data?: Json | null
          old_data?: Json | null
          tenant_id?: string | null
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          miembro_id?: string
          new_data?: Json | null
          old_data?: Json | null
          tenant_id?: string | null
        }
        Relationships: []
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
          {
            foreignKeyName: "niveles_intermedios_comite_id_fkey"
            columns: ["comite_id"]
            isOneToOne: false
            referencedRelation: "mv_member_count_by_comite"
            referencedColumns: ["comite_id"]
          },
        ]
      }
      padron_externo: {
        Row: {
          apellidos: string | null
          cedula: string
          cod_comite_intermedio: string | null
          cod_recinto: string | null
          colegio: string | null
          comite_de_base: string | null
          comite_intermedio: string | null
          created_at: string
          direccion_recinto: string | null
          direccion_residencia: string | null
          edad: number | null
          id: string
          nombre_recinto: string | null
          nombres: string | null
          partido_id: string
          sector_residencia: string | null
          sexo: string | null
          telefonos: string | null
          telefonos_alt: string | null
        }
        Insert: {
          apellidos?: string | null
          cedula: string
          cod_comite_intermedio?: string | null
          cod_recinto?: string | null
          colegio?: string | null
          comite_de_base?: string | null
          comite_intermedio?: string | null
          created_at?: string
          direccion_recinto?: string | null
          direccion_residencia?: string | null
          edad?: number | null
          id?: string
          nombre_recinto?: string | null
          nombres?: string | null
          partido_id: string
          sector_residencia?: string | null
          sexo?: string | null
          telefonos?: string | null
          telefonos_alt?: string | null
        }
        Update: {
          apellidos?: string | null
          cedula?: string
          cod_comite_intermedio?: string | null
          cod_recinto?: string | null
          colegio?: string | null
          comite_de_base?: string | null
          comite_intermedio?: string | null
          created_at?: string
          direccion_recinto?: string | null
          direccion_residencia?: string | null
          edad?: number | null
          id?: string
          nombre_recinto?: string | null
          nombres?: string | null
          partido_id?: string
          sector_residencia?: string | null
          sexo?: string | null
          telefonos?: string | null
          telefonos_alt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "padron_externo_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "mv_vote_totals_by_partido"
            referencedColumns: ["partido_id"]
          },
          {
            foreignKeyName: "padron_externo_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "partidos"
            referencedColumns: ["id"]
          },
        ]
      }
      partido_votos: {
        Row: {
          candidato_1_votos: number
          candidato_2_votos: number
          candidato_3_votos: number
          candidato_4_votos: number
          candidato_5_votos: number
          candidato_6_votos: number
          colegio_id: string
          created_at: string
          estado: boolean
          id: string
          partido_id: string
          partido_ref_id: number
          periodo_id: string
          recinto_id: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          candidato_1_votos?: number
          candidato_2_votos?: number
          candidato_3_votos?: number
          candidato_4_votos?: number
          candidato_5_votos?: number
          candidato_6_votos?: number
          colegio_id: string
          created_at?: string
          estado?: boolean
          id?: string
          partido_id: string
          partido_ref_id: number
          periodo_id: string
          recinto_id: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          candidato_1_votos?: number
          candidato_2_votos?: number
          candidato_3_votos?: number
          candidato_4_votos?: number
          candidato_5_votos?: number
          candidato_6_votos?: number
          colegio_id?: string
          created_at?: string
          estado?: boolean
          id?: string
          partido_id?: string
          partido_ref_id?: number
          periodo_id?: string
          recinto_id?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partido_votos_colegio_id_fkey"
            columns: ["colegio_id"]
            isOneToOne: false
            referencedRelation: "colegios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partido_votos_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "mv_vote_totals_by_partido"
            referencedColumns: ["partido_id"]
          },
          {
            foreignKeyName: "partido_votos_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "partidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partido_votos_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "periodos_electorales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partido_votos_recinto_id_fkey"
            columns: ["recinto_id"]
            isOneToOne: false
            referencedRelation: "mv_turnout_por_recinto"
            referencedColumns: ["recinto_id"]
          },
          {
            foreignKeyName: "partido_votos_recinto_id_fkey"
            columns: ["recinto_id"]
            isOneToOne: false
            referencedRelation: "mv_vote_totals_by_recinto"
            referencedColumns: ["recinto_id"]
          },
          {
            foreignKeyName: "partido_votos_recinto_id_fkey"
            columns: ["recinto_id"]
            isOneToOne: false
            referencedRelation: "recintos"
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
      periodos_electorales: {
        Row: {
          activo: boolean
          created_at: string
          estado: boolean
          fecha_fin: string
          fecha_inicio: string
          id: string
          nombre: string
          partido_id: string
          tenant_id: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          estado?: boolean
          fecha_fin: string
          fecha_inicio: string
          id?: string
          nombre: string
          partido_id: string
          tenant_id?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          estado?: boolean
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          nombre?: string
          partido_id?: string
          tenant_id?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "periodos_electorales_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "mv_vote_totals_by_partido"
            referencedColumns: ["partido_id"]
          },
          {
            foreignKeyName: "periodos_electorales_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "partidos"
            referencedColumns: ["id"]
          },
        ]
      }
      plantillas_llamada: {
        Row: {
          activa: boolean
          contenido: string
          created_at: string
          id: string
          nombre: string
          partido_id: string
          updated_at: string
        }
        Insert: {
          activa?: boolean
          contenido: string
          created_at?: string
          id?: string
          nombre: string
          partido_id: string
          updated_at?: string
        }
        Update: {
          activa?: boolean
          contenido?: string
          created_at?: string
          id?: string
          nombre?: string
          partido_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plantillas_llamada_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "mv_vote_totals_by_partido"
            referencedColumns: ["partido_id"]
          },
          {
            foreignKeyName: "plantillas_llamada_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "partidos"
            referencedColumns: ["id"]
          },
        ]
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
          cod_recinto: string
          created_at: string
          direccion: string | null
          estado: boolean
          id: string
          municipio_id: string
          nombre: string
          partido_id: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          circunscripcion_id?: string | null
          cod_recinto: string
          created_at?: string
          direccion?: string | null
          estado?: boolean
          id?: string
          municipio_id: string
          nombre: string
          partido_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          circunscripcion_id?: string | null
          cod_recinto?: string
          created_at?: string
          direccion?: string | null
          estado?: boolean
          id?: string
          municipio_id?: string
          nombre?: string
          partido_id?: string | null
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
            foreignKeyName: "recintos_circunscripcion_id_fkey"
            columns: ["circunscripcion_id"]
            isOneToOne: false
            referencedRelation: "mv_member_count_by_circunscripcion"
            referencedColumns: ["circunscripcion_id"]
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
          {
            foreignKeyName: "recintos_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "mv_vote_totals_by_partido"
            referencedColumns: ["partido_id"]
          },
          {
            foreignKeyName: "recintos_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "partidos"
            referencedColumns: ["id"]
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
          {
            foreignKeyName: "sectores_circunscripcion_id_fkey"
            columns: ["circunscripcion_id"]
            isOneToOne: false
            referencedRelation: "mv_member_count_by_circunscripcion"
            referencedColumns: ["circunscripcion_id"]
          },
        ]
      }
      seguimiento_miembros: {
        Row: {
          created_at: string
          fecha: string
          id: string
          miembro_id: string
          notas: string
          resultado: string | null
          tenant_id: string | null
          tipo: string
          updated_at: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          fecha?: string
          id?: string
          miembro_id: string
          notas: string
          resultado?: string | null
          tenant_id?: string | null
          tipo?: string
          updated_at?: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          fecha?: string
          id?: string
          miembro_id?: string
          notas?: string
          resultado?: string | null
          tenant_id?: string | null
          tipo?: string
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seguimiento_miembros_miembro_id_fkey"
            columns: ["miembro_id"]
            isOneToOne: false
            referencedRelation: "miembros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seguimiento_miembros_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      seguimiento_no_inscritos: {
        Row: {
          cedula: string
          cod_recinto: string | null
          colegio: string | null
          comentario: string | null
          contacto: string | null
          created_at: string
          decision_presidente: string | null
          decision_voto: string | null
          estado: string
          fecha_conversion: string | null
          fecha_proximo_seguimiento: string | null
          id: string
          miembro_id: string | null
          partido_id: string
          recinto_id: string | null
          terminal: string | null
          updated_at: string
          usuario_id: string
        }
        Insert: {
          cedula: string
          cod_recinto?: string | null
          colegio?: string | null
          comentario?: string | null
          contacto?: string | null
          created_at?: string
          decision_presidente?: string | null
          decision_voto?: string | null
          estado?: string
          fecha_conversion?: string | null
          fecha_proximo_seguimiento?: string | null
          id?: string
          miembro_id?: string | null
          partido_id: string
          recinto_id?: string | null
          terminal?: string | null
          updated_at?: string
          usuario_id: string
        }
        Update: {
          cedula?: string
          cod_recinto?: string | null
          colegio?: string | null
          comentario?: string | null
          contacto?: string | null
          created_at?: string
          decision_presidente?: string | null
          decision_voto?: string | null
          estado?: string
          fecha_conversion?: string | null
          fecha_proximo_seguimiento?: string | null
          id?: string
          miembro_id?: string | null
          partido_id?: string
          recinto_id?: string | null
          terminal?: string | null
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seguimiento_no_inscritos_miembro_id_fkey"
            columns: ["miembro_id"]
            isOneToOne: false
            referencedRelation: "miembros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seguimiento_no_inscritos_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "mv_vote_totals_by_partido"
            referencedColumns: ["partido_id"]
          },
          {
            foreignKeyName: "seguimiento_no_inscritos_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "partidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seguimiento_no_inscritos_recinto_id_fkey"
            columns: ["recinto_id"]
            isOneToOne: false
            referencedRelation: "mv_turnout_por_recinto"
            referencedColumns: ["recinto_id"]
          },
          {
            foreignKeyName: "seguimiento_no_inscritos_recinto_id_fkey"
            columns: ["recinto_id"]
            isOneToOne: false
            referencedRelation: "mv_vote_totals_by_recinto"
            referencedColumns: ["recinto_id"]
          },
          {
            foreignKeyName: "seguimiento_no_inscritos_recinto_id_fkey"
            columns: ["recinto_id"]
            isOneToOne: false
            referencedRelation: "recintos"
            referencedColumns: ["id"]
          },
        ]
      }
      seguimiento_no_inscritos_historial: {
        Row: {
          comentario: string | null
          contacto: string | null
          created_at: string
          decision_presidente: string | null
          decision_voto: string | null
          estado_anterior: string | null
          estado_nuevo: string | null
          id: string
          seguimiento_id: string
          usuario_id: string
        }
        Insert: {
          comentario?: string | null
          contacto?: string | null
          created_at?: string
          decision_presidente?: string | null
          decision_voto?: string | null
          estado_anterior?: string | null
          estado_nuevo?: string | null
          id?: string
          seguimiento_id: string
          usuario_id: string
        }
        Update: {
          comentario?: string | null
          contacto?: string | null
          created_at?: string
          decision_presidente?: string | null
          decision_voto?: string | null
          estado_anterior?: string | null
          estado_nuevo?: string | null
          id?: string
          seguimiento_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seguimiento_no_inscritos_historial_seguimiento_id_fkey"
            columns: ["seguimiento_id"]
            isOneToOne: false
            referencedRelation: "seguimiento_no_inscritos"
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
            foreignKeyName: "usuarios_circunscripcion_id_fkey"
            columns: ["circunscripcion_id"]
            isOneToOne: false
            referencedRelation: "mv_member_count_by_circunscripcion"
            referencedColumns: ["circunscripcion_id"]
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
    }
    Views: {
      mv_member_count_by_circunscripcion: {
        Row: {
          circunscripcion_id: string | null
          circunscripcion_nombre: string | null
          circunscripcion_numero: number | null
          coordinadores: number | null
          multiplicadores: number | null
          municipio_id: string | null
          municipio_nombre: string | null
          relacionados: number | null
          tenant_id: string | null
          total_miembros: number | null
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
      mv_member_count_by_comite: {
        Row: {
          comite_codigo: string | null
          comite_id: string | null
          comite_nombre: string | null
          coordinadores: number | null
          multiplicadores: number | null
          relacionados: number | null
          sector_id: string | null
          sector_nombre: string | null
          tenant_id: string | null
          total_miembros: number | null
        }
        Relationships: [
          {
            foreignKeyName: "comites_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "mv_member_count_by_sector"
            referencedColumns: ["sector_id"]
          },
          {
            foreignKeyName: "comites_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectores"
            referencedColumns: ["id"]
          },
        ]
      }
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
      mv_member_count_by_sector: {
        Row: {
          circunscripcion_id: string | null
          circunscripcion_nombre: string | null
          coordinadores: number | null
          multiplicadores: number | null
          relacionados: number | null
          sector_codigo: string | null
          sector_id: string | null
          sector_nombre: string | null
          tenant_id: string | null
          total_miembros: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sectores_circunscripcion_id_fkey"
            columns: ["circunscripcion_id"]
            isOneToOne: false
            referencedRelation: "circunscripciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sectores_circunscripcion_id_fkey"
            columns: ["circunscripcion_id"]
            isOneToOne: false
            referencedRelation: "mv_member_count_by_circunscripcion"
            referencedColumns: ["circunscripcion_id"]
          },
        ]
      }
      mv_turnout_por_recinto: {
        Row: {
          no_votaron: number | null
          recinto_id: string | null
          recinto_nombre: string | null
          tenant_id: string | null
          total_miembros: number | null
          votaron: number | null
        }
        Relationships: []
      }
      mv_vote_totals_by_partido: {
        Row: {
          partido_color: string | null
          partido_id: string | null
          partido_nombre: string | null
          partido_siglas: string | null
          periodo_id: string | null
          recintos_reportados: number | null
          tenant_id: string | null
          total_votos: number | null
        }
        Relationships: [
          {
            foreignKeyName: "candidato_votos_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "periodos_electorales"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_vote_totals_by_recinto: {
        Row: {
          candidatos_reportados: number | null
          colegios_reportados: number | null
          municipio_id: string | null
          municipio_nombre: string | null
          periodo_id: string | null
          recinto_codigo: string | null
          recinto_id: string | null
          recinto_nombre: string | null
          tenant_id: string | null
          total_votos: number | null
        }
        Relationships: [
          {
            foreignKeyName: "candidato_votos_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "periodos_electorales"
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
      mv_votos_por_partido_circunscripcion: {
        Row: {
          candidato_partido_id: string | null
          circunscripcion_id: string | null
          partido_id: string | null
          periodo_id: string | null
          tenant_id: string | null
          total_votos: number | null
        }
        Relationships: [
          {
            foreignKeyName: "candidato_votos_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "mv_vote_totals_by_partido"
            referencedColumns: ["partido_id"]
          },
          {
            foreignKeyName: "candidato_votos_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "partidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidato_votos_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "periodos_electorales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidatos_partido_id_fkey"
            columns: ["candidato_partido_id"]
            isOneToOne: false
            referencedRelation: "mv_vote_totals_by_partido"
            referencedColumns: ["partido_id"]
          },
          {
            foreignKeyName: "candidatos_partido_id_fkey"
            columns: ["candidato_partido_id"]
            isOneToOne: false
            referencedRelation: "partidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recintos_circunscripcion_id_fkey"
            columns: ["circunscripcion_id"]
            isOneToOne: false
            referencedRelation: "circunscripciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recintos_circunscripcion_id_fkey"
            columns: ["circunscripcion_id"]
            isOneToOne: false
            referencedRelation: "mv_member_count_by_circunscripcion"
            referencedColumns: ["circunscripcion_id"]
          },
        ]
      }
    }
    Functions: {
      convert_seguimiento_to_member: {
        Args: { p_member_data: Json; p_seguimiento_id: string }
        Returns: string
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      get_conversion_rates: {
        Args: {
          p_area_id?: string
          p_area_type?: string
          p_fecha_fin?: string
          p_fecha_inicio?: string
          p_partido_id?: string
        }
        Returns: {
          area_id: string
          area_nombre: string
          contactados: number
          pendientes: number
          rechazados: number
          registrados: number
          tasa_conversion: number
          total: number
        }[]
      }
      get_coordinadores: {
        Args: { p_tenant_id?: string }
        Returns: {
          apellido: string
          cedula: string
          celular: string
          email: string
          estado: boolean
          foto_url: string
          id: string
          multiplicador_count: number
          nombre: string
          sector_id: string
          sector_nombre: string
          telefono: string
        }[]
      }
      get_followup_queue: {
        Args: { p_limit?: number; p_offset?: number; p_usuario_id: string }
        Returns: {
          apellidos: string
          cedula: string
          cod_recinto: string
          colegio: string
          comentario: string
          contacto: string
          decision_presidente: string
          decision_voto: string
          direccion_recinto: string
          es_vencido: boolean
          estado: string
          fecha_proximo_seguimiento: string
          nombre_recinto: string
          nombres: string
          padron_id: string
          recinto_id: string
          seguimiento_id: string
          telefonos: string
          total_count: number
        }[]
      }
      get_hierarchy_children: {
        Args: { parent_id?: string; target_level: string }
        Returns: {
          codigo: string
          coordinadores: number
          estado: boolean
          id: string
          multiplicadores: number
          nombre: string
          relacionados: number
          total_miembros: number
        }[]
      }
      get_multiplicadores: {
        Args: { p_coordinador_id: string; p_tenant_id?: string }
        Returns: {
          apellido: string
          cedula: string
          celular: string
          email: string
          estado: boolean
          foto_url: string
          id: string
          nombre: string
          relacionado_count: number
          sector_id: string
          sector_nombre: string
          telefono: string
        }[]
      }
      get_my_role: { Args: never; Returns: string }
      get_my_scope_id: { Args: never; Returns: string }
      get_my_scope_level: { Args: never; Returns: string }
      get_my_tenant_id: { Args: never; Returns: string }
      get_relacionados: {
        Args: { p_multiplicador_id: string; p_tenant_id?: string }
        Returns: {
          apellido: string
          cedula: string
          celular: string
          email: string
          estado: boolean
          foto_url: string
          id: string
          nombre: string
          sector_id: string
          sector_nombre: string
          telefono: string
        }[]
      }
      init_vote_records: {
        Args: {
          p_colegio_id: string
          p_partido_id: string
          p_periodo_id: string
          p_recinto_id: string
        }
        Returns: number
      }
      is_assigned_to_recinto: {
        Args: { p_periodo_id: string; p_recinto_id: string }
        Returns: boolean
      }
      is_within_scope_cronograma: {
        Args: { p_nivel_geografico: string; p_nivel_id: string }
        Returns: boolean
      }
      is_within_scope_via_recinto: {
        Args: { p_recinto_id: string }
        Returns: boolean
      }
      is_within_scope_via_sector: {
        Args: { p_sector_id: string }
        Returns: boolean
      }
      partido_belongs_to_my_tenant: {
        Args: { p_partido_id: string }
        Returns: boolean
      }
      refresh_materialized_views: { Args: never; Returns: undefined }
      resolve_sector_circunscripcion_id: {
        Args: { p_sector_id: string }
        Returns: string
      }
      resolve_sector_municipio_id: {
        Args: { p_sector_id: string }
        Returns: string
      }
      resolve_sector_provincia_id: {
        Args: { p_sector_id: string }
        Returns: string
      }
      rpc_dashboard_by_party: {
        Args: {
          p_circunscripcion_id?: string
          p_municipio_id?: string
          p_periodo_id: string
          p_recinto_id?: string
        }
        Returns: {
          partido_color: string
          partido_id: string
          partido_nombre: string
          partido_siglas: string
          recintos_reportados: number
          total_votos: number
        }[]
      }
      rpc_dashboard_timeline: {
        Args: { p_interval_minutes?: number; p_periodo_id: string }
        Returns: {
          bucket: string
          bucket_actas: number
          bucket_votos: number
        }[]
      }
      rpc_dashboard_vote_summary: {
        Args: { p_periodo_id: string }
        Returns: {
          recintos_reportados: number
          total_votos: number
        }[]
      }
      search_hierarchy: {
        Args: { search_term: string }
        Returns: {
          codigo: string
          id: string
          nivel: string
          nombre: string
          parent_nombre: string
        }[]
      }
      search_members: {
        Args: {
          p_cedula?: string
          p_circunscripcion_id?: string
          p_coordinador_id?: string
          p_estado?: boolean
          p_limit?: number
          p_municipio_id?: string
          p_offset?: number
          p_provincia_id?: string
          p_search?: string
          p_sector_id?: string
          p_tipo_miembro?: string
        }
        Returns: {
          apellido: string
          apodo: string
          cedula: string
          celular: string
          coordinador_id: string
          coordinador_nombre: string
          created_at: string
          email: string
          estado: boolean
          foto_url: string
          id: string
          nombre: string
          sector_id: string
          sector_nombre: string
          telefono: string
          tipo_miembro: Database["public"]["Enums"]["tipo_miembro"]
          total_count: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
  graphql_public: {
    Enums: {},
  },
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
