/**
 * Supabase generated types (hand-maintained until `supabase gen types` recovers).
 * Includes Release 3 `dictionary_entries`. Regenerate via:
 *   npx supabase gen types typescript --linked --schema public
 * when the Management API is reachable, then replace this file.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      dictionary_entries: {
        Row: {
          id: string
          category: string
          value: string
          normalized_value: string
          parent_value: string | null
          status: string
          usage_count: number
          submitted_by: string | null
          submitted_company_id: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          approved_at: string | null
          rejection_note: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category: string
          value: string
          normalized_value: string
          parent_value?: string | null
          status?: string
          usage_count?: number
          submitted_by?: string | null
          submitted_company_id?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          approved_at?: string | null
          rejection_note?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category?: string
          value?: string
          normalized_value?: string
          parent_value?: string | null
          status?: string
          usage_count?: number
          submitted_by?: string | null
          submitted_company_id?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          approved_at?: string | null
          rejection_note?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dictionary_entries_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dictionary_entries_submitted_company_id_fkey"
            columns: ["submitted_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dictionary_entries_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      activate_urgent_property: {
        Args: { p_property_id: string }
        Returns: undefined
      }
      activate_urgent_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
    }
    Enums: {
      user_role: "admin" | "agent" | "super_admin"
    }
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]