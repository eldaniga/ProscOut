import Link from "next/link";
import { CheckBox } from "@/components/CheckBox";
import { TagSelect } from "@/components/TagSelect";
import { TodayProgress } from "@/components/TodayProgress";
import {
  activityApplies,
  addDays,
  isSingleDay,
  formatLongDate,
  formatWeekdayShort,
  isIsoDate,
  startOfWeek,
  todayISO,
  weekDays,
} from "@/lib/dates";
import { checksInRange, completionStats, listActivities, matchesTag, tagsForUser } from "@/lib/habits";
import { requireUser } from "@/lib/session";

export default async function WeekPage(props: {
  searchParams: Promise<{ fecha?: string; tag?: string }>;
}) {
  const user = await requireUser();
  const query = await props.searchParams;
  const raw = typeof query.fecha === "string" ? query.fecha : "";
  const tag = typeof query.tag === "string" ? query.tag : "todas";
  const anchor = isIsoDate(raw) ? raw : todayISO();
  const start = startOfWeek(anchor);
  const days = weekDays(anchor);
  const allActivities = await listActivities(user.id);
  const tags = await tagsForUser(user.id, allActivities);
  const activities = allActivities.filter(
    (activity) =>
      matchesTag(activity.tags, tag) && days.some((day) => activityApplies(activity, day)),
  );
  const checks = await checksInRange(
    activities.map((activity) => activity.id),
    days[0],
    days[6],
  );
  const done = new Set(checks.map((check) => `${check.activityId}:${check.date}`));
  const times = new Map(checks.map((check) => [`${check.activityId}:${check.date}`, check.time]));
  const stats = completionStats(days, activities, checks);
  const tagQuery = tag !== "todas" ? `&tag=${encodeURIComponent(tag)}` : "";
  const prev = `/semana?fecha=${addDays(start, -7)}${tagQuery}`;
  const next = `/semana?fecha=${addDays(start, 7)}${tagQuery}`;

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Link
          href={prev}
          className="rounded-full border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
        >
          ←
        </Link>
        <h1 className="min-w-0 text-xl font-semibold">
          Semana del {formatLongDate(start)}
        </h1>
        <TagSelect tags={tags} value={tag} />
        <Link
          href={next}
          className="rounded-full border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
        >
          →
        </Link>
      </div>
      <TodayProgress done={stats.done} total={stats.total} />
      {activities.length === 0 ? (
        <p className="text-zinc-500">
          Todavía no hay actividades.{" "}
          <Link href="/actividades" className="underline">
            Crea la primera
          </Link>
          .
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-separate border-spacing-y-2 text-sm">
            <thead>
              <tr>
                <th className="text-left font-normal text-zinc-500">Actividad</th>
                {days.map((day) => (
                  <th key={day} className="px-1 text-center font-normal capitalize text-zinc-500">
                    {formatWeekdayShort(day)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activities.map((activity) => (
                <tr key={activity.id}>
                  <td className="pr-3">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: activity.color }}
                      />
                      {activity.name}
                    </span>
                  </td>
                  {days.map((day) => {
                    const applies = activityApplies(activity, day);
                    const checked = done.has(`${activity.id}:${day}`);
                    if (!applies && isSingleDay(activity)) {
                      return <td key={day} />;
                    }
                    return (
                      <td
                        key={day}
                        className="px-1 text-center"
                        style={{ ["--check-color" as string]: activity.color }}
                      >
                        <div className="inline-flex">
                          <CheckBox
                            activityId={activity.id}
                            date={day}
                            checked={checked}
                            time={times.get(`${activity.id}:${day}`) ?? null}
                            useSchedule={activity.useSchedule}
                            disabled={!applies && !checked}
                            label={`${activity.name}, ${formatWeekdayShort(day)}`}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
