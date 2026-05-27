// Lightweight date helpers. Database stores `game_date` as ISO date (YYYY-MM-DD)
// and times as HH:MM:SS strings. We keep everything as plain strings to avoid
// timezone surprises on a personal admin app.

const DAYS_RU = [
  "Воскресенье",
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
];

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

/** Returns today's date as YYYY-MM-DD in local timezone. */
export function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Format a YYYY-MM-DD date to e.g. "Суббота, 15 марта 2026". */
export function formatDateRu(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  const date = new Date(y, m - 1, d);
  return `${DAYS_RU[date.getDay()]}, ${d} ${MONTHS_RU[m - 1]} ${y}`;
}

/** Short variant: "15 марта". */
export function formatDateShortRu(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return `${d} ${MONTHS_RU[m - 1]}`;
}

/** Strip seconds from a HH:MM:SS time string. */
export function formatTime(time: string | null | undefined): string {
  if (!time) return "";
  return time.slice(0, 5);
}

/** Format start–end time range. */
export function formatTimeRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  const s = formatTime(start);
  const e = formatTime(end);
  if (s && e) return `${s} – ${e}`;
  return s;
}

/** Compare ISO date strings (YYYY-MM-DD). */
export function isDateInFutureOrToday(isoDate: string): boolean {
  return isoDate >= todayISO();
}
