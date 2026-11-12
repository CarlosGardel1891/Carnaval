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
      avisos_enviados: {
        Row: {
          actuacion_id: number | null
          clave: string
          enviado_en: string | null
          estado_anterior: Database['public']['Enums']['estado_actuacion'] | null
          fallido_en: string | null
          id: number
          inicio_anterior: string | null
          intentos: number
          noche: string
          reclamado_en: string
          tipo: Database['public']['Enums']['tipo_aviso']
          usuario_id: string
        }
        ComputedFields: never
        Insert: {
          actuacion_id?: number | null
          clave: string
          enviado_en?: string | null
          estado_anterior?: Database['public']['Enums']['estado_actuacion'] | null
          fallido_en?: string | null
          id?: never
          inicio_anterior?: string | null
          intentos?: number
          noche: string
          reclamado_en?: string
          tipo: Database['public']['Enums']['tipo_aviso']
          usuario_id: string
        }
        Update: {
          actuacion_id?: number | null
          clave?: string
          enviado_en?: string | null
          estado_anterior?: Database['public']['Enums']['estado_actuacion'] | null
          fallido_en?: string | null
          id?: never
          inicio_anterior?: string | null
          intentos?: number
          noche?: string
          reclamado_en?: string
          tipo?: Database['public']['Enums']['tipo_aviso']
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'avisos_enviados_actuacion_id_fkey'
            columns: ['actuacion_id']
            isOneToOne: false
            referencedRelation: 'actuaciones'
            referencedColumns: ['id']
          },
        ]
      }
      cambios_actuacion: {
        Row: {
          actuacion_id: number
          creado_en: string
          direccion_anterior: string | null
          escenario_anterior: number
          estado_anterior: Database['public']['Enums']['estado_actuacion']
          id: number
          inicio_anterior: string
          procesado_en: string | null
        }
        ComputedFields: never
        Insert: {
          actuacion_id: number
          creado_en?: string
          direccion_anterior?: string | null
          escenario_anterior: number
          estado_anterior: Database['public']['Enums']['estado_actuacion']
          id?: never
          inicio_anterior: string
          procesado_en?: string | null
        }
        Update: {
          actuacion_id?: number
          creado_en?: string
          direccion_anterior?: string | null
          escenario_anterior?: number
          estado_anterior?: Database['public']['Enums']['estado_actuacion']
          id?: never
          inicio_anterior?: string
          procesado_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'cambios_actuacion_actuacion_id_fkey'
            columns: ['actuacion_id']
            isOneToOne: false
            referencedRelation: 'actuaciones'
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
      cortes_calle: {
        Row: {
          descripcion: string
          desde: string | null
          estado: Database['public']['Enums']['estado_evento']
          evento_id: number
          fuente_url: string[]
          hasta: string | null
          id: number
          slug: string
          tipo: Database['public']['Enums']['tipo_corte']
          tramo: unknown
        }
        ComputedFields: never
        Insert: {
          descripcion: string
          desde?: string | null
          estado: Database['public']['Enums']['estado_evento']
          evento_id: number
          fuente_url?: string[]
          hasta?: string | null
          id?: never
          slug: string
          tipo: Database['public']['Enums']['tipo_corte']
          tramo?: unknown
        }
        Update: {
          descripcion?: string
          desde?: string | null
          estado?: Database['public']['Enums']['estado_evento']
          evento_id?: number
          fuente_url?: string[]
          hasta?: string | null
          id?: never
          slug?: string
          tipo?: Database['public']['Enums']['tipo_corte']
          tramo?: unknown
        }
        Relationships: [
          {
            foreignKeyName: 'cortes_calle_evento_id_fkey'
            columns: ['evento_id']
            isOneToOne: false
            referencedRelation: 'eventos'
            referencedColumns: ['id']
          },
        ]
      }
      desfile_esquinas: {
        Row: {
          calle: string
          cruce: string
          evento_id: number
          orden: number
          punto: unknown
        }
        ComputedFields: never
        Insert: {
          calle: string
          cruce: string
          evento_id: number
          orden: number
          punto: unknown
        }
        Update: {
          calle?: string
          cruce?: string
          evento_id?: number
          orden?: number
          punto?: unknown
        }
        Relationships: [
          {
            foreignKeyName: 'desfile_esquinas_evento_id_fkey'
            columns: ['evento_id']
            isOneToOne: false
            referencedRelation: 'eventos'
            referencedColumns: ['id']
          },
        ]
      }
      dispositivos_push: {
        Row: {
          actualizado_en: string
          creado_en: string
          idioma: Database['public']['Enums']['idioma_app']
          plataforma: Database['public']['Enums']['plataforma_push']
          token: string
          usuario_id: string
        }
        ComputedFields: never
        Insert: {
          actualizado_en?: string
          creado_en?: string
          idioma: Database['public']['Enums']['idioma_app']
          plataforma: Database['public']['Enums']['plataforma_push']
          token: string
          usuario_id: string
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          idioma?: Database['public']['Enums']['idioma_app']
          plataforma?: Database['public']['Enums']['plataforma_push']
          token?: string
          usuario_id?: string
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
          fuente: string
          fuente_url: string | null
          id: number
          numero: number
          rueda: Database['public']['Enums']['rueda_concurso']
          temporada_id: number
        }
        ComputedFields: never
        Insert: {
          fecha: string
          fuente: string
          fuente_url?: string | null
          id?: never
          numero: number
          rueda: Database['public']['Enums']['rueda_concurso']
          temporada_id: number
        }
        Update: {
          fecha?: string
          fuente?: string
          fuente_url?: string | null
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
      eventos: {
        Row: {
          desfile_atraso_min: number
          desfile_inicio: string | null
          desfile_intervalo_min: number | null
          desfile_separacion_m: number | null
          entradas_texto: string | null
          entradas_url: string | null
          estado: Database['public']['Enums']['estado_evento']
          fecha_fin: string
          fecha_inicio: string
          fuente_url: string[]
          id: number
          info: string | null
          lugar: string | null
          nombre: string
          recorrido: unknown
          recorrido_estado: Database['public']['Enums']['estado_evento'] | null
          recorrido_fuente_url: string[]
          slug: string
          temporada_id: number
          tipo: Database['public']['Enums']['tipo_evento']
        }
        ComputedFields: never
        Insert: {
          desfile_atraso_min?: number
          desfile_inicio?: string | null
          desfile_intervalo_min?: number | null
          desfile_separacion_m?: number | null
          entradas_texto?: string | null
          entradas_url?: string | null
          estado: Database['public']['Enums']['estado_evento']
          fecha_fin: string
          fecha_inicio: string
          fuente_url?: string[]
          id?: never
          info?: string | null
          lugar?: string | null
          nombre: string
          recorrido?: unknown
          recorrido_estado?: Database['public']['Enums']['estado_evento'] | null
          recorrido_fuente_url?: string[]
          slug: string
          temporada_id: number
          tipo: Database['public']['Enums']['tipo_evento']
        }
        Update: {
          desfile_atraso_min?: number
          desfile_inicio?: string | null
          desfile_intervalo_min?: number | null
          desfile_separacion_m?: number | null
          entradas_texto?: string | null
          entradas_url?: string | null
          estado?: Database['public']['Enums']['estado_evento']
          fecha_fin?: string
          fecha_inicio?: string
          fuente_url?: string[]
          id?: never
          info?: string | null
          lugar?: string | null
          nombre?: string
          recorrido?: unknown
          recorrido_estado?: Database['public']['Enums']['estado_evento'] | null
          recorrido_fuente_url?: string[]
          slug?: string
          temporada_id?: number
          tipo?: Database['public']['Enums']['tipo_evento']
        }
        Relationships: [
          {
            foreignKeyName: 'eventos_temporada_id_fkey'
            columns: ['temporada_id']
            isOneToOne: false
            referencedRelation: 'temporadas'
            referencedColumns: ['id']
          },
        ]
      }
      favoritos: {
        Row: {
          conjunto_id: number
          creado_en: string
          usuario_id: string
        }
        ComputedFields: never
        Insert: {
          conjunto_id: number
          creado_en?: string
          usuario_id?: string
        }
        Update: {
          conjunto_id?: number
          creado_en?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'favoritos_conjunto_id_fkey'
            columns: ['conjunto_id']
            isOneToOne: false
            referencedRelation: 'conjuntos'
            referencedColumns: ['id']
          },
        ]
      }
      orden_desfile: {
        Row: {
          conjunto_id: number
          evento_id: number
          fuente: string
          fuente_url: string | null
          posicion: number
        }
        ComputedFields: never
        Insert: {
          conjunto_id: number
          evento_id: number
          fuente: string
          fuente_url?: string | null
          posicion: number
        }
        Update: {
          conjunto_id?: number
          evento_id?: number
          fuente?: string
          fuente_url?: string | null
          posicion?: number
        }
        Relationships: [
          {
            foreignKeyName: 'orden_desfile_conjunto_id_fkey'
            columns: ['conjunto_id']
            isOneToOne: false
            referencedRelation: 'conjuntos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orden_desfile_evento_id_fkey'
            columns: ['evento_id']
            isOneToOne: false
            referencedRelation: 'eventos'
            referencedColumns: ['id']
          },
        ]
      }
      registro_cambios: {
        Row: {
          antes: Json | null
          despues: Json | null
          fila: string
          hecho_en: string
          id: number
          operacion: string
          tabla: string
          usuario_email: string | null
          usuario_id: string | null
        }
        ComputedFields: never
        Insert: {
          antes?: Json | null
          despues?: Json | null
          fila: string
          hecho_en?: string
          id?: never
          operacion: string
          tabla: string
          usuario_email?: string | null
          usuario_id?: string | null
        }
        Update: {
          antes?: Json | null
          despues?: Json | null
          fila?: string
          hecho_en?: string
          id?: never
          operacion?: string
          tabla?: string
          usuario_email?: string | null
          usuario_id?: string | null
        }
        Relationships: []
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
      actuaciones_de_la_noche: {
        Args: {
          p_lat?: number
          p_lng?: number
          p_noche: string
          p_solo_favoritos?: boolean
          p_solo_gratis?: boolean
        }
        Returns: {
          actuacion_id: number
          conjunto_categoria: Database['public']['Enums']['categoria_conjunto']
          conjunto_foto_url: string
          conjunto_id: number
          conjunto_nombre: string
          conjunto_slug: string
          direccion: string
          distancia_m: number
          es_favorito: boolean
          escenario_barrio: string
          escenario_id: number
          escenario_nombre: string
          escenario_slug: string
          escenario_tipo: Database['public']['Enums']['tipo_escenario']
          estado: Database['public']['Enums']['estado_actuacion']
          etapa_numero: number
          etapa_rueda: Database['public']['Enums']['rueda_concurso']
          gratis: boolean
          inicio: string
          itinerante: boolean
          lat: number
          lng: number
          precio_texto: string
        }[]
      }
      avisos_fallidos_desde: { Args: { p_desde: string }; Returns: number }
      buscar_por_nombre: {
        Args: { p_texto: string }
        Returns: {
          id: number
          nombre: string
          slug: string
          tipo: string
        }[]
      }
      cerrar_avisos: { Args: { p_avisos: number[] }; Returns: undefined }
      cortes_del_desfile: {
        Args: { p_evento_id: number }
        Returns: {
          corte_id: number
          descripcion: string
          desde: string
          estado: Database['public']['Enums']['estado_evento']
          fuente_url: string[]
          hasta: string
          puntos: Json
          slug: string
          tipo: Database['public']['Enums']['tipo_corte']
        }[]
      }
      es_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      escenarios_cercanos: {
        Args: { p_lat: number; p_lng: number; p_noche: string; p_radio_m: number }
        Returns: {
          barrio: string
          direccion: string
          distancia_m: number
          escenario_id: number
          gratis: boolean
          itinerante: boolean
          lat: number
          lng: number
          nombre: string
          precio_texto: string
          slug: string
          tipo: Database['public']['Enums']['tipo_escenario']
        }[]
      }
      fixture_del_concurso: {
        Args: { p_anio: number }
        Returns: {
          actuacion_id: number
          conjunto_categoria: Database['public']['Enums']['categoria_conjunto']
          conjunto_id: number
          conjunto_nombre: string
          conjunto_slug: string
          estado: Database['public']['Enums']['estado_actuacion']
          etapa_id: number
          fecha: string
          fuente: string
          inicio: string
          numero: number
          rueda: Database['public']['Enums']['rueda_concurso']
        }[]
      }
      mis_favoritos: { Args: Record<PropertyKey, never>; Returns: number[] }
      norm: { Args: { t: string }; Returns: string }
      norm_lista: { Args: { t: string[] }; Returns: string[] }
      orden_del_desfile: {
        Args: { p_evento_id: number }
        Returns: {
          conjunto_barrio: string
          conjunto_id: number
          conjunto_nombre: string
          conjunto_slug: string
          fuente: string
          posicion: number
        }[]
      }
      proximas_de_conjunto: {
        Args: { p_conjunto_id: number; p_noche: string }
        Returns: {
          actuacion_id: number
          direccion: string
          escenario_barrio: string
          escenario_id: number
          escenario_nombre: string
          escenario_slug: string
          escenario_tipo: Database['public']['Enums']['tipo_escenario']
          estado: Database['public']['Enums']['estado_actuacion']
          etapa_numero: number
          etapa_rueda: Database['public']['Enums']['rueda_concurso']
          gratis: boolean
          inicio: string
          itinerante: boolean
          lat: number
          lng: number
          noche: string
          precio_texto: string
        }[]
      }
      recorrido_del_desfile: {
        Args: { p_evento_id: number }
        Returns: {
          calle: string
          cruce: string
          distancia_m: number
          lat: number
          lng: number
          orden: number
        }[]
      }
      registrar_dispositivo_push: {
        Args: {
          p_idioma: Database['public']['Enums']['idioma_app']
          p_plataforma: Database['public']['Enums']['plataforma_push']
          p_token: string
        }
        Returns: undefined
      }
      tomar_avisos_de_cambios: {
        Args: { p_hasta: string; p_noche: string }
        Returns: {
          actuacion_id: number
          aviso_id: number
          conjunto_id: number
          conjunto_nombre: string
          conjunto_slug: string
          direccion: string
          escenario_nombre: string
          estado: Database['public']['Enums']['estado_actuacion']
          estado_anterior: Database['public']['Enums']['estado_actuacion']
          idioma: Database['public']['Enums']['idioma_app']
          inicio: string
          inicio_anterior: string
          noche: string
          plataforma: Database['public']['Enums']['plataforma_push']
          token: string
          usuario_id: string
        }[]
      }
      tomar_avisos_del_dia: {
        Args: { p_noche: string }
        Returns: {
          actuacion_id: number
          aviso_id: number
          conjunto_id: number
          conjunto_nombre: string
          conjunto_slug: string
          desfile_atraso_min: number
          desfile_inicio: string
          desfile_intervalo_min: number
          desfile_posicion: number
          desfile_separacion_m: number
          direccion: string
          escenario_nombre: string
          idioma: Database['public']['Enums']['idioma_app']
          inicio: string
          noche: string
          plataforma: Database['public']['Enums']['plataforma_push']
          token: string
          usuario_id: string
        }[]
      }
    }
    Enums: {
      categoria_conjunto:
        'murga' | 'parodistas' | 'humoristas' | 'revista' | 'comparsa' | 'samba' | 'otro'
      estado_actuacion: 'programada' | 'cambiada' | 'suspendida'
      estado_evento: 'confirmado' | 'estimado'
      idioma_app: 'es' | 'en'
      plataforma_push: 'ios' | 'android'
      rueda_concurso: 'primera' | 'segunda' | 'liguilla'
      tipo_aviso: 'hoy' | 'cambio'
      tipo_corte: 'corte' | 'estacionamiento'
      tipo_escenario:
        'teatro_verano' | 'privado' | 'popular' | 'movil' | 'gratuito' | 'barrio_a_barrio'
      tipo_evento: 'inaugural' | 'samba' | 'llamadas' | 'corso' | 'admision' | 'concurso' | 'otro'
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
      estado_evento: ['confirmado', 'estimado'],
      idioma_app: ['es', 'en'],
      plataforma_push: ['ios', 'android'],
      rueda_concurso: ['primera', 'segunda', 'liguilla'],
      tipo_aviso: ['hoy', 'cambio'],
      tipo_corte: ['corte', 'estacionamiento'],
      tipo_escenario: [
        'teatro_verano',
        'privado',
        'popular',
        'movil',
        'gratuito',
        'barrio_a_barrio',
      ],
      tipo_evento: ['inaugural', 'samba', 'llamadas', 'corso', 'admision', 'concurso', 'otro'],
    },
  },
} as const
