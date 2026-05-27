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

export type GameStatus = Database["public"]["Enums"]["game_status"];
export type ParticipantStatus =
  Database["public"]["Enums"]["participant_status"];
export type PaymentMethod = Database["public"]["Enums"]["payment_method"];

// Joined / composite shapes
export type GameWithVenue = Game & {
  venue: Venue | null;
};

export type ParticipantWithPlayer = GameParticipant & {
  player: Player;
};

export type GameDetail = GameWithVenue & {
  participants: ParticipantWithPlayer[];
};

// Constant arrays for select inputs / labels
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
  "mbank",
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
  mbank: "MBank",
  bank_transfer: "Перевод",
  other: "Другое",
};
