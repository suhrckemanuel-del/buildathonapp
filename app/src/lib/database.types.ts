// Auto-generated Supabase types — regenerate with:
// npx supabase gen types typescript --project-id uijpgioeqgoitfqwakqj > src/lib/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: { id: string; username: string; avatar_url: string | null; created_at: string };
        Insert: { id: string; username: string; avatar_url?: string | null };
        Update: { username?: string; avatar_url?: string | null };
        Relationships: [];
      };
      interest_profiles: {
        Row: { id: string; user_id: string; category: string; data: Json; embedding: number[] | null; created_at: string; updated_at: string };
        Insert: { user_id: string; category: string; data: Json; embedding?: number[] | null };
        Update: { data?: Json; embedding?: number[] | null; updated_at?: string };
        Relationships: [];
      };
      match_requests: {
        Row: { id: string; user_id: string; prompt_text: string | null; status: string; expires_at: string; created_at: string };
        Insert: { user_id: string; prompt_text?: string | null; expires_at?: string };
        Update: { status?: string };
        Relationships: [];
      };
      groups: {
        Row: { id: string; name: string; summary: string; match_request_id: string | null; created_at: string };
        Insert: { name: string; summary: string; match_request_id?: string | null };
        Update: {};
        Relationships: [];
      };
      group_members: {
        Row: { group_id: string; user_id: string; joined_at: string };
        Insert: { group_id: string; user_id: string };
        Update: {};
        Relationships: [];
      };
      messages: {
        Row: { id: string; group_id: string; sender_id: string | null; content: string; is_ai_opener: boolean; created_at: string };
        Insert: { group_id: string; sender_id?: string | null; content: string; is_ai_opener?: boolean };
        Update: {};
        Relationships: [];
      };
      events: {
        Row: { id: string; group_id: string; created_by: string; title: string; description: string | null; event_at: string; created_at: string };
        Insert: { group_id: string; created_by: string; title: string; description?: string | null; event_at: string };
        Update: { title?: string; description?: string | null; event_at?: string };
        Relationships: [];
      };
      event_rsvps: {
        Row: { event_id: string; user_id: string; status: 'going' | 'maybe' | 'not_going' };
        Insert: { event_id: string; user_id: string; status?: 'going' | 'maybe' | 'not_going' };
        Update: { status?: 'going' | 'maybe' | 'not_going' };
        Relationships: [];
      };
      safety_events: {
        Row: {
          id: string;
          actor_user_id: string;
          group_id: string | null;
          target_user_id: string | null;
          action: 'leave' | 'report' | 'mute' | 'block';
          note: string | null;
          created_at: string;
        };
        Insert: {
          actor_user_id: string;
          group_id?: string | null;
          target_user_id?: string | null;
          action: 'leave' | 'report' | 'mute' | 'block';
          note?: string | null;
        };
        Update: {};
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}
