export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          phone_number: string | null
          school: string | null
          profile_photo_url: string | null
          created_at: string
          updated_at: string
          role: 'user' | 'admin'
          failed_attempts: number
        }
        Insert: {
          id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          phone_number?: string | null
          school?: string | null
          profile_photo_url?: string | null
          role?: 'user' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          phone_number?: string | null
          school?: string | null
          profile_photo_url?: string | null
          role?: 'user' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      research_posts: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string
          registration_link: string
          compensation_type: 'food' | 'money' | 'both' | 'none'
          compensation_details: string | null
          is_open: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description: string
          registration_link: string
          compensation_type: 'food' | 'money' | 'both' | 'none'
          compensation_details?: string | null
          is_open?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string
          registration_link?: string
          compensation_type?: 'food' | 'money' | 'both' | 'none'
          compensation_details?: string | null
          is_open?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'user' | 'admin'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}