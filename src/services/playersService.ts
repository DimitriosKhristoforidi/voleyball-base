import { supabase } from "@/lib/supabase";
import type { Player, PlayerInsert, PlayerUpdate } from "@/types/domain";

export const playersService = {
  async list(options?: {
    onlyActive?: boolean;
    search?: string;
  }): Promise<Player[]> {
    let query = supabase
      .from("players")
      .select("*")
      .order("is_active", { ascending: false })
      .order("full_name", { ascending: true });

    if (options?.onlyActive) {
      query = query.eq("is_active", true);
    }

    if (options?.search && options.search.trim().length > 0) {
      const term = `%${options.search.trim()}%`;
      query = query.or(
        `full_name.ilike.${term},telegram_username.ilike.${term},telegram_url.ilike.${term}`,
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<Player | null> {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(payload: PlayerInsert): Promise<Player> {
    const { data, error } = await supabase
      .from("players")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: PlayerUpdate): Promise<Player> {
    const { data, error } = await supabase
      .from("players")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async setActive(id: string, isActive: boolean): Promise<Player> {
    return playersService.update(id, { is_active: isActive });
  },

  /**
   * Hard delete. Will be blocked by FK if the player has game participations,
   * because game_participants.player_id uses ON DELETE RESTRICT.
   */
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("players").delete().eq("id", id);
    if (error) throw error;
  },
};
