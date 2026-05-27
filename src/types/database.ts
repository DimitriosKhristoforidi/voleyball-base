export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      game_participants: {
        Row: {
          attendance_note: string | null;
          created_at: string;
          game_id: string;
          has_paid: boolean;
          id: string;
          paid_amount: number | null;
          payment_method: Database["public"]["Enums"]["payment_method"] | null;
          payment_note: string | null;
          player_id: string;
          status: Database["public"]["Enums"]["participant_status"];
          updated_at: string;
        };
        Insert: {
          attendance_note?: string | null;
          created_at?: string;
          game_id: string;
          has_paid?: boolean;
          id?: string;
          paid_amount?: number | null;
          payment_method?: Database["public"]["Enums"]["payment_method"] | null;
          payment_note?: string | null;
          player_id: string;
          status?: Database["public"]["Enums"]["participant_status"];
          updated_at?: string;
        };
        Update: {
          attendance_note?: string | null;
          created_at?: string;
          game_id?: string;
          has_paid?: boolean;
          id?: string;
          paid_amount?: number | null;
          payment_method?: Database["public"]["Enums"]["payment_method"] | null;
          payment_note?: string | null;
          player_id?: string;
          status?: Database["public"]["Enums"]["participant_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "game_participants_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "game_participants_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
        ];
      };
      games: {
        Row: {
          created_at: string;
          end_time: string | null;
          game_date: string;
          id: string;
          max_players: number | null;
          notes: string | null;
          price_per_player: number | null;
          start_time: string;
          status: Database["public"]["Enums"]["game_status"];
          title: string | null;
          updated_at: string;
          venue_id: string | null;
        };
        Insert: {
          created_at?: string;
          end_time?: string | null;
          game_date: string;
          id?: string;
          max_players?: number | null;
          notes?: string | null;
          price_per_player?: number | null;
          start_time: string;
          status?: Database["public"]["Enums"]["game_status"];
          title?: string | null;
          updated_at?: string;
          venue_id?: string | null;
        };
        Update: {
          created_at?: string;
          end_time?: string | null;
          game_date?: string;
          id?: string;
          max_players?: number | null;
          notes?: string | null;
          price_per_player?: number | null;
          start_time?: string;
          status?: Database["public"]["Enums"]["game_status"];
          title?: string | null;
          updated_at?: string;
          venue_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "games_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
        ];
      };
      players: {
        Row: {
          created_at: string;
          full_name: string;
          id: string;
          is_active: boolean;
          notes: string | null;
          phone: string | null;
          telegram_url: string | null;
          telegram_username: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          full_name: string;
          id?: string;
          is_active?: boolean;
          notes?: string | null;
          phone?: string | null;
          telegram_url?: string | null;
          telegram_username?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string;
          id?: string;
          is_active?: boolean;
          notes?: string | null;
          phone?: string | null;
          telegram_url?: string | null;
          telegram_username?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      venues: {
        Row: {
          address: string | null;
          created_at: string;
          id: string;
          map_url: string | null;
          name: string;
          notes: string | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          id?: string;
          map_url?: string | null;
          name: string;
          notes?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          id?: string;
          map_url?: string | null;
          name?: string;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      game_status: "planned" | "completed" | "cancelled";
      participant_status:
        | "invited"
        | "confirmed"
        | "attended"
        | "absent"
        | "cancelled";
      payment_method: "cash" | "mbank" | "bank_transfer" | "other";
    };
    CompositeTypes: Record<string, never>;
  };
};
