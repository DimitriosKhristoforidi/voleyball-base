import type { GameRow } from "./game-data.ts";
import {
  computeCeilPerPersonPayment,
  mapCurrencyLabel,
} from "./telegram-payments.ts";

const MONTHS_RU = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

const DAYS_RU = [
  "Воскресенье",
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
];

export interface ReminderMessageOptions {
  /** Adds «Оплата по N» line (image reminders only). */
  includePaymentLine?: boolean;
}

export function buildReminderMessage(
  game: GameRow,
  publicAppUrl: string,
  options: ReminderMessageOptions = {},
): string {
  const lines: string[] = [];
  const title = game.title?.trim();
  if (title) {
    lines.push(title);
    lines.push("");
  }
  lines.push(`📅 ${formatDateRu(game.game_date)}`);

  const time = formatTimeRange(game.start_time, game.end_time);
  if (time) {
    lines.push(`🕘 ${time}`);
  }

  if (game.venue?.name) {
    const addr = game.venue.address ? `, ${game.venue.address}` : "";
    lines.push(`📍 ${game.venue.name}${addr}`);
  }

  if (game.venue?.map_url) {
    lines.push(`🗺 ${game.venue.map_url}`);
  }

  if (options.includePaymentLine) {
    const perPerson = computeCeilPerPersonPayment(game);
    if (perPerson != null) {
      const currency = game.venue?.currency
        ? mapCurrencyLabel(game.venue.currency)
        : "сом";
      lines.push("");
      lines.push(`Оплата по ${perPerson} ${currency}`);
    }
  }

  if (publicAppUrl) {
    const base = publicAppUrl.replace(/\/$/, "");
    lines.push("");
    lines.push(`🔗 ${base}/games/${game.id}/view`);
  }

  lines.push("");
  lines.push(`Участники (${game.players.length}):`);
  if (game.players.length === 0) {
    lines.push("— пока никого нет");
  } else {
    game.players.forEach((p, i) => {
      lines.push(`${i + 1}. ${displayName(p)}`);
    });
  }

  if (game.max_players != null) {
    lines.push("");
    lines.push(`Лимит: ${game.players.length}/${game.max_players}`);
  }

  if (game.status === "cancelled") {
    lines.push("");
    lines.push("⚠️ Игра отменена");
  }

  if (game.notes) {
    lines.push("");
    lines.push(game.notes);
  }

  return lines.join("\n");
}

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

function teamColorEmoji(color: string): string {
  return TEAM_COLOR_EMOJI[color] ?? "⚪️";
}

/** Message listing every team and its roster (used by the "send teams" button). */
export function buildTeamsMessage(game: GameRow, publicAppUrl: string): string {
  const lines: string[] = [];
  const title = game.title?.trim();
  if (title) {
    lines.push(title);
    lines.push("");
  }
  lines.push("🏐 Составы команд");

  const sorted = [...game.teams].sort((a, b) => a.sort_order - b.sort_order);
  for (const team of sorted) {
    const members = game.roster.filter((r) => r.team_id === team.id);
    lines.push("");
    lines.push(`${teamColorEmoji(team.color)} ${team.name} — ${members.length}`);
    if (members.length === 0) {
      lines.push("— пусто");
    } else {
      members.forEach((m, i) => lines.push(`${i + 1}. ${displayName(m)}`));
    }
  }

  const bench = game.roster.filter((r) => r.team_id == null);
  if (bench.length > 0) {
    lines.push("");
    lines.push(`⚪️ Без команды — ${bench.length}`);
    bench.forEach((m, i) => lines.push(`${i + 1}. ${displayName(m)}`));
  }

  if (publicAppUrl) {
    const base = publicAppUrl.replace(/\/$/, "");
    lines.push("");
    lines.push(`🔗 ${base}/games/${game.id}/view`);
  }

  return lines.join("\n");
}

function displayName(p: {
  full_name: string;
  telegram_username: string | null;
}): string {
  const name = p.full_name.trim();
  const tg = p.telegram_username?.trim();
  if (tg) {
    const handle = tg.startsWith("@") ? tg : `@${tg}`;
    return `${name} (${handle})`;
  }
  return name;
}

function formatDateRu(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  const date = new Date(y, m - 1, d);
  return `${DAYS_RU[date.getDay()]}, ${d} ${MONTHS_RU[m - 1]} ${y}`;
}

function formatTime(time: string | null): string {
  if (!time) return "";
  return time.slice(0, 5);
}

function formatTimeRange(start: string, end: string | null): string {
  const s = formatTime(start);
  const e = formatTime(end);
  if (s && e) return `${s} – ${e}`;
  return s;
}
