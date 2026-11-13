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
      app_config: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      documentos: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          solicitud_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          solicitud_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          solicitud_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_solicitud_id_fkey"
            columns: ["solicitud_id"]
            isOneToOne: false
            referencedRelation: "solicitudes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      email_action_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          solicitud_id: string
          stage: string
          token: string
          used_action: string | null
          used_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          solicitud_id: string
          stage: string
          token: string
          used_action?: string | null
          used_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          solicitud_id?: string
          stage?: string
          token?: string
          used_action?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_action_tokens_solicitud_id_fkey"
            columns: ["solicitud_id"]
            isOneToOne: false
            referencedRelation: "solicitudes"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitudes: {
        Row: {
          approver: string
          approver_email: string
          calamidad_descripcion: string | null
          calamidad_subcategoria: string | null
          calamidad_tipo: string | null
          ciudad: string | null
          created_at: string
          dias_habiles: number
          direccion: string | null
          document_deadline: string | null
          document_status: Database["public"]["Enums"]["document_status"]
          employee_area: string
          employee_id: string
          employee_initials: string
          employee_name: string
          fecha_fin: string
          fecha_inicio: string
          fecha_solicitud: string
          hora_fin: string | null
          hora_inicio: string | null
          id: string
          info_request_message: string | null
          luto_familiar: string | null
          motivo: string
          pais: string | null
          rejected_by: string | null
          rejection_date: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["request_status"]
          timeline: Json
          type: string
          updated_at: string
        }
        Insert: {
          approver: string
          approver_email: string
          calamidad_descripcion?: string | null
          calamidad_subcategoria?: string | null
          calamidad_tipo?: string | null
          ciudad?: string | null
          created_at?: string
          dias_habiles?: number
          direccion?: string | null
          document_deadline?: string | null
          document_status?: Database["public"]["Enums"]["document_status"]
          employee_area: string
          employee_id: string
          employee_initials: string
          employee_name: string
          fecha_fin: string
          fecha_inicio: string
          fecha_solicitud: string
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          info_request_message?: string | null
          luto_familiar?: string | null
          motivo: string
          pais?: string | null
          rejected_by?: string | null
          rejection_date?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          timeline?: Json
          type: string
          updated_at?: string
        }
        Update: {
          approver?: string
          approver_email?: string
          calamidad_descripcion?: string | null
          calamidad_subcategoria?: string | null
          calamidad_tipo?: string | null
          ciudad?: string | null
          created_at?: string
          dias_habiles?: number
          direccion?: string | null
          document_deadline?: string | null
          document_status?: Database["public"]["Enums"]["document_status"]
          employee_area?: string
          employee_id?: string
          employee_initials?: string
          employee_name?: string
          fecha_fin?: string
          fecha_inicio?: string
          fecha_solicitud?: string
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          info_request_message?: string | null
          luto_familiar?: string | null
          motivo?: string
          pais?: string | null
          rejected_by?: string | null
          rejection_date?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          timeline?: Json
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          area: string
          cedula: string | null
          created_at: string
          email: string
          id: string
          initials: string
          leader_email: string | null
          leader_id: string | null
          leader_name: string | null
          name: string
          notification_email: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          area: string
          cedula?: string | null
          created_at?: string
          email: string
          id?: string
          initials: string
          leader_email?: string | null
          leader_id?: string | null
          leader_name?: string | null
          name: string
          notification_email?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          area?: string
          cedula?: string | null
          created_at?: string
          email?: string
          id?: string
          initials?: string
          leader_email?: string | null
          leader_id?: string | null
          leader_name?: string | null
          name?: string
          notification_email?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      document_status:
        | "sin_documentos"
        | "documentos_cargados"
        | "aprobado_finalizado"
        | "mas_info"
      request_status:
        | "pendiente"
        | "notificado"
        | "en_revision_th"
        | "aprobado"
        | "denegado"
        | "soportes_pendientes"
        | "soportes_en_revision"
        | "finalizado"
        | "mas_info_requerida"
      user_role: "employee" | "leader" | "hr"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      document_status: [
        "sin_documentos",
        "documentos_cargados",
        "aprobado_finalizado",
        "mas_info",
      ],
      request_status: [
        "pendiente",
        "notificado",
        "en_revision_th",
        "aprobado",
        "denegado",
        "soportes_pendientes",
        "soportes_en_revision",
        "finalizado",
        "mas_info_requerida",
      ],
      user_role: ["employee", "leader", "hr"],
    },
  },
} as const
