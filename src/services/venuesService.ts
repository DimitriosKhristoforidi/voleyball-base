import { supabase } from "@/lib/supabase";
import type { Venue, VenueInsert, VenueUpdate } from "@/types/domain";

export const venuesService = {
  async list(): Promise<Venue[]> {
    const { data, error } = await supabase
      .from("venues")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<Venue | null> {
    const { data, error } = await supabase
      .from("venues")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(payload: VenueInsert): Promise<Venue> {
    const { data, error } = await supabase
      .from("venues")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: VenueUpdate): Promise<Venue> {
    const { data, error } = await supabase
      .from("venues")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Hard delete. Blocked by FK if games reference this venue
   * (games.venue_id uses ON DELETE RESTRICT).
   */
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("venues").delete().eq("id", id);
    if (error) throw error;
  },
};
