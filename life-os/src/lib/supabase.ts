import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

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
          comment: string | null;
          completed_at: string | null;
          is_event: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          deadline?: string | null;
          status?: string;
          category?: string | null;
          comment?: string | null;
          completed_at?: string | null;
          is_event?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          deadline?: string | null;
          status?: string;
          category?: string | null;
          comment?: string | null;
          completed_at?: string | null;
          is_event?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      habits: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          interval_type: string;
          interval_days: number[] | null;
          quarter_half_year_config: Record<string, unknown> | null;
          last_done_date: string | null;
          completion_records: Record<string, boolean>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          interval_type: string;
          interval_days?: number[] | null;
          quarter_half_year_config?: Record<string, unknown> | null;
          last_done_date?: string | null;
          completion_records?: Record<string, boolean>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          interval_type?: string;
          interval_days?: number[] | null;
          quarter_half_year_config?: Record<string, unknown> | null;
          last_done_date?: string | null;
          completion_records?: Record<string, boolean>;
          created_at?: string;
          updated_at?: string;
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
          account_id: string | null;
          ticker: string;
          name: string | null;
          market: string;
          target_ratio: number;
          current_quantity: number;
          avg_price: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id?: string | null;
          ticker: string;
          name?: string | null;
          market?: string;
          target_ratio: number;
          current_quantity?: number;
          avg_price?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_id?: string | null;
          ticker?: string;
          name?: string | null;
          market?: string;
          target_ratio?: number;
          current_quantity?: number;
          avg_price?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          cash: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          cash?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          cash?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
