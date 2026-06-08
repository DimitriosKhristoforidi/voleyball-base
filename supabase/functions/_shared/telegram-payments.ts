import type { GameRow } from "./game-data.ts";

function diffTimeMinutes(start: string, end: string | null): number | null {
  if (!end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return null;
  let diff = eh * 60 + em - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return diff;
}

function isParticipantBillable(p: {
  status: string;
  is_billable: boolean;
}): boolean {
  if (p.status === "cancelled" || p.status === "absent") return false;
  return p.is_billable;
}

function effectivePlayedMinutes(
  participant: { played_minutes: number | null; status: string },
  gameDurationMinutes: number | null,
): number {
  if (participant.played_minutes != null) return participant.played_minutes;
  if (gameDurationMinutes == null) return 0;
  if (
    participant.status === "cancelled" || participant.status === "absent"
  ) {
    return 0;
  }
  return gameDurationMinutes;
}

/** Per-person share (Math.ceil), aligned with proportional cost split in the admin app. */
export function computeCeilPerPersonPayment(game: GameRow): number | null {
  const totalCost = game.total_cost;
  if (totalCost == null || totalCost <= 0) return null;

  const duration = diffTimeMinutes(game.start_time, game.end_time);
  const billable = game.participants_billing.filter(isParticipantBillable);
  if (billable.length === 0) return null;

  const totalBillableMinutes = billable.reduce(
    (acc, p) => acc + effectivePlayedMinutes(p, duration),
    0,
  );
  if (totalBillableMinutes <= 0) {
    return Math.ceil(totalCost / billable.length);
  }

  const owedAmounts = billable.map((p) => {
    const minutes = effectivePlayedMinutes(p, duration);
    return (totalCost * minutes) / totalBillableMinutes;
  });

  // One line for the group: round up the typical full-session share.
  const typicalOwed = Math.max(...owedAmounts);
  return Math.ceil(typicalOwed);
}

export function mapCurrencyLabel(code: string): string {
  const upper = code.trim().toUpperCase();
  switch (upper) {
    case "KGS":
      return "сом";
    case "RUB":
      return "руб";
    case "KZT":
      return "тг";
    case "USD":
      return "$";
    case "EUR":
      return "€";
    default:
      return upper;
  }
}
