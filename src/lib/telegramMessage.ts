import { formatDateRu, formatTimeRange } from "./date";
import {
  calculateParticipantPayments,
  formatAmount,
  type ParticipantPayment,
} from "./payments";
import type {
  GameDetail,
  ParticipantStatus,
  ParticipantWithPlayer,
} from "@/types/domain";

const DEFAULT_INCLUDED_STATUSES: readonly ParticipantStatus[] = [
  "confirmed",
  "attended",
];

export interface TelegramMessageOptions {
  /** Which participant statuses to include in the player list. */
  includeStatuses?: readonly ParticipantStatus[];
  /** When true, append per-player payment amounts at the bottom of the message. */
  includePerPlayerAmounts?: boolean;
  /** Optional currency override; defaults to the venue's currency or "сом". */
  currency?: string;
}

/**
 * Build a copy-ready Russian Telegram message for a game.
 *
 * Includes:
 *  - Header (title, date, time, venue, map link)
 *  - Numbered participant list (filtered by status)
 *  - Total venue cost + estimated per-player share
 *  - Optional per-participant amounts (toggled via `includePerPlayerAmounts`)
 */
export function buildTelegramMessage(
  game: GameDetail,
  options: TelegramMessageOptions = {},
): string {
  const includeStatuses = options.includeStatuses ?? DEFAULT_INCLUDED_STATUSES;
  const currency =
    options.currency ??
    (game.venue?.currency ? mapCurrencyLabel(game.venue.currency) : "сом");

  const lines: string[] = [];
  lines.push("🏐 Волейбол");
  if (game.title) {
    lines.push(game.title);
  }
  lines.push("");
  lines.push(`📅 Дата: ${formatDateRu(game.game_date)}`);

  const timeRange = formatTimeRange(game.start_time, game.end_time);
  if (timeRange) {
    lines.push(`🕘 Время: ${timeRange}`);
  }

  if (game.venue?.name) {
    const addr = game.venue.address ? `, ${game.venue.address}` : "";
    lines.push(`📍 Место: ${game.venue.name}${addr}`);
  }

  if (game.venue?.map_url) {
    lines.push(`🗺 Карта: ${game.venue.map_url}`);
  }

  // Participant list
  const eligible = game.participants
    .filter((p) => includeStatuses.includes(p.status))
    .sort(byCreatedAt);

  lines.push("");
  lines.push(`Участники (${eligible.length}):`);
  if (eligible.length === 0) {
    lines.push("— пока никого нет");
  } else {
    eligible.forEach((p, i) => {
      lines.push(`${i + 1}. ${displayName(p)}`);
    });
  }

  if (game.max_players) {
    lines.push("");
    lines.push(`Лимит: ${eligible.length}/${game.max_players}`);
  }

  // Cost summary
  const breakdown = calculateParticipantPayments(game);
  if (breakdown.total_cost != null) {
    lines.push("");
    lines.push(
      `💵 Стоимость площадки: ${formatAmount(breakdown.total_cost)} ${currency}`,
    );
    const billableConfirmed = breakdown.participants.filter(
      (r) => r.is_billable && includeStatuses.includes(r.status),
    );
    const approxPerPerson = approximatePerPersonAmount(
      breakdown.total_cost,
      billableConfirmed,
    );
    if (approxPerPerson != null) {
      lines.push(`Примерно с человека: ${formatAmount(approxPerPerson)} ${currency}`);
    }
  }

  // Optional per-player amounts
  if (options.includePerPlayerAmounts && breakdown.total_cost != null) {
    const rowsById = new Map(
      breakdown.participants.map((r) => [r.participant_id, r]),
    );
    const perPlayer = eligible
      .map((p) => rowsById.get(p.id))
      .filter(
        (row): row is ParticipantPayment =>
          !!row && row.is_billable && row.owed_amount > 0,
      );
    if (perPlayer.length > 0) {
      lines.push("");
      lines.push("Оплата:");
      perPlayer.forEach((row) => {
        lines.push(
          `- ${row.player_name}: ${formatAmount(row.owed_amount)} ${currency}`,
        );
      });
    }
  }

  if (game.notes) {
    lines.push("");
    lines.push(game.notes);
  }

  return lines.join("\n");
}

/**
 * Quick approximation of "сколько с человека" for the Telegram preview:
 * - If every billable participant has the same effective minutes, the actual
 *   amount; otherwise, total / count which is just an estimate.
 */
function approximatePerPersonAmount(
  totalCost: number,
  billable: ParticipantPayment[],
): number | null {
  if (billable.length === 0) return null;
  const minutesSet = new Set(billable.map((r) => r.played_minutes));
  if (minutesSet.size === 1) {
    return Math.round((totalCost / billable.length) * 100) / 100;
  }
  return Math.round((totalCost / billable.length) * 100) / 100;
}

/** Map ISO currency codes to a friendly Russian label. */
function mapCurrencyLabel(code: string): string {
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

function displayName(p: ParticipantWithPlayer): string {
  const name = p.player.full_name.trim();
  const tg = p.player.telegram_username?.trim();
  if (tg) {
    const handle = tg.startsWith("@") ? tg : `@${tg}`;
    return `${name} (${handle})`;
  }
  return name;
}

function byCreatedAt(
  a: ParticipantWithPlayer,
  b: ParticipantWithPlayer,
): number {
  return a.created_at.localeCompare(b.created_at);
}
