import Link from "next/link";
import { ContributionGraph } from "@/components/ContributionGraph";
import { GraphFilters } from "@/components/GraphFilters";
import { TodayProgress } from "@/components/TodayProgress";
import { WEEKDAY_LABELS, eachDate, isSingleDay, parseYearParam, todayISO, yearBounds } from "@/lib/dates";
import {
  buildActivityGrid,
  buildGlobalGrid,
  checksInRange,
  completionStats,
  listActivities,
  matchesTag,
  tagsForUser,
  tasksByDate,
} from "@/lib/habits";
import { requireUser } from "@/lib/session";

const GLOBAL_COLOR = "#22c55e";

export default async function YearPage(props: {
  searchParams: Promise<{ ano?: string; actividad?: string; tag?: string }>;
}) {
  const user = await requireUser();
  const query = await props.searchParams;
  const today = todayISO();
  const year = parseYearParam(
    typeof query.ano === "string" ? query.ano : undefined,
    today,
  );
  const selected =
    typeof query.actividad === "string" ? query.actividad : "todas";
  const tag = typeof query.tag === "string" ? query.tag : "todas";
  const activities = await listActivities(user.id, true);
  const tags = await tagsForUser(user.id, activities);
  const visible = activities.filter(
    (activity) => matchesTag(activity.tags, tag) && !isSingleDay(activity),
  );
  const bounds = yearBounds(year);
  const checks = await checksInRange(
    visible.map((activity) => activity.id),
    bounds.start,
    bounds.end,
  );
  const activity = visible.find((item) => item.id === selected);
  const stats = completionStats(eachDate(bounds.start, bounds.end), visible, checks);
  const weeks = activity
    ? buildActivityGrid(
        bounds.weeks,
        bounds.start,
        bounds.end,
        new Set(
          checks
            .filter((check) => check.activityId === activity.id)
            .map((check) => check.date),
        ),
        activity,
      )
    : buildGlobalGrid(bounds.weeks, bounds.start, bounds.end, visible, checks);

  return (
    <section>
      <GraphFilters
        basePath="/ano"
        periodKey="ano"
        periodValue={String(year)}
        prev={String(year - 1)}
        next={String(year + 1)}
        title={String(year)}
        activities={visible}
        selected={activity ? activity.id : "todas"}
        tags={tags}
        tag={tag}
      />
      <TodayProgress done={stats.done} total={stats.total} />
      {activities.length === 0 ? (
        <p className="text-zinc-500">
          Crea una actividad para ver el año.{" "}
          <Link href="/actividades" className="underline">
            Ir a actividades
          </Link>
          .
        </p>
      ) : (
        <ContributionGraph
          weeks={weeks}
          color={activity?.color ?? GLOBAL_COLOR}
          monthLabels={bounds.monthLabels}
          weekdayLabels={WEEKDAY_LABELS}
          legend={activity ? "binary" : "scale"}
          tasksByDay={tasksByDate(bounds.weeks.flat(), visible, checks)}
          dayLink
        />
      )}
    </section>
  );
}
