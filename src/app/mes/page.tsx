import Link from "next/link";
import { ContributionGraph } from "@/components/ContributionGraph";
import { GraphFilters } from "@/components/GraphFilters";
import { TodayProgress } from "@/components/TodayProgress";
import {
  WEEKDAY_LABELS,
  eachDate,
  formatMonthTitle,
  monthBounds,
  parseMonthParam,
  shiftMonth,
  isSingleDay,
  todayISO,
} from "@/lib/dates";
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

export default async function MonthPage(props: {
  searchParams: Promise<{ mes?: string; actividad?: string; tag?: string }>;
}) {
  const user = await requireUser();
  const query = await props.searchParams;
  const today = todayISO();
  const { year, month } = parseMonthParam(
    typeof query.mes === "string" ? query.mes : undefined,
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
  const bounds = monthBounds(year, month);
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

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const period = `${year}-${String(month).padStart(2, "0")}`;

  return (
    <section>
      <GraphFilters
        basePath="/mes"
        periodKey="mes"
        periodValue={period}
        prev={`${prev.year}-${String(prev.month).padStart(2, "0")}`}
        next={`${next.year}-${String(next.month).padStart(2, "0")}`}
        title={formatMonthTitle(year, month)}
        activities={visible}
        selected={activity ? activity.id : "todas"}
        tags={tags}
        tag={tag}
      />
      <TodayProgress done={stats.done} total={stats.total} />
      {activities.length === 0 ? (
        <p className="text-zinc-500">
          Crea una actividad para ver el mes.{" "}
          <Link href="/actividades" className="underline">
            Ir a actividades
          </Link>
          .
        </p>
      ) : (
        <ContributionGraph
          weeks={weeks}
          color={activity?.color ?? GLOBAL_COLOR}
          weekdayLabels={WEEKDAY_LABELS}
          legend={activity ? "binary" : "scale"}
          tasksByDay={tasksByDate(bounds.weeks.flat(), visible, checks)}
          dayLink
          cellSize={22}
          centered
          showDay
        />
      )}
    </section>
  );
}
