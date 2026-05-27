import { supabase } from "@/lib/supabase";
import { todayISO } from "@/lib/date";
import type {
  Game,
  GameDetail,
  GameInsert,
  GameParticipant,
  GameParticipantInsert,
  GameParticipantUpdate,
  GameStatus,
  GameUpdate,
  GameWithVenue,
  ParticipantStatus,
  ParticipantWithPlayer,
} from "@/types/domain";

export interface GamesListFilter {
  status?: GameStatus | "all";
  /** "upcoming" = today and later, "past" = strictly before today. */
  range?: "all" | "upcoming" | "past";
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export const gamesService = {
  async list(filter: GamesListFilter = {}): Promise<GameWithVenue[]> {
    let query = supabase
      .from("games")
      .select("*, venue:venues(*)")
      .order("game_date", { ascending: false })
      .order("start_time", { ascending: false });

    if (filter.status && filter.status !== "all") {
      query = query.eq("status", filter.status);
    }

    const today = todayISO();
    if (filter.range === "upcoming") {
      query = query.gte("game_date", today);
    } else if (filter.range === "past") {
      query = query.lt("game_date", today);
    }

    if (filter.dateFrom) query = query.gte("game_date", filter.dateFrom);
    if (filter.dateTo) query = query.lte("game_date", filter.dateTo);
    if (filter.limit) query = query.limit(filter.limit);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as GameWithVenue[];
  },

  async listUpcoming(limit = 10): Promise<GameWithVenue[]> {
    const { data, error } = await supabase
      .from("games")
      .select("*, venue:venues(*)")
      .gte("game_date", todayISO())
      .neq("status", "cancelled")
      .order("game_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as GameWithVenue[];
  },

  async getById(id: string): Promise<GameWithVenue | null> {
    const { data, error } = await supabase
      .from("games")
      .select("*, venue:venues(*)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as GameWithVenue) ?? null;
  },

  async getDetail(id: string): Promise<GameDetail | null> {
    const game = await gamesService.getById(id);
    if (!game) return null;
    const participants = await gameParticipantsService.listByGame(id);
    return { ...game, participants };
  },

  async create(payload: GameInsert): Promise<Game> {
    const { data, error } = await supabase
      .from("games")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: GameUpdate): Promise<Game> {
    const { data, error } = await supabase
      .from("games")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("games").delete().eq("id", id);
    if (error) throw error;
  },
};

export const gameParticipantsService = {
  async listByGame(gameId: string): Promise<ParticipantWithPlayer[]> {
    const { data, error } = await supabase
      .from("game_participants")
      .select("*, player:players(*)")
      .eq("game_id", gameId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as ParticipantWithPlayer[];
  },

  async listUnpaidUpcoming(): Promise<ParticipantWithPlayer[]> {
    const { data, error } = await supabase
      .from("game_participants")
      .select("*, player:players(*), game:games!inner(id, game_date, status)")
      .eq("has_paid", false)
      .in("status", ["confirmed", "attended"])
      .gte("game.game_date", todayISO())
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as ParticipantWithPlayer[];
  },

  async add(payload: GameParticipantInsert): Promise<GameParticipant> {
    const { data, error } = await supabase
      .from("game_participants")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async addMany(
    gameId: string,
    playerIds: string[],
    status: ParticipantStatus = "invited",
  ): Promise<void> {
    if (playerIds.length === 0) return;
    const rows = playerIds.map<GameParticipantInsert>((player_id) => ({
      game_id: gameId,
      player_id,
      status,
    }));
    const { error } = await supabase.from("game_participants").insert(rows);
    if (error) throw error;
  },

  async update(
    id: string,
    payload: GameParticipantUpdate,
  ): Promise<GameParticipant> {
    const { data, error } = await supabase
      .from("game_participants")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from("game_participants")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};
