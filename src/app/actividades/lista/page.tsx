import Link from "next/link";
import { setArchived } from "@/actions/activities";
import { ActivityExtras } from "@/components/ActivityExtras";
import { WEEKDAY_NAMES, parseDays } from "@/lib/dates";
import { listActivities, tagsForUser } from "@/lib/habits";
import { requireUser } from "@/lib/session";

function daySummary(days: string) {
  const selected = parseDays(days);
  if (selected.length === 0) return "Todos los días";
  return selected.map((day) => WEEKDAY_NAMES[day]).join(", ");
}

export default async function ActivityListPage() {
  const user = await requireUser();
  const activities = await listActivities(user.id, true);
  const active = activities.filter((activity) => !activity.archivedAt);
  const archived = activities.filter((activity) => activity.archivedAt);
  const availableTags = await tagsForUser(user.id, activities);

  return (
    <section className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Mis actividades</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Edita cada una o añade cosas dentro.
          </p>
        </div>
        <Link
          href="/actividades"
          className="press shrink-0 rounded-full bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Crear actividad
        </Link>
      </div>
      {active.length === 0 ? (
        <p className="text-zinc-500">Todavía no hay actividades.</p>
      ) : (
        <ul className="flex max-w-lg flex-col gap-4">
          {active.map((activity) => (
            <li
              key={activity.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{activity.name}</p>
                  <p className="text-sm text-zinc-500">
                    {daySummary(activity.days)}
                    {activity.startsOn && activity.endsOn
                      ? ` · ${activity.startsOn} a ${activity.endsOn}`
                      : ""}
                  </p>
                </div>
                <form action={setArchived.bind(null, activity.id, true)}>
                  <button type="submit" className="text-sm text-zinc-500 underline">
                    Archivar
                  </button>
                </form>
              </div>
              <ActivityExtras
                activity={activity}
                items={activity.items}
                availableTags={availableTags}
              />
            </li>
          ))}
        </ul>
      )}
      {archived.length > 0 ? (
        <div>
          <h2 className="text-lg font-medium">Archivadas</h2>
          <ul className="mt-3 flex max-w-lg flex-col gap-2">
            {archived.map((activity) => (
              <li
                key={activity.id}
                className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800"
              >
                <span className="text-zinc-500">{activity.name}</span>
                <form action={setArchived.bind(null, activity.id, false)}>
                  <button type="submit" className="text-sm underline">
                    Restaurar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
