import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

export interface GameRow {
  id: string;
  title: string | null;
  game_date: string;
  start_time: string;
  end_time: string | null;
  status: string;
  max_players: number | null;
  notes: string | null;
  telegram_reminder_sent_at: string | null;
  venue: {
    name: string;
    address: string | null;
    map_url: string | null;
    currency: string;
  } | null;
  players: { full_name: string; telegram_username: string | null }[];
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
    .select("created_at, player:players ( full_name, telegram_username )")
    .eq("game_id", gameId)
    .order("created_at", { ascending: true });

  if (pErr) throw pErr;

  const players = (participants ?? []).map((row) => {
    const p = row.player as {
      full_name: string;
      telegram_username: string | null;
    };
    return {
      full_name: p.full_name,
      telegram_username: p.telegram_username,
    };
  });

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
    telegram_reminder_sent_at: game.telegram_reminder_sent_at,
    venue,
    players,
  };
}

/** Games scheduled for tomorrow (Asia/Bishkek) that have not been reminded yet. */
export async function fetchGamesDueForReminder(
  admin: SupabaseClient,
): Promise<GameRow[]> {
  const tomorrow = tomorrowISOInTimeZone("Asia/Bishkek");

  const { data: games, error } = await admin
    .from("games")
    .select("id")
    .eq("game_date", tomorrow)
    .eq("status", "planned")
    .is("telegram_reminder_sent_at", null);

  if (error) throw error;
  if (!games?.length) return [];

  const rows: GameRow[] = [];
  for (const g of games) {
    const row = await fetchGameForTelegram(admin, g.id);
    if (row) rows.push(row);
  }
  return rows;
}

function tomorrowISOInTimeZone(timeZone: string): string {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return tomorrow.toLocaleDateString("en-CA", { timeZone });
}
