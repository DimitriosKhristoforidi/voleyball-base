import type { Database } from "./database";

type Tables = Database["public"]["Tables"];

export type Player = Tables["players"]["Row"];
export type PlayerInsert = Tables["players"]["Insert"];
export type PlayerUpdate = Tables["players"]["Update"];

export type Venue = Tables["venues"]["Row"];
export type VenueInsert = Tables["venues"]["Insert"];
export type VenueUpdate = Tables["venues"]["Update"];

export type Game = Tables["games"]["Row"];
export type GameInsert = Tables["games"]["Insert"];
export type GameUpdate = Tables["games"]["Update"];

export type GameParticipant = Tables["game_participants"]["Row"];
export type GameParticipantInsert = Tables["game_participants"]["Insert"];
export type GameParticipantUpdate = Tables["game_participants"]["Update"];

export type GameTeam = Tables["game_teams"]["Row"];
export type GameTeamInsert = Tables["game_teams"]["Insert"];
export type GameTeamUpdate = Tables["game_teams"]["Update"];

export type GameStatus = Database["public"]["Enums"]["game_status"];
export type ParticipantStatus =
  Database["public"]["Enums"]["participant_status"];
export type PaymentMethod = Database["public"]["Enums"]["payment_method"];
export type CostSource = Database["public"]["Enums"]["cost_source"];

// Joined / composite shapes
export type GameWithVenue = Game & {
  venue: Venue | null;
};

export type ParticipantWithPlayer = GameParticipant & {
  player: Player;
};

export type GameDetail = GameWithVenue & {
  participants: ParticipantWithPlayer[];
  teams: GameTeam[];
};

/** A team plus the participants currently assigned to it. */
export type TeamWithMembers = GameTeam & {
  members: ParticipantWithPlayer[];
};

/** Sanitized game payload returned by `get_public_game` RPC (all participants, no payment fields). */
export interface PublicGameVenue {
  name: string;
  address: string | null;
  map_url: string | null;
}

export interface PublicGamePlayer {
  full_name: string;
  telegram_username: string | null;
}

export interface PublicGameView {
  id: string;
  title: string | null;
  game_date: string;
  start_time: string;
  end_time: string | null;
  status: GameStatus;
  max_players: number | null;
  venue: PublicGameVenue | null;
  players: PublicGamePlayer[];
}

// ---------- Constant arrays for select inputs / labels ----------

export const GAME_STATUSES: readonly GameStatus[] = [
  "planned",
  "completed",
  "cancelled",
] as const;

export const PARTICIPANT_STATUSES: readonly ParticipantStatus[] = [
  "invited",
  "confirmed",
  "attended",
  "absent",
  "cancelled",
] as const;

export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  "cash",
  "bank_transfer",
  "other",
] as const;

export const GAME_STATUS_LABEL_RU: Record<GameStatus, string> = {
  planned: "Запланирована",
  completed: "Завершена",
  cancelled: "Отменена",
};

export const PARTICIPANT_STATUS_LABEL_RU: Record<ParticipantStatus, string> = {
  invited: "Приглашён",
  confirmed: "Подтвердил",
  attended: "Пришёл",
  absent: "Не пришёл",
  cancelled: "Отказался",
};

export const PAYMENT_METHOD_LABEL_RU: Record<PaymentMethod, string> = {
  cash: "Наличные",
  bank_transfer: "Перевод",
  other: "Другое",
};

// ---------- Player positions ----------
//
// Stored as TEXT[] in Postgres for flexibility. The UI restricts input to the
// list below; the type only widens to string[] at the DB boundary.

export const PLAYER_POSITIONS = [
  "setter",
  "outside_hitter",
  "opposite",
  "middle_blocker",
  "libero",
  "universal",
] as const;

export type PlayerPosition = (typeof PLAYER_POSITIONS)[number];

export const PLAYER_POSITION_LABEL_RU: Record<PlayerPosition, string> = {
  setter: "Связующий",
  outside_hitter: "Доигровщик",
  opposite: "Диагональный",
  middle_blocker: "Центральный",
  libero: "Либеро",
  universal: "Универсал",
};

export function isPlayerPosition(value: string): value is PlayerPosition {
  return (PLAYER_POSITIONS as readonly string[]).includes(value);
}

// ---------- Teams ----------
//
// Color is stored as a token string; the UI maps it to concrete classes.

export const TEAM_COLORS = [
  "blue",
  "red",
  "emerald",
  "amber",
  "violet",
  "rose",
  "cyan",
  "orange",
] as const;

export type TeamColor = (typeof TEAM_COLORS)[number];

/** Cyrillic letters used to auto-name teams: Команда А, Команда Б, ... */
const TEAM_NAME_LETTERS = [
  "А",
  "Б",
  "В",
  "Г",
  "Д",
  "Е",
  "Ж",
  "З",
  "И",
  "К",
] as const;

/** Suggest a team name for the Nth (0-based) team in a game. */
export function nextTeamName(index: number): string {
  const letter = TEAM_NAME_LETTERS[index] ?? String(index + 1);
  return `Команда ${letter}`;
}

/** Suggest a team color for the Nth (0-based) team, cycling the palette. */
export function nextTeamColor(index: number): TeamColor {
  return TEAM_COLORS[index % TEAM_COLORS.length];
}

// ---------- Derived payment status (computed, not stored) ----------

export type PaymentStatus =
  | "unpaid"
  | "partially_paid"
  | "paid"
  | "overpaid"
  | "not_billable";

export const PAYMENT_STATUS_LABEL_RU: Record<PaymentStatus, string> = {
  unpaid: "Не оплачено",
  partially_paid: "Частично",
  paid: "Оплачено",
  overpaid: "Переплата",
  not_billable: "Без оплаты",
};
