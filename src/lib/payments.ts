// Cost / payment calculation helpers.
//
// The new cost model:
//   1. A game has a `total_cost` (optional).
//   2. Each participant has `played_minutes` (optional) and `is_billable`.
//   3. The total cost is split between billable participants proportionally
//      to their played minutes.
//
// All calculations are pure and deterministic so they can be re-used across
// pages, the Telegram generator, and future automation.

import { diffTimeMinutes } from "./date";
import type {
  Game,
  GameDetail,
  ParticipantStatus,
  ParticipantWithPlayer,
  PaymentStatus,
} from "@/types/domain";

/**
 * Statuses that are considered "active participation" by default and therefore
 * billable unless explicitly turned off.
 */
const BILLABLE_BY_DEFAULT_STATUSES: ReadonlySet<ParticipantStatus> = new Set([
  "confirmed",
  "attended",
]);

/**
 * Total scheduled duration of a game in minutes (from start_time → end_time).
 * Returns null when the data is incomplete.
 */
export function getGameDurationMinutes(
  game: Pick<Game, "start_time" | "end_time">,
): number | null {
  return diffTimeMinutes(game.start_time, game.end_time);
}

/**
 * Whether a participant should contribute to the cost split, given their
 * status and explicit `is_billable` flag. Cancelled and absent participants
 * never count, even if `is_billable` is true.
 */
export function isParticipantBillable(p: {
  status: ParticipantStatus;
  is_billable: boolean;
}): boolean {
  if (p.status === "cancelled" || p.status === "absent") return false;
  return p.is_billable;
}

/**
 * Default billable flag for a participant given their status only.
 * Used when status changes to keep the flag in a sensible default state.
 */
export function defaultBillableForStatus(status: ParticipantStatus): boolean {
  if (status === "cancelled" || status === "absent") return false;
  return BILLABLE_BY_DEFAULT_STATUSES.has(status) || status === "invited";
}

/**
 * Effective played minutes for a participant. If `played_minutes` is null,
 * default to the full scheduled game duration (when known and the participant
 * is treated as active).
 */
export function effectivePlayedMinutes(
  participant: Pick<ParticipantWithPlayer, "played_minutes" | "status">,
  gameDurationMinutes: number | null,
): number {
  if (participant.played_minutes != null) return participant.played_minutes;
  if (gameDurationMinutes == null) return 0;
  if (participant.status === "cancelled" || participant.status === "absent") {
    return 0;
  }
  return gameDurationMinutes;
}

export interface ParticipantPayment {
  participant_id: string;
  player_id: string;
  player_name: string;
  status: ParticipantStatus;
  is_billable: boolean;
  /** Minutes used for the cost split (defaulted from game duration when null). */
  played_minutes: number;
  /** Raw played_minutes value as entered by the admin (null = not set). */
  played_minutes_raw: number | null;
  /** Amount the participant owes for this game (0 if not billable). */
  owed_amount: number;
  paid_amount: number;
  remaining_amount: number;
  has_paid: boolean;
  payment_status: PaymentStatus;
}

export interface CostBreakdown {
  total_cost: number | null;
  game_duration_minutes: number | null;
  /** Sum of played minutes across billable participants. */
  total_billable_minutes: number;
  /** Number of billable participants. */
  billable_count: number;
  participants: ParticipantPayment[];
  /** Sum of all paid amounts. */
  collected: number;
  /** total_cost - collected (clamped to >= 0), or null when total_cost unknown. */
  remaining: number | null;
  paid_count: number;
  unpaid_count: number;
}

/**
 * Compute per-participant amounts owed/paid/remaining based on the game's
 * total cost and each participant's played minutes.
 *
 * The function is safe to call with a partially-filled game (no total_cost,
 * no end_time, etc.) — fields default to 0 / null as appropriate.
 */
export function calculateParticipantPayments(game: GameDetail): CostBreakdown {
  const duration = getGameDurationMinutes(game);
  const totalCost = game.total_cost;
  const participants = game.participants;

  // 1. Determine billable participants and their effective minutes.
  const enriched = participants.map((p) => {
    const billable = isParticipantBillable(p);
    const minutes = billable
      ? effectivePlayedMinutes(p, duration)
      : p.played_minutes ?? 0;
    return { p, billable, minutes };
  });

  const totalBillableMinutes = enriched
    .filter((e) => e.billable)
    .reduce((acc, e) => acc + e.minutes, 0);

  const billableCount = enriched.filter((e) => e.billable).length;

  // 2. Compute owed amount per participant proportionally.
  // We compute on the unrounded float for stability, then round amounts for
  // display only.
  const rows: ParticipantPayment[] = enriched.map(({ p, billable, minutes }) => {
    let owed = 0;
    if (billable && totalCost != null && totalBillableMinutes > 0) {
      owed = (totalCost * minutes) / totalBillableMinutes;
    }
    const paid = Number(p.paid_amount ?? 0);
    const remaining = Math.max(0, owed - paid);
    const status = derivePaymentStatus({
      owed,
      paid,
      has_paid: p.has_paid,
      billable,
    });

    return {
      participant_id: p.id,
      player_id: p.player_id,
      player_name: p.player.full_name,
      status: p.status,
      is_billable: billable,
      played_minutes: minutes,
      played_minutes_raw: p.played_minutes,
      owed_amount: round2(owed),
      paid_amount: round2(paid),
      remaining_amount: round2(remaining),
      has_paid: p.has_paid,
      payment_status: status,
    };
  });

  const collected = rows.reduce((acc, r) => acc + r.paid_amount, 0);
  const remaining =
    totalCost != null ? Math.max(0, round2(totalCost - collected)) : null;
  const paidCount = rows.filter(
    (r) => r.payment_status === "paid" || r.payment_status === "overpaid",
  ).length;
  const unpaidCount = rows.filter(
    (r) =>
      r.is_billable &&
      (r.payment_status === "unpaid" || r.payment_status === "partially_paid"),
  ).length;

  return {
    total_cost: totalCost,
    game_duration_minutes: duration,
    total_billable_minutes: totalBillableMinutes,
    billable_count: billableCount,
    participants: rows,
    collected: round2(collected),
    remaining,
    paid_count: paidCount,
    unpaid_count: unpaidCount,
  };
}

/**
 * Payment status is derived from owed/paid amounts; `has_paid` is only used
 * as a fallback when no monetary values are available yet.
 */
export function derivePaymentStatus(args: {
  owed: number;
  paid: number;
  has_paid: boolean;
  billable: boolean;
}): PaymentStatus {
  const { owed, paid, has_paid, billable } = args;
  if (!billable) return "not_billable";
  if (paid <= 0) {
    return has_paid ? "paid" : "unpaid";
  }
  // Use a small epsilon so floating-point round-trips don't flip status.
  const EPS = 0.005;
  if (paid + EPS >= owed && owed > 0) {
    return paid - EPS > owed ? "overpaid" : "paid";
  }
  if (owed <= 0) return "paid";
  return "partially_paid";
}

/**
 * Compute the auto-calculated total game cost from a venue hourly price and
 * the game's scheduled duration. Returns null when either is missing.
 */
export function computeAutoTotalCost(
  hourlyPrice: number | null | undefined,
  durationMinutes: number | null,
): number | null {
  if (hourlyPrice == null || durationMinutes == null || durationMinutes <= 0) {
    return null;
  }
  const hours = durationMinutes / 60;
  return round2(hourlyPrice * hours);
}

/** Round to two decimals, returning a finite number (NaN/Infinity → 0). */
export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * Convert a free-form hours string ("3", "2.5", "1,75") to a minute count.
 * Empty / invalid values resolve to null.
 */
export function hoursStringToMinutes(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 60);
}

/**
 * Convert minutes back to a hours string suitable for `<input type="number">`.
 * 0 → "", 90 → "1.5", 60 → "1".
 */
export function minutesToHoursString(
  minutes: number | null | undefined,
): string {
  if (minutes == null) return "";
  const hours = minutes / 60;
  // Round to 2 decimals, strip trailing zeros.
  return String(Math.round(hours * 100) / 100);
}

/** Format an amount: "3000" not "3000.00". Returns "0" for zero. */
export function formatAmount(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return "0";
  const fixed = amount.toFixed(2);
  return fixed.replace(/\.?0+$/, "") || "0";
}
