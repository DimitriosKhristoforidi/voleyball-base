import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

export interface ParticipantBillingRow {
  status: string;
  is_billable: boolean;
  played_minutes: number | null;
}

export interface GameTeamRow {
  id: string;
  name: string;
  color: string;
  sort_order: number;
}

export interface RosterRow {
  full_name: string;
  telegram_username: string | null;
  team_id: string | null;
  status: string;
}

export interface GameRow {
  id: string;
  title: string | null;
  game_date: string;
  start_time: string;
  end_time: string | null;
  status: string;
  max_players: number | null;
  notes: string | null;
  total_cost: number | null;
  telegram_reminder_sent_at: string | null;
  venue: {
    name: string;
    address: string | null;
    map_url: string | null;
    currency: string;
  } | null;
  players: { full_name: string; telegram_username: string | null }[];
  participants_billing: ParticipantBillingRow[];
  teams: GameTeamRow[];
  roster: RosterRow[];
}

export function createAdminClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("Missing Supabase service configuration");
  }
  return createClient(url, key);
}

export async function fetchGameForTelegram(
  admin: SupabaseClient,
  gameId: string,
): Promise<GameRow | null> {
  const { data: game, error } = await admin
    .from("games")
    .select(
      `
      id,
      title,
      game_date,
      start_time,
      end_time,
      status,
      max_players,
      notes,
      total_cost,
      telegram_reminder_sent_at,
      venue:venues ( name, address, map_url, currency )
    `,
    )
    .eq("id", gameId)
    .maybeSingle();

  if (error) throw error;
  if (!game) return null;

  const { data: participants, error: pErr } = await admin
    .from("game_participants")
    .select(
      "created_at, status, is_billable, played_minutes, team_id, player:players ( full_name, telegram_username )",
    )
    .eq("game_id", gameId)
    .order("created_at", { ascending: true });

  if (pErr) throw pErr;

  const participants_billing: ParticipantBillingRow[] = [];
  const players: GameRow["players"] = [];
  const roster: RosterRow[] = [];
  for (const row of participants ?? []) {
    participants_billing.push({
      status: String(row.status),
      is_billable: Boolean(row.is_billable),
      played_minutes: row.played_minutes != null
        ? Number(row.played_minutes)
        : null,
    });
    const p = row.player as {
      full_name: string;
      telegram_username: string | null;
    };
    players.push({
      full_name: p.full_name,
      telegram_username: p.telegram_username,
    });
    roster.push({
      full_name: p.full_name,
      telegram_username: p.telegram_username,
      team_id: row.team_id != null ? String(row.team_id) : null,
      status: String(row.status),
    });
  }

  const { data: teamsData, error: tErr } = await admin
    .from("game_teams")
    .select("id, name, color, sort_order")
    .eq("game_id", gameId)
    .order("sort_order", { ascending: true });

  if (tErr) throw tErr;

  const teams: GameTeamRow[] = (teamsData ?? []).map((t) => ({
    id: String(t.id),
    name: String(t.name),
    color: String(t.color),
    sort_order: Number(t.sort_order),
  }));

  const venueRaw = game.venue as GameRow["venue"] | GameRow["venue"][] | null;
  const venue = Array.isArray(venueRaw) ? venueRaw[0] ?? null : venueRaw;

  return {
    id: game.id,
    title: game.title,
    game_date: game.game_date,
    start_time: game.start_time,
    end_time: game.end_time,
    status: game.status,
    max_players: game.max_players,
    notes: game.notes,
    total_cost: game.total_cost != null ? Number(game.total_cost) : null,
    telegram_reminder_sent_at: game.telegram_reminder_sent_at,
    venue,
    players,
    participants_billing,
    teams,
    roster,
  };
}
