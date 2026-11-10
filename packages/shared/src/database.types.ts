export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      actuaciones: {
        Row: {
          actualizado_en: string
          conjunto_id: number
          creado_en: string
          direccion_texto: string | null
          escenario_id: number
          estado: Database['public']['Enums']['estado_actuacion']
          etapa_id: number | null
          fuente: string
          fuente_url: string | null
          id: number
          inicio: string
          noche: string
          ubicacion: unknown
        }
        ComputedFields: never
        Insert: {
          actualizado_en?: string
          conjunto_id: number
          creado_en?: string
          direccion_texto?: string | null
          escenario_id: number
          estado?: Database['public']['Enums']['estado_actuacion']
          etapa_id?: number | null
          fuente: string
          fuente_url?: string | null
          id?: never
          inicio: string
          noche?: never
          ubicacion?: unknown
        }
        Update: {
          actualizado_en?: string
          conjunto_id?: number
          creado_en?: string
          direccion_texto?: string | null
          escenario_id?: number
          estado?: Database['public']['Enums']['estado_actuacion']
          etapa_id?: number | null
          fuente?: string
          fuente_url?: string | null
          id?: never
          inicio?: string
          noche?: never
          ubicacion?: unknown
        }
        Relationships: [
          {
            foreignKeyName: 'actuaciones_conjunto_id_fkey'
            columns: ['conjunto_id']
            isOneToOne: false
            referencedRelation: 'conjuntos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'actuaciones_escenario_id_fkey'
            columns: ['escenario_id']
            isOneToOne: false
            referencedRelation: 'escenarios'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'actuaciones_etapa_id_fkey'
            columns: ['etapa_id']
            isOneToOne: false
            referencedRelation: 'etapas_concurso'
            referencedColumns: ['id']
          },
        ]
      }
      conjunto_nombres: {
        Row: {
          conjunto_id: number
          nombre_norm: string
        }
        ComputedFields: never
        Insert: {
          conjunto_id: number
          nombre_norm: string
        }
        Update: {
          conjunto_id?: number
          nombre_norm?: string
        }
        Relationships: [
          {
            foreignKeyName: 'conjunto_nombres_conjunto_id_fkey'
            columns: ['conjunto_id']
            isOneToOne: false
            referencedRelation: 'conjuntos'
            referencedColumns: ['id']
          },
        ]
      }
      conjunto_temporada: {
        Row: {
          conjunto_id: number
          en_concurso: boolean | null
          en_llamadas: boolean
          temporada_id: number
        }
        ComputedFields: never
        Insert: {
          conjunto_id: number
          en_concurso?: boolean | null
          en_llamadas?: boolean
          temporada_id: number
        }
        Update: {
          conjunto_id?: number
          en_concurso?: boolean | null
          en_llamadas?: boolean
          temporada_id?: number
        }
        Relationships: [
          {
            foreignKeyName: 'conjunto_temporada_conjunto_id_fkey'
            columns: ['conjunto_id']
            isOneToOne: false
            referencedRelation: 'conjuntos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'conjunto_temporada_temporada_id_fkey'
            columns: ['temporada_id']
            isOneToOne: false
            referencedRelation: 'temporadas'
            referencedColumns: ['id']
          },
        ]
      }
      conjuntos: {
        Row: {
          alias: string[]
          alias_norm: string[] | null
          barrio: string | null
          bio: string | null
          categoria: Database['public']['Enums']['categoria_conjunto']
          facebook: string | null
          foto_url: string | null
          fuente_url: string[]
          id: number
          instagram: string | null
          nombre: string
          nombre_norm: string | null
          slug: string
          verificado: boolean
        }
        ComputedFields: never
        Insert: {
          alias?: string[]
          alias_norm?: never
          barrio?: string | null
          bio?: string | null
          categoria: Database['public']['Enums']['categoria_conjunto']
          facebook?: string | null
          foto_url?: string | null
          fuente_url?: string[]
          id?: never
          instagram?: string | null
          nombre: string
          nombre_norm?: never
          slug: string
          verificado?: boolean
        }
        Update: {
          alias?: string[]
          alias_norm?: never
          barrio?: string | null
          bio?: string | null
          categoria?: Database['public']['Enums']['categoria_conjunto']
          facebook?: string | null
          foto_url?: string | null
          fuente_url?: string[]
          id?: never
          instagram?: string | null
          nombre?: string
          nombre_norm?: never
          slug?: string
          verificado?: boolean
        }
        Relationships: []
      }
      escenario_nombres: {
        Row: {
          escenario_id: number
          nombre_norm: string
        }
        ComputedFields: never
        Insert: {
          escenario_id: number
          nombre_norm: string
        }
        Update: {
          escenario_id?: number
          nombre_norm?: string
        }
        Relationships: [
          {
            foreignKeyName: 'escenario_nombres_escenario_id_fkey'
            columns: ['escenario_id']
            isOneToOne: false
            referencedRelation: 'escenarios'
            referencedColumns: ['id']
          },
        ]
      }
      escenarios: {
        Row: {
          activo: boolean
          alias: string[]
          alias_norm: string[] | null
          barrio: string | null
          direccion: string | null
          fuente_url: string[]
          gratis: boolean | null
          id: number
          itinerante: boolean | null
          nombre: string
          nombre_norm: string | null
          precio_texto: string | null
          slug: string
          tipo: Database['public']['Enums']['tipo_escenario'] | null
          ubicacion: unknown
        }
        ComputedFields: never
        Insert: {
          activo?: boolean
          alias?: string[]
          alias_norm?: never
          barrio?: string | null
          direccion?: string | null
          fuente_url?: string[]
          gratis?: boolean | null
          id?: never
          itinerante?: boolean | null
          nombre: string
          nombre_norm?: never
          precio_texto?: string | null
          slug: string
          tipo?: Database['public']['Enums']['tipo_escenario'] | null
          ubicacion?: unknown
        }
        Update: {
          activo?: boolean
          alias?: string[]
          alias_norm?: never
          barrio?: string | null
          direccion?: string | null
          fuente_url?: string[]
          gratis?: boolean | null
          id?: never
          itinerante?: boolean | null
          nombre?: string
          nombre_norm?: never
          precio_texto?: string | null
          slug?: string
          tipo?: Database['public']['Enums']['tipo_escenario'] | null
          ubicacion?: unknown
        }
        Relationships: []
      }
      etapas_concurso: {
        Row: {
          fecha: string
          id: number
          numero: number
          rueda: Database['public']['Enums']['rueda_concurso']
          temporada_id: number
        }
        ComputedFields: never
        Insert: {
          fecha: string
          id?: never
          numero: number
          rueda: Database['public']['Enums']['rueda_concurso']
          temporada_id: number
        }
        Update: {
          fecha?: string
          id?: never
          numero?: number
          rueda?: Database['public']['Enums']['rueda_concurso']
          temporada_id?: number
        }
        Relationships: [
          {
            foreignKeyName: 'etapas_concurso_temporada_id_fkey'
            columns: ['temporada_id']
            isOneToOne: false
            referencedRelation: 'temporadas'
            referencedColumns: ['id']
          },
        ]
      }
      temporadas: {
        Row: {
          anio: number
          fecha_fin: string
          fecha_inicio: string
          id: number
          modo_llamadas_desde: string | null
          modo_llamadas_hasta: string | null
        }
        ComputedFields: never
        Insert: {
          anio: number
          fecha_fin: string
          fecha_inicio: string
          id?: never
          modo_llamadas_desde?: string | null
          modo_llamadas_hasta?: string | null
        }
        Update: {
          anio?: number
          fecha_fin?: string
          fecha_inicio?: string
          id?: never
          modo_llamadas_desde?: string | null
          modo_llamadas_hasta?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      es_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      norm: { Args: { t: string }; Returns: string }
      norm_lista: { Args: { t: string[] }; Returns: string[] }
    }
    Enums: {
      categoria_conjunto:
        'murga' | 'parodistas' | 'humoristas' | 'revista' | 'comparsa' | 'samba' | 'otro'
      estado_actuacion: 'programada' | 'cambiada' | 'suspendida'
      rueda_concurso: 'primera' | 'segunda' | 'liguilla'
      tipo_escenario:
        'teatro_verano' | 'privado' | 'popular' | 'movil' | 'gratuito' | 'barrio_a_barrio'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      categoria_conjunto: [
        'murga',
        'parodistas',
        'humoristas',
        'revista',
        'comparsa',
        'samba',
        'otro',
      ],
      estado_actuacion: ['programada', 'cambiada', 'suspendida'],
      rueda_concurso: ['primera', 'segunda', 'liguilla'],
      tipo_escenario: [
        'teatro_verano',
        'privado',
        'popular',
        'movil',
        'gratuito',
        'barrio_a_barrio',
      ],
    },
  },
} as const
