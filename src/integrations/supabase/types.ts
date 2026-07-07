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
      agreements: {
        Row: {
          created_at: string
          deposit: number
          end_date: string
          id: string
          lock_in_months: number
          notes: string | null
          notice_period_days: number
          pdf_url: string | null
          rent: number
          start_date: string
          status: Database["public"]["Enums"]["agreement_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deposit?: number
          end_date: string
          id?: string
          lock_in_months?: number
          notes?: string | null
          notice_period_days?: number
          pdf_url?: string | null
          rent?: number
          start_date: string
          status?: Database["public"]["Enums"]["agreement_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deposit?: number
          end_date?: string
          id?: string
          lock_in_months?: number
          notes?: string | null
          notice_period_days?: number
          pdf_url?: string | null
          rent?: number
          start_date?: string
          status?: Database["public"]["Enums"]["agreement_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agreements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      electricity_bills: {
        Row: {
          amount: number
          created_at: string
          current_reading: number
          fixed_charge: number
          id: string
          notes: string | null
          paid: boolean
          pdf_url: string | null
          period_month: number
          period_year: number
          previous_reading: number
          rate: number
          tenant_id: string
          units: number | null
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          current_reading?: number
          fixed_charge?: number
          id?: string
          notes?: string | null
          paid?: boolean
          pdf_url?: string | null
          period_month: number
          period_year: number
          previous_reading?: number
          rate?: number
          tenant_id: string
          units?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          current_reading?: number
          fixed_charge?: number
          id?: string
          notes?: string | null
          paid?: boolean
          pdf_url?: string | null
          period_month?: number
          period_year?: number
          previous_reading?: number
          rate?: number
          tenant_id?: string
          units?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "electricity_bills_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          channel: string
          id: string
          message: string | null
          sent_at: string
          status: string
          tenant_id: string | null
          type: string
        }
        Insert: {
          channel?: string
          id?: string
          message?: string | null
          sent_at?: string
          status?: string
          tenant_id?: string | null
          type: string
        }
        Update: {
          channel?: string
          id?: string
          message?: string | null
          sent_at?: string
          status?: string
          tenant_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          mode: Database["public"]["Enums"]["payment_mode"]
          payment_date: string
          remarks: string | null
          rent_record_id: string
          tenant_id: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          mode?: Database["public"]["Enums"]["payment_mode"]
          payment_date?: string
          remarks?: string | null
          rent_record_id: string
          tenant_id: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          mode?: Database["public"]["Enums"]["payment_mode"]
          payment_date?: string
          remarks?: string | null
          rent_record_id?: string
          tenant_id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_rent_record_id_fkey"
            columns: ["rent_record_id"]
            isOneToOne: false
            referencedRelation: "rent_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rent_records: {
        Row: {
          amount_due: number
          amount_paid: number
          created_at: string
          due_date: string
          id: string
          notes: string | null
          period_month: number
          period_year: number
          status: Database["public"]["Enums"]["rent_status"]
          tenant_id: string
          updated_at: string
          water_charges: number
        }
        Insert: {
          amount_due?: number
          amount_paid?: number
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          period_month: number
          period_year: number
          status?: Database["public"]["Enums"]["rent_status"]
          tenant_id: string
          updated_at?: string
          water_charges?: number
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          period_month?: number
          period_year?: number
          status?: Database["public"]["Enums"]["rent_status"]
          tenant_id?: string
          updated_at?: string
          water_charges?: number
        }
        Relationships: [
          {
            foreignKeyName: "rent_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string
          floor: string | null
          id: string
          property_id: string
          room_number: string
        }
        Insert: {
          created_at?: string
          floor?: string | null
          id?: string
          property_id: string
          room_number: string
        }
        Update: {
          created_at?: string
          floor?: string | null
          id?: string
          property_id?: string
          room_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          aadhaar_url: string | null
          agreement_expiry: string | null
          alt_mobile: string | null
          created_at: string
          electricity_rate: number
          father_name: string | null
          full_name: string
          id: string
          joining_date: string
          mobile: string
          monthly_rent: number
          notes: string | null
          photo_url: string | null
          police_verification_url: string | null
          rent_due_day: number
          room_id: string | null
          security_deposit: number
          status: Database["public"]["Enums"]["tenant_status"]
          telegram_chat_id: string | null
          updated_at: string
          water_charges: number
        }
        Insert: {
          aadhaar_url?: string | null
          agreement_expiry?: string | null
          alt_mobile?: string | null
          created_at?: string
          electricity_rate?: number
          father_name?: string | null
          full_name: string
          id?: string
          joining_date: string
          mobile: string
          monthly_rent?: number
          notes?: string | null
          photo_url?: string | null
          police_verification_url?: string | null
          rent_due_day?: number
          room_id?: string | null
          security_deposit?: number
          status?: Database["public"]["Enums"]["tenant_status"]
          telegram_chat_id?: string | null
          updated_at?: string
          water_charges?: number
        }
        Update: {
          aadhaar_url?: string | null
          agreement_expiry?: string | null
          alt_mobile?: string | null
          created_at?: string
          electricity_rate?: number
          father_name?: string | null
          full_name?: string
          id?: string
          joining_date?: string
          mobile?: string
          monthly_rent?: number
          notes?: string | null
          photo_url?: string | null
          police_verification_url?: string | null
          rent_due_day?: number
          room_id?: string | null
          security_deposit?: number
          status?: Database["public"]["Enums"]["tenant_status"]
          telegram_chat_id?: string | null
          updated_at?: string
          water_charges?: number
        }
        Relationships: [
          {
            foreignKeyName: "tenants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_events: {
        Row: {
          created_at: string
          description: string
          event_date: string
          event_type: string
          id: string
          metadata: Json | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          description: string
          event_date?: string
          event_type: string
          id?: string
          metadata?: Json | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          description?: string
          event_date?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
      generate_monthly_rent: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      agreement_status: "active" | "expired" | "terminated" | "renewed"
      app_role: "admin" | "staff"
      payment_mode:
        | "cash"
        | "upi"
        | "bank_transfer"
        | "cheque"
        | "card"
        | "other"
      rent_status: "pending" | "paid" | "partial" | "overdue"
      tenant_status: "active" | "vacated" | "notice"
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
      agreement_status: ["active", "expired", "terminated", "renewed"],
      app_role: ["admin", "staff"],
      payment_mode: ["cash", "upi", "bank_transfer", "cheque", "card", "other"],
      rent_status: ["pending", "paid", "partial", "overdue"],
      tenant_status: ["active", "vacated", "notice"],
    },
  },
} as const
