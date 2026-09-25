const MONTHS_SHORT = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

export const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"] as const;

export const WEEKDAY_NAMES = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parseDate(value);
  return formatDate(date) === value;
}

export function todayISO(): string {
  return formatDate(new Date());
}

export function eachDate(start: string, end: string): string[] {
  const dates: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

export function dayOfYear(iso: string): number {
  const date = parseDate(iso);
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.round((date.getTime() - start.getTime()) / 86400000);
}

export function addDays(iso: string, days: number): string {
  const date = parseDate(iso);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

/** Monday = 0 … Sunday = 6 */
export function weekdayIndex(iso: string): number {
  return (parseDate(iso).getDay() + 6) % 7;
}

export function startOfWeek(iso: string): string {
  return addDays(iso, -weekdayIndex(iso));
}

export function weekDays(iso: string): string[] {
  const start = startOfWeek(iso);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function parseDays(value: string): number[] {
  if (!value.trim()) return [];
  return value
    .split(",")
    .map((part) => Number(part))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
}

export function isSingleDay(activity: { startsOn?: string | null; endsOn?: string | null }) {
  return Boolean(activity.startsOn && activity.endsOn && activity.startsOn === activity.endsOn);
}

export function activityApplies(
  activity: { days: string; startsOn?: string | null; endsOn?: string | null; skipDates?: string | null },
  iso: string,
): boolean {
  if (activity.skipDates?.split(",").includes(iso)) return false;
  if (activity.startsOn && iso < activity.startsOn) return false;
  if (activity.endsOn && iso > activity.endsOn) return false;
  const selected = parseDays(activity.days);
  if (selected.length === 0) return true;
  return selected.includes(weekdayIndex(iso));
}

export function formatLongDate(iso: string): string {
  return new Intl.DateTimeFormat("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseDate(iso));
}

export function formatWeekdayShort(iso: string): string {
  return new Intl.DateTimeFormat("es", {
    weekday: "short",
    day: "numeric",
  }).format(parseDate(iso));
}

export function formatMonthTitle(year: number, month: number): string {
  return new Intl.DateTimeFormat("es", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function weeksBetween(start: string, end: string): string[][] {
  const weeks: string[][] = [];
  let cursor = start;
  while (cursor <= end) {
    weeks.push(Array.from({ length: 7 }, (_, index) => addDays(cursor, index)));
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

export function monthBounds(year: number, month: number): {
  start: string;
  end: string;
  weeks: string[][];
} {
  const start = formatDate(new Date(year, month - 1, 1));
  const end = formatDate(new Date(year, month, 0));
  return {
    start,
    end,
    weeks: weeksBetween(startOfWeek(start), addDays(startOfWeek(end), 6)),
  };
}

export function yearBounds(year: number): {
  start: string;
  end: string;
  weeks: string[][];
  monthLabels: (string | null)[];
} {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const weeks = weeksBetween(startOfWeek(start), addDays(startOfWeek(end), 6));
  const monthLabels = weeks.map((week) => {
    const firstInYear = week.find((iso) => iso >= start && iso <= end);
    if (!firstInYear) return null;
    return MONTHS_SHORT[parseDate(firstInYear).getMonth()];
  });
  return { start, end, weeks, monthLabels };
}

export function shiftMonth(year: number, month: number, delta: number): {
  year: number;
  month: number;
} {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function parseMonthParam(value: string | undefined, fallback: string): {
  year: number;
  month: number;
} {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-").map(Number);
    if (month >= 1 && month <= 12) return { year, month };
  }
  const today = parseDate(fallback);
  return { year: today.getFullYear(), month: today.getMonth() + 1 };
}

export function parseYearParam(value: string | undefined, fallback: string): number {
  if (value && /^\d{4}$/.test(value)) {
    const year = Number(value);
    if (year >= 1970 && year <= 2100) return year;
  }
  return parseDate(fallback).getFullYear();
}
