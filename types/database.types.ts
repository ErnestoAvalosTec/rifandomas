export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      perfiles: {
        Row: {
          id: string
          nombre: string
          apellidos: string
          telefono: string | null
          rol: 'admin' | 'usuario'
          activo: boolean
          avatar_url: string | null
          calificacion: number
          red_social_verificacion: string | null
          verificado: boolean
          ultima_revision_ordenes: string
          created_at: string
        }
        Insert: {
          id: string
          nombre: string
          apellidos: string
          telefono?: string | null
          rol?: 'admin' | 'usuario'
          activo?: boolean
          avatar_url?: string | null
          calificacion?: number
          red_social_verificacion?: string | null
          verificado?: boolean
          ultima_revision_ordenes?: string
          created_at?: string
        }
        Update: {
          nombre?: string
          apellidos?: string
          telefono?: string | null
          rol?: 'admin' | 'usuario'
          activo?: boolean
          avatar_url?: string | null
          calificacion?: number
          red_social_verificacion?: string | null
          verificado?: boolean
          ultima_revision_ordenes?: string
        }
      }
      sorteos: {
        Row: {
          id: string
          usuario_id: string
          nombre: string
          descripcion: string | null
          fecha_sorteo: string
          total_numeros: number
          precio_unitario: number
          promo_activa: boolean
          promo_tipo: 'x_por_y' | 'compra_lleva' | null
          promo_config: Json | null
          estatus: 'borrador' | 'pendiente' | 'activo' | 'pausado' | 'finalizado' | 'rechazado' | 'eliminado'
          motivo_rechazo: string | null
          destacado_orden: number | null
          facebook_publicado_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          nombre: string
          descripcion?: string | null
          fecha_sorteo: string
          total_numeros: number
          precio_unitario: number
          promo_activa?: boolean
          promo_tipo?: 'x_por_y' | 'compra_lleva' | null
          promo_config?: Json | null
          estatus?: 'borrador' | 'pendiente' | 'activo' | 'pausado' | 'finalizado' | 'rechazado' | 'eliminado'
          motivo_rechazo?: string | null
        }
        Update: {
          nombre?: string
          descripcion?: string | null
          fecha_sorteo?: string
          total_numeros?: number
          precio_unitario?: number
          promo_activa?: boolean
          promo_tipo?: 'x_por_y' | 'compra_lleva' | null
          promo_config?: Json | null
          estatus?: 'borrador' | 'pendiente' | 'activo' | 'pausado' | 'finalizado' | 'rechazado' | 'eliminado'
          motivo_rechazo?: string | null
          destacado_orden?: number | null
          facebook_publicado_at?: string | null
          updated_at?: string
        }
      }
      premios: {
        Row: {
          id: string
          sorteo_id: string
          lugar: 1 | 2 | 3
          nombre: string
          descripcion: string | null
          imagen_url: string | null
          valor_estimado: number | null
          categoria: string | null
          intercambiable_efectivo: boolean
          fotos_urls: string[]
        }
        Insert: {
          id?: string
          sorteo_id: string
          lugar: 1 | 2 | 3
          nombre: string
          descripcion?: string | null
          imagen_url?: string | null
          valor_estimado?: number | null
          categoria?: string | null
          intercambiable_efectivo?: boolean
          fotos_urls?: string[]
        }
        Update: {
          nombre?: string
          descripcion?: string | null
          imagen_url?: string | null
          valor_estimado?: number | null
          categoria?: string | null
          intercambiable_efectivo?: boolean
          fotos_urls?: string[]
        }
      }
      boletos: {
        Row: {
          id: string
          sorteo_id: string
          numero: string
          estatus: 'disponible' | 'reservado' | 'pagado'
          pedido_id: string | null
        }
        Insert: {
          id?: string
          sorteo_id: string
          numero: string
          estatus?: 'disponible' | 'reservado' | 'pagado'
          pedido_id?: string | null
        }
        Update: {
          estatus?: 'disponible' | 'reservado' | 'pagado'
          pedido_id?: string | null
        }
      }
      pedidos: {
        Row: {
          id: string
          sorteo_id: string | null
          cliente_nombre: string
          cliente_apellidos: string
          cliente_telefono: string
          cliente_correo: string | null
          cliente_estado: string | null
          vendedor_id: string | null
          monto_total: number
          estatus: 'pendiente' | 'pagado' | 'cancelado'
          whatsapp_enviado: boolean
          referencia: string | null
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          sorteo_id?: string | null
          cliente_nombre: string
          cliente_apellidos: string
          cliente_telefono: string
          cliente_correo?: string | null
          cliente_estado?: string | null
          vendedor_id?: string | null
          monto_total: number
          estatus?: 'pendiente' | 'pagado' | 'cancelado'
          whatsapp_enviado?: boolean
          referencia?: string | null
          created_at?: string
          expires_at?: string
        }
        Update: {
          estatus?: 'pendiente' | 'pagado' | 'cancelado'
          whatsapp_enviado?: boolean
          referencia?: string | null
        }
      }
      pedido_boletos: {
        Row: {
          id: string
          pedido_id: string
          boleto_id: string
        }
        Insert: {
          id?: string
          pedido_id: string
          boleto_id: string
        }
        Update: Record<string, never>
      }
      imagenes_predeterminadas: {
        Row: {
          id: string
          categoria: string
          nombre: string | null
          url: string
          orden: number
          activo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          categoria: string
          nombre?: string | null
          url: string
          orden?: number
          activo?: boolean
          created_at?: string
        }
        Update: {
          categoria?: string
          nombre?: string | null
          url?: string
          orden?: number
          activo?: boolean
        }
      }
      cuentas_deposito: {
        Row: {
          id: string
          usuario_id: string
          banco: string
          clabe: string
          titular: string
          activo: boolean
        }
        Insert: {
          id?: string
          usuario_id: string
          banco: string
          clabe: string
          titular: string
          activo?: boolean
        }
        Update: {
          banco?: string
          clabe?: string
          titular?: string
          activo?: boolean
        }
      }
      sorteo_ganadores: {
        Row: {
          id: string
          sorteo_id: string
          premio_id: string
          pedido_id: string
          boleto_id: string
          numero_ganador: string
          evidencia_urls: string[]
          declarado_por: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sorteo_id: string
          premio_id: string
          pedido_id: string
          boleto_id: string
          numero_ganador: string
          evidencia_urls?: string[]
          declarado_por?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          numero_ganador?: string
          evidencia_urls?: string[]
          declarado_por?: string | null
          updated_at?: string
        }
      }
    }
    Functions: {
      reservar_boletos: {
        Args: { p_numeros: string[]; p_sorteo_id: string; p_pedido_id: string }
        Returns: void
      }
      liberar_boletos_expirados: {
        Args: Record<string, never>
        Returns: void
      }
    }
  }
}
