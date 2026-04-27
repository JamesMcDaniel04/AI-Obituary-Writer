export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      cases: {
        Row: {
          created_at: string
          director_id: string
          family_name: string
          id: string
          questionnaire_token: string
          status: Database["public"]["Enums"]["case_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          director_id: string
          family_name: string
          id?: string
          questionnaire_token: string
          status?: Database["public"]["Enums"]["case_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          director_id?: string
          family_name?: string
          id?: string
          questionnaire_token?: string
          status?: Database["public"]["Enums"]["case_status"]
          updated_at?: string
        }
        Relationships: []
      }
      director_profiles: {
        Row: {
          created_at: string
          director_id: string
          logo_path: string | null
          organization_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          director_id: string
          logo_path?: string | null
          organization_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          director_id?: string
          logo_path?: string | null
          organization_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      obituary_drafts: {
        Row: {
          ai_provider: string
          case_id: string
          content: string
          generated_at: string
          id: string
          model: string
          updated_at: string
        }
        Insert: {
          ai_provider: string
          case_id: string
          content: string
          generated_at?: string
          id?: string
          model: string
          updated_at?: string
        }
        Update: {
          ai_provider?: string
          case_id?: string
          content?: string
          generated_at?: string
          id?: string
          model?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obituary_drafts_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      obituary_edits: {
        Row: {
          case_id: string
          content_after: string
          content_before: string
          director_id: string
          edited_at: string
          id: string
        }
        Insert: {
          case_id: string
          content_after: string
          content_before: string
          director_id: string
          edited_at?: string
          id?: string
        }
        Update: {
          case_id?: string
          content_after?: string
          content_before?: string
          director_id?: string
          edited_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "obituary_edits_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_rate_limits: {
        Row: {
          case_id: string
          ip_hash: string
          request_count: number
          window_start: string
        }
        Insert: {
          case_id: string
          ip_hash: string
          request_count?: number
          window_start: string
        }
        Update: {
          case_id?: string
          ip_hash?: string
          request_count?: number
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_rate_limits_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_responses: {
        Row: {
          answer: string
          case_id: string
          created_at: string
          id: string
          question_key: string
        }
        Insert: {
          answer: string
          case_id: string
          created_at?: string
          id?: string
          question_key: string
        }
        Update: {
          answer?: string
          case_id?: string
          created_at?: string
          id?: string
          question_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_responses_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      enforce_questionnaire_rate_limit: {
        Args: {
          p_case_id: string
          p_ip_hash: string
          p_max_requests?: number
          p_window_seconds?: number
        }
        Returns: {
          allowed: boolean
          remaining: number
          reset_at: string
        }[]
      }
    }
    Enums: {
      case_status: "questionnaire_sent" | "draft_ready" | "delivered"
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
      case_status: ["questionnaire_sent", "draft_ready", "delivered"],
    },
  },
} as const

