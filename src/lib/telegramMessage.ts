import { formatDateRu, formatTimeRange } from "./date";
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
  /** Currency label, default "сом". */
  currency?: string;
}

/**
 * Build a copy-ready Russian Telegram message for a game.
 * Includes a numbered list of participants matching the given statuses.
 */
export function buildTelegramMessage(
  game: GameDetail,
  options: TelegramMessageOptions = {},
): string {
  const includeStatuses = options.includeStatuses ?? DEFAULT_INCLUDED_STATUSES;
  const currency = options.currency ?? "сом";

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

  if (game.price_per_player != null) {
    lines.push(
      `💵 Стоимость: ${formatAmount(game.price_per_player)} ${currency} с человека`,
    );
  }

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

  if (game.notes) {
    lines.push("");
    lines.push(game.notes);
  }

  return lines.join("\n");
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

function formatAmount(amount: number): string {
  // Strip trailing zeros after decimal but keep up to 2 decimals.
  const fixed = amount.toFixed(2);
  return fixed.replace(/\.?0+$/, "");
}
