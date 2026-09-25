"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { ACTIVITY_COLORS } from "@/lib/colors";
import { WEEKDAY_LABELS, parseDays } from "@/lib/dates";
import { TagPicker } from "@/components/TagPicker";
import {
  createActivity,
  updateActivity,
  type ActivityFormState,
} from "@/actions/activities";

export function ActivityForm({
  activity,
  availableTags = [],
  onSaved,
  onlyDate,
}: {
  activity?: {
    id: string;
    name: string;
    color: string;
    days: string;
    tags?: string;
    useSchedule?: boolean;
    scheduleTime?: string | null;
    startsOn?: string | null;
    endsOn?: string | null;
  };
  availableTags?: string[];
  onSaved?: () => void;
  onlyDate?: string;
}) {
  const router = useRouter();
  const action = activity ? updateActivity : createActivity;
  const [state, formAction, pending] = useActionState<ActivityFormState, FormData>(
    async (prev, formData) => {
      const result = await action(prev, formData);
      if (!result.error) {
        onSaved?.();
        await new Promise((resolve) => setTimeout(resolve, 340));
        router.refresh();
      }
      return result;
    },
    { error: "" },
  );
  const selectedDays = new Set(parseDays(activity?.days ?? ""));
  const color = activity?.color ?? ACTIVITY_COLORS[0];
  const [useSchedule, setUseSchedule] = useState(activity?.useSchedule ?? false);
  const [limitDates, setLimitDates] = useState(Boolean(activity?.startsOn || activity?.endsOn));
  const initialTags = (activity?.tags ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {activity ? <input type="hidden" name="id" value={activity.id} /> : null}
      {onlyDate ? <input type="hidden" name="onlyDate" value={onlyDate} /> : null}
      <label className="flex flex-col gap-1 text-sm">
        Nombre
        <input
          name="name"
          required
          maxLength={80}
          defaultValue={activity?.name}
          placeholder="Ir al gimnasio"
          className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </label>
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-1 text-sm">Color</legend>
        {ACTIVITY_COLORS.map((swatch) => (
          <label key={swatch} className="cursor-pointer">
            <input
              type="radio"
              name="color"
              value={swatch}
              defaultChecked={swatch === color}
              className="peer sr-only"
            />
            <span
              className="block h-6 w-6 rounded-full ring-offset-2 peer-checked:ring-2 peer-checked:ring-zinc-900 dark:peer-checked:ring-zinc-100"
              style={{ background: swatch }}
            />
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend className="mb-1 text-sm">Días (vacío = todos)</legend>
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_LABELS.map((label, index) => (
            <label key={label} className="text-sm">
              <input
                type="checkbox"
                name="days"
                value={index}
                defaultChecked={selectedDays.has(index)}
                className="peer sr-only"
              />
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-300 peer-checked:border-zinc-900 peer-checked:bg-zinc-900 peer-checked:text-white dark:border-zinc-700 dark:peer-checked:bg-zinc-100 dark:peer-checked:text-zinc-900">
                {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="useSchedule"
          checked={useSchedule}
          onChange={(event) => setUseSchedule(event.target.checked)}
        />
        Usar horarios
      </label>
      {useSchedule ? (
        <label className="flex flex-col gap-1 text-sm">
          Hora
          <input
            type="time"
            name="scheduleTime"
            defaultValue={activity?.scheduleTime ?? ""}
            className="w-fit rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          />
        </label>
      ) : null}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="limitDates"
          checked={limitDates}
          onChange={(event) => setLimitDates(event.target.checked)}
        />
        Limitar fechas
      </label>
      {limitDates ? (
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Desde
            <input
              type="date"
              name="startsOn"
              required
              defaultValue={activity?.startsOn ?? ""}
              className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Hasta
            <input
              type="date"
              name="endsOn"
              required
              defaultValue={activity?.endsOn ?? ""}
              className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
            />
          </label>
        </div>
      ) : null}
      <TagPicker available={availableTags} initial={initialTags} />
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-full bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {activity ? "Guardar" : "Añadir actividad"}
      </button>
    </form>
  );
}
