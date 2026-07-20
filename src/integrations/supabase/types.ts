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
      investment_amount_audit: {
        Row: {
          amount_sek: number
          created_at: string
          id: string
          reason: string
          selection_id: string | null
          user_id: string
        }
        Insert: {
          amount_sek: number
          created_at?: string
          id?: string
          reason: string
          selection_id?: string | null
          user_id: string
        }
        Update: {
          amount_sek?: number
          created_at?: string
          id?: string
          reason?: string
          selection_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_amount_audit_selection_id_fkey"
            columns: ["selection_id"]
            isOneToOne: false
            referencedRelation: "investment_selections"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_selections: {
        Row: {
          created_at: string
          deposit_address: string | null
          deposit_memo: string | null
          enhanced_review_required: boolean
          funded_amount_sek: number | null
          funded_at: string | null
          id: string
          level_name: string
          manual_review_required: boolean
          onramp_currency: string | null
          onramp_method: string | null
          onramp_provider: string | null
          onramp_status: string
          risk_acknowledged: boolean
          selected_amount_sek: number
          status: Database["public"]["Enums"]["investment_selection_status"]
          strategy_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deposit_address?: string | null
          deposit_memo?: string | null
          enhanced_review_required?: boolean
          funded_amount_sek?: number | null
          funded_at?: string | null
          id?: string
          level_name: string
          manual_review_required?: boolean
          onramp_currency?: string | null
          onramp_method?: string | null
          onramp_provider?: string | null
          onramp_status?: string
          risk_acknowledged?: boolean
          selected_amount_sek: number
          status?: Database["public"]["Enums"]["investment_selection_status"]
          strategy_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deposit_address?: string | null
          deposit_memo?: string | null
          enhanced_review_required?: boolean
          funded_amount_sek?: number | null
          funded_at?: string | null
          id?: string
          level_name?: string
          manual_review_required?: boolean
          onramp_currency?: string | null
          onramp_method?: string | null
          onramp_provider?: string | null
          onramp_status?: string
          risk_acknowledged?: boolean
          selected_amount_sek?: number
          status?: Database["public"]["Enums"]["investment_selection_status"]
          strategy_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolio_holdings: {
        Row: {
          asset_type: string
          avg_cost_sek: number
          created_at: string
          id: string
          quantity: number
          symbol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_type?: string
          avg_cost_sek?: number
          created_at?: string
          id?: string
          quantity?: number
          symbol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_type?: string
          avg_cost_sek?: number
          created_at?: string
          id?: string
          quantity?: number
          symbol?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_strategy: string | null
          address: string | null
          birth_date: string | null
          cash_balance_sek: number
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          employment: string | null
          experience_level: string | null
          first_name: string | null
          funds_origin: string | null
          id: string
          income_range: string | null
          investment_horizon: string | null
          last_name: string | null
          onboarding_completed: boolean
          phone: string | null
          planned_investment: string | null
          postal_code: string | null
          risk_profile: string | null
          tour_completed: boolean
          updated_at: string
          verification_status: string
        }
        Insert: {
          active_strategy?: string | null
          address?: string | null
          birth_date?: string | null
          cash_balance_sek?: number
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          employment?: string | null
          experience_level?: string | null
          first_name?: string | null
          funds_origin?: string | null
          id: string
          income_range?: string | null
          investment_horizon?: string | null
          last_name?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          planned_investment?: string | null
          postal_code?: string | null
          risk_profile?: string | null
          tour_completed?: boolean
          updated_at?: string
          verification_status?: string
        }
        Update: {
          active_strategy?: string | null
          address?: string | null
          birth_date?: string | null
          cash_balance_sek?: number
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          employment?: string | null
          experience_level?: string | null
          first_name?: string | null
          funds_origin?: string | null
          id?: string
          income_range?: string | null
          investment_horizon?: string | null
          last_name?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          planned_investment?: string | null
          postal_code?: string | null
          risk_profile?: string | null
          tour_completed?: boolean
          updated_at?: string
          verification_status?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          asset_type: string
          created_at: string
          executed_at: string
          fee_sek: number
          id: string
          price_sek: number
          quantity: number
          side: string
          symbol: string
          total_sek: number
          user_id: string
        }
        Insert: {
          asset_type?: string
          created_at?: string
          executed_at?: string
          fee_sek?: number
          id?: string
          price_sek: number
          quantity: number
          side: string
          symbol: string
          total_sek: number
          user_id: string
        }
        Update: {
          asset_type?: string
          created_at?: string
          executed_at?: string
          fee_sek?: number
          id?: string
          price_sek?: number
          quantity?: number
          side?: string
          symbol?: string
          total_sek?: number
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      investment_selection_status:
        | "draft"
        | "pending_review"
        | "approved"
        | "rejected"
        | "cancelled"
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
      app_role: ["admin", "user"],
      investment_selection_status: [
        "draft",
        "pending_review",
        "approved",
        "rejected",
        "cancelled",
      ],
    },
  },
} as const
