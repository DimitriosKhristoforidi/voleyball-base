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
  GameTeam,
  GameTeamInsert,
  GameTeamUpdate,
  GameUpdate,
  GameWithVenue,
  ParticipantStatus,
  ParticipantWithPlayer,
  PublicGameView,
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
    const [participants, teams] = await Promise.all([
      gameParticipantsService.listByGame(id),
      teamsService.listByGame(id),
    ]);
    return { ...game, participants, teams };
  },

  /** Public share view — works without authentication via RPC. */
  async getPublicView(id: string): Promise<PublicGameView | null> {
    const { data, error } = await supabase.rpc("get_public_game", {
      p_game_id: id,
    });
    if (error) throw error;
    if (data == null) return null;
    return parsePublicGameView(data);
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

function parsePublicGameView(data: unknown): PublicGameView | null {
  if (!data || typeof data !== "object" || !("id" in data)) return null;
  const raw = data as Record<string, unknown>;
  const players = Array.isArray(raw.players)
    ? raw.players.map((p) => {
        const row = p as Record<string, unknown>;
        return {
          full_name: String(row.full_name ?? ""),
          telegram_username:
            row.telegram_username != null
              ? String(row.telegram_username)
              : null,
        };
      })
    : [];

  let venue: PublicGameView["venue"] = null;
  if (raw.venue && typeof raw.venue === "object") {
    const v = raw.venue as Record<string, unknown>;
    venue = {
      name: String(v.name ?? ""),
      address: v.address != null ? String(v.address) : null,
      map_url: v.map_url != null ? String(v.map_url) : null,
    };
  }

  return {
    id: String(raw.id),
    title: raw.title != null ? String(raw.title) : null,
    game_date: String(raw.game_date),
    start_time: String(raw.start_time),
    end_time: raw.end_time != null ? String(raw.end_time) : null,
    status: raw.status as PublicGameView["status"],
    max_players:
      raw.max_players != null ? Number(raw.max_players) : null,
    venue,
    players,
  };
}

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

  /** Assign a participant to a team (or NULL to move them to the bench). */
  async assignTeam(
    participantId: string,
    teamId: string | null,
  ): Promise<void> {
    const { error } = await supabase
      .from("game_participants")
      .update({ team_id: teamId })
      .eq("id", participantId);
    if (error) throw error;
  },

  /** Apply many team assignments at once (used by shuffle/auto-split). */
  async assignTeamMany(
    assignments: { participantId: string; teamId: string | null }[],
  ): Promise<void> {
    await Promise.all(
      assignments.map(({ participantId, teamId }) =>
        gameParticipantsService.assignTeam(participantId, teamId),
      ),
    );
  },
};

export const teamsService = {
  async listByGame(gameId: string): Promise<GameTeam[]> {
    const { data, error } = await supabase
      .from("game_teams")
      .select("*")
      .eq("game_id", gameId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as GameTeam[];
  },

  async create(payload: GameTeamInsert): Promise<GameTeam> {
    const { data, error } = await supabase
      .from("game_teams")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: GameTeamUpdate): Promise<GameTeam> {
    const { data, error } = await supabase
      .from("game_teams")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Delete a team. Members are automatically moved to the bench by the
   * `ON DELETE SET NULL` foreign key on `game_participants.team_id`.
   */
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("game_teams").delete().eq("id", id);
    if (error) throw error;
  },
};
