import { prisma } from "@/lib/prisma";
import { activityApplies, formatLongDate, todayISO } from "@/lib/dates";

export type Habit = {
  id: string;
  name: string;
  color: string;
  days: string;
  startsOn?: string | null;
  endsOn?: string | null;
  archivedAt: Date | null;
  sortOrder: number;
};

export async function listActivities(userId: string, includeArchived = false) {
  return prisma.activity.findMany({
    where: {
      userId,
      ...(includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });
}

export async function checksInRange(
  activityIds: string[],
  start: string,
  end: string,
) {
  if (activityIds.length === 0) return [];
  return prisma.check.findMany({
    where: {
      activityId: { in: activityIds },
      date: { gte: start, lte: end },
    },
    select: { activityId: true, date: true, time: true },
  });
}

export type DayTask = {
  id: string;
  name: string;
  color: string;
  done: boolean;
  time: string | null;
  useSchedule: boolean;
  items: string[];
};

export function tasksByDate(
  dates: string[],
  activities: {
    id: string;
    name: string;
    color: string;
    days: string;
    startsOn?: string | null;
    endsOn?: string | null;
    useSchedule?: boolean;
    items: { text: string }[];
  }[],
  checks: { activityId: string; date: string; time?: string | null }[],
): Record<string, DayTask[]> {
  const done = new Map(
    checks.map((check) => [`${check.activityId}:${check.date}`, check.time ?? null]),
  );
  const tasks: Record<string, DayTask[]> = {};
  for (const date of dates) {
    tasks[date] = activities
      .filter((activity) => activityApplies(activity, date))
      .map((activity) => ({
        id: activity.id,
        name: activity.name,
        color: activity.color,
        done: done.has(`${activity.id}:${date}`),
        time: done.get(`${activity.id}:${date}`) ?? null,
        useSchedule: activity.useSchedule ?? false,
        items: activity.items.map((item) => item.text),
      }));
  }
  return tasks;
}

export async function tagsForUser(userId: string, activities: { tags: string }[]) {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { knownTags: true },
  });
  return collectTags(activities, row?.knownTags ?? "");
}

export function collectTags(activities: { tags: string }[], known = "") {
  return [
    ...new Set(["alimentacion", ...parseTags(known), ...activities.flatMap((activity) => parseTags(activity.tags))]),
  ].sort();
}

export function parseTags(tags: string): string[] {
  return tags
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

export const UNTAGGED = "sin etiquetas";

export function matchesTag(tags: string, tag: string | undefined): boolean {
  if (!tag || tag === "todas") return true;
  if (tag === UNTAGGED) return parseTags(tags).length === 0;
  return parseTags(tags).includes(tag);
}

export function completionStats(
  dates: string[],
  activities: { id: string; days: string; startsOn?: string | null; endsOn?: string | null }[],
  checks: { activityId: string; date: string }[],
  today = todayISO(),
) {
  const done = new Set(checks.map((check) => `${check.activityId}:${check.date}`));
  let total = 0;
  let finished = 0;
  for (const date of dates) {
    if (date > today) continue;
    for (const activity of activities) {
      if (!activityApplies(activity, date)) continue;
      total += 1;
      if (done.has(`${activity.id}:${date}`)) finished += 1;
    }
  }
  return { done: finished, total };
}

export type GraphCell = {
  date: string;
  inRange: boolean;
  level: 0 | 1 | 2 | 3 | 4;
  tooltip: string;
  activityId: string | null;
};

function levelFromRatio(done: number, scheduled: number): GraphCell["level"] {
  if (done <= 0 || scheduled <= 0) return 0;
  const ratio = done / scheduled;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

export function buildActivityGrid(
  weeks: string[][],
  start: string,
  end: string,
  doneDates: Set<string>,
  activity: { id: string; name: string; days: string; startsOn?: string | null; endsOn?: string | null },
): GraphCell[][] {
  const today = todayISO();
  return weeks.map((week) =>
    week.map((date) => {
      const inRange = date >= start && date <= end;
      const applies = inRange && date <= today && activityApplies(activity, date);
      const done = doneDates.has(date);
      return {
        date,
        inRange,
        level: applies && done ? 4 : 0,
        tooltip: !inRange
          ? ""
          : date > today
            ? `${formatLongDate(date)} — todavía no`
            : applies
              ? `${formatLongDate(date)} — ${activity.name}: ${done ? "hecho" : "sin marcar"}`
              : `${formatLongDate(date)} — fuera de las fechas de la actividad`,
        activityId: applies ? activity.id : null,
      };
    }),
  );
}

export function buildGlobalGrid(
  weeks: string[][],
  start: string,
  end: string,
  activities: Habit[],
  checks: { activityId: string; date: string }[],
): GraphCell[][] {
  const doneIdsByDate = new Map<string, Set<string>>();
  for (const check of checks) {
    const set = doneIdsByDate.get(check.date) ?? new Set<string>();
    set.add(check.activityId);
    doneIdsByDate.set(check.date, set);
  }

  return weeks.map((week) =>
    week.map((date) => {
      const inRange = date >= start && date <= end;
      if (!inRange) {
        return {
          date,
          inRange: false,
          level: 0 as const,
          tooltip: "",
          activityId: null,
        };
      }
      const today = todayISO();
      if (date > today) {
        return {
          date,
          inRange: true,
          level: 0 as const,
          tooltip: `${formatLongDate(date)} — todavía no`,
          activityId: null,
        };
      }
      const scheduled = activities.filter((activity) => activityApplies(activity, date));
      const doneIds = doneIdsByDate.get(date) ?? new Set<string>();
      const scheduledDone = scheduled.filter((activity) =>
        doneIds.has(activity.id),
      );
      const level = levelFromRatio(scheduledDone.length, scheduled.length);
      const detail =
        scheduled.length === 0
          ? "sin actividades ese día"
          : `${scheduledDone.length} de ${scheduled.length}${
              scheduledDone.length
                ? ` (${scheduledDone.map((activity) => activity.name).join(", ")})`
                : ""
            }`;
      return {
        date,
        inRange: true,
        level,
        tooltip: `${formatLongDate(date)} — ${detail}`,
        activityId: null,
      };
    }),
  );
}
