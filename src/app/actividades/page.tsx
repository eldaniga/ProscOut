import { ActivityForm } from "@/components/ActivityForm";
import { listActivities, tagsForUser } from "@/lib/habits";
import { requireUser } from "@/lib/session";

export default async function ActivitiesPage() {
  const user = await requireUser();
  const activities = await listActivities(user.id, true);
  const availableTags = await tagsForUser(user.id, activities);

  return (
    <section className="max-w-lg">
      <h1 className="text-2xl font-semibold">Crear actividad</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Si no marcas días, la actividad aparece cada día. Las que ya existen están en Mis actividades.
      </p>
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <ActivityForm availableTags={availableTags} />
      </div>
    </section>
  );
}
