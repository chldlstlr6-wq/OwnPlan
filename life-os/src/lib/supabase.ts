import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export type Database = {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          deadline: string | null;
          status: string;
          category: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          deadline?: string | null;
          status?: string;
          category?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          deadline?: string | null;
          status?: string;
          category?: string | null;
          created_at?: string;
        };
      };
      habits: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          interval_type: string;
          last_done_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          interval_type: string;
          last_done_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          interval_type?: string;
          last_done_date?: string | null;
          created_at?: string;
        };
      };
      scraping_targets: {
        Row: {
          id: string;
          user_id: string;
          target_url: string;
          selector: string | null;
          last_content_hash: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          target_url: string;
          selector?: string | null;
          last_content_hash?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          target_url?: string;
          selector?: string | null;
          last_content_hash?: string | null;
          created_at?: string;
        };
      };
      portfolio: {
        Row: {
          id: string;
          user_id: string;
          ticker: string;
          target_ratio: number;
          current_quantity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ticker: string;
          target_ratio: number;
          current_quantity?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          ticker?: string;
          target_ratio?: number;
          current_quantity?: number;
          created_at?: string;
        };
      };
    };
  };
};
