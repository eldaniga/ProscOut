import Link from "next/link";
import { clearDayTasks } from "@/actions/activities";
import { ActivityExtras } from "@/components/ActivityExtras";
import { DayCreate } from "@/components/DayCreate";
import { CheckBox } from "@/components/CheckBox";
import { TodayProgress } from "@/components/TodayProgress";
import { TagSelect } from "@/components/TagSelect";
import { activityApplies, addDays, formatLongDate, isIsoDate, todayISO } from "@/lib/dates";
import { checksInRange, listActivities, matchesTag, tagsForUser } from "@/lib/habits";
import { quoteForDate } from "@/lib/quote";
import { requireUser } from "@/lib/session";

export default async function HomePage(props: {
  searchParams: Promise<{ tag?: string; fecha?: string }>;
}) {
  const user = await requireUser();
  const realToday = todayISO();
  const query = await props.searchParams;
  const requested = typeof query.fecha === "string" ? query.fecha : "";
  const today = isIsoDate(requested) ? requested : realToday;
  const tag = typeof query.tag === "string" ? query.tag : "todas";
  const tagQuery = tag !== "todas" ? `&tag=${encodeURIComponent(tag)}` : "";
  const activities = await listActivities(user.id);
  const tags = await tagsForUser(user.id, activities);
  const onDay = activities.filter((activity) => activityApplies(activity, today));
  const due = activities.filter(
    (activity) => activityApplies(activity, today) && matchesTag(activity.tags, tag),
  );
  const checks = await checksInRange(
    due.map((activity) => activity.id),
    today,
    today,
  );
  const done = new Set(checks.map((check) => check.activityId));
  const times = new Map(checks.map((check) => [check.activityId, check.time]));
  const quote = await quoteForDate(today);

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
            <Link href={`/?fecha=${addDays(today, -1)}${tagQuery}`} className="rounded-full border border-zinc-300 px-3 py-1 dark:border-zinc-700">
              ←
            </Link>
            <Link href={`/?fecha=${addDays(today, 1)}${tagQuery}`} className="rounded-full border border-zinc-300 px-3 py-1 dark:border-zinc-700">
              →
            </Link>
            {today !== realToday ? (
              <Link href="/" className="text-zinc-500 underline">
                Volver a hoy
              </Link>
            ) : null}
          </div>
          <h1 className="text-2xl font-semibold capitalize">{formatLongDate(today)}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <TagSelect tags={tags} value={tag} />
            {onDay.length > 0 ? (
              <form action={clearDayTasks.bind(null, today)}>
                <button
                  type="submit"
                  className="rounded-full border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
                >
                  Quitar tareas de este día
                </button>
              </form>
            ) : null}
          </div>
        </div>
        {quote ? (
          <blockquote className="max-w-sm text-right text-sm text-zinc-500">
            <p className="line-clamp-4">“{quote.text}”</p>
            <footer className="mt-2 text-xs">
              {quote.author}
              {quote.source ? ` · ${quote.source}` : ""}
            </footer>
          </blockquote>
        ) : null}
      </div>
      <TodayProgress done={done.size} total={due.length} />
      <DayCreate availableTags={tags} onlyDate={today} />
      {due.length === 0 ? (
        <p className="mt-8 text-zinc-500">
          {today === realToday ? "Hoy no hay actividades. " : "Ese día no hay actividades. "}
          <Link href="/actividades" className="underline">
            Programa una
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-2">
          {due.map((activity) => {
            const checked = done.has(activity.id);
            return (
              <li
                key={activity.id}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
                style={{ ["--check-color" as string]: activity.color }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <CheckBox
                    activityId={activity.id}
                    date={today}
                    checked={checked}
                    time={times.get(activity.id) ?? null}
                    useSchedule={activity.useSchedule}
                    label={`${activity.name}, ${checked ? "hecha" : "pendiente"}`}
                  />
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: activity.color }}
                  />
                  <span className={`min-w-0 break-words ${checked ? "text-zinc-500 line-through" : ""}`}>
                    {activity.name}
                    {activity.useSchedule && activity.scheduleTime
                      ? ` · ${activity.scheduleTime}`
                      : ""}
                  </span>
                </div>
                <div className="mt-2 ml-12">
                  <ActivityExtras
                    activity={activity}
                    items={activity.items}
                    availableTags={tags}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
