import { formatDateRu, formatTimeRange } from "@/lib/date";
import {
  effectivePlayedMinutes,
  getGameDurationMinutes,
  isParticipantBillable,
} from "@/lib/payments";
import { getPublicGameUrl } from "@/lib/publicGameUrl";
import type { GameDetail } from "@/types/domain";

const TEAM_COLOR_EMOJI: Record<string, string> = {
  blue: "🔵",
  red: "🔴",
  emerald: "🟢",
  green: "🟢",
  amber: "🟡",
  yellow: "🟡",
  violet: "🟣",
  purple: "🟣",
  rose: "🌹",
  cyan: "🔷",
  orange: "🟠",
};

function currencyLabel(code: string | null | undefined): string {
  switch ((code ?? "").trim().toUpperCase()) {
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
      return (code ?? "").trim().toUpperCase() || "сом";
  }
}

function displayName(fullName: string, telegram: string | null): string {
  const name = fullName.trim();
  const tg = telegram?.trim();
  if (!tg) return name;
  const handle = tg.startsWith("@") ? tg : `@${tg}`;
  return `${name} (${handle})`;
}

function perPersonLine(game: GameDetail): string | null {
  const totalCost = game.total_cost;
  if (totalCost == null || totalCost <= 0) return null;
  const duration = getGameDurationMinutes(game);
  const billable = game.participants.filter(isParticipantBillable);
  if (billable.length === 0) return null;
  const totalMinutes = billable.reduce(
    (acc, p) => acc + effectivePlayedMinutes(p, duration),
    0,
  );
  const share =
    totalMinutes <= 0
      ? Math.ceil(totalCost / billable.length)
      : Math.ceil(
          Math.max(
            ...billable.map(
              (p) =>
                (totalCost * effectivePlayedMinutes(p, duration)) / totalMinutes,
            ),
          ),
        );
  return `Оплата по ${share} ${currencyLabel(game.venue?.currency)}`;
}

/** Text the group will see for a manual reminder. Mirrors the edge function. */
export function buildReminderPreview(
  game: GameDetail,
  withPayment: boolean,
): string {
  const lines: string[] = [];
  const title = game.title?.trim();
  if (title) {
    lines.push(title, "");
  }
  lines.push(`📅 ${formatDateRu(game.game_date)}`);
  const time = formatTimeRange(game.start_time, game.end_time);
  if (time) lines.push(`🕘 ${time}`);
  if (game.venue?.name) {
    const addr = game.venue.address ? `, ${game.venue.address}` : "";
    lines.push(`📍 ${game.venue.name}${addr}`);
  }
  if (game.venue?.map_url) lines.push(`🗺 ${game.venue.map_url}`);
  if (withPayment) {
    const pay = perPersonLine(game);
    if (pay) lines.push("", pay);
  }
  lines.push("", `🔗 ${getPublicGameUrl(game.id)}`);
  lines.push("", `Участники (${game.participants.length}):`);
  if (game.participants.length === 0) {
    lines.push("— пока никого нет");
  } else {
    game.participants.forEach((p, i) => {
      lines.push(
        `${i + 1}. ${displayName(p.player.full_name, p.player.telegram_username)}`,
      );
    });
  }
  if (game.max_players != null) {
    lines.push("", `Лимит: ${game.participants.length}/${game.max_players}`);
  }
  if (game.notes) lines.push("", game.notes);
  return lines.join("\n");
}

/** Text the group will see for the current line-ups. */
export function buildTeamsPreview(game: GameDetail): string {
  const lines: string[] = [];
  const title = game.title?.trim();
  if (title) lines.push(title, "");
  lines.push("🏐 Составы команд");

  const teams = [...game.teams].sort((a, b) => a.sort_order - b.sort_order);
  for (const team of teams) {
    const members = game.participants.filter((p) => p.team_id === team.id);
    const emoji = TEAM_COLOR_EMOJI[team.color] ?? "⚪️";
    lines.push("", `${emoji} ${team.name} — ${members.length}`);
    if (members.length === 0) {
      lines.push("— пусто");
    } else {
      members.forEach((m, i) => {
        lines.push(
          `${i + 1}. ${displayName(m.player.full_name, m.player.telegram_username)}`,
        );
      });
    }
  }

  const bench = game.participants.filter((p) => p.team_id == null);
  if (bench.length > 0) {
    lines.push("", `⚪️ Без команды — ${bench.length}`);
    bench.forEach((m, i) => {
      lines.push(
        `${i + 1}. ${displayName(m.player.full_name, m.player.telegram_username)}`,
      );
    });
  }

  lines.push("", `🔗 ${getPublicGameUrl(game.id)}`);
  return lines.join("\n");
}
