"use client";

import { useActionState } from "react";

export function ProfileForm({
  profile,
  levels,
  action,
}: {
  profile: {
    sex: string;
    age: number;
    heightCm: number;
    weightKg: number;
    activityFactor: number;
    deficitPercent: number;
  } | null;
  levels: { factor: number; label: string }[];
  action: (
    prev: { error: string },
    formData: FormData,
  ) => Promise<{ error: string }>;
}) {
  const [state, formAction, pending] = useActionState(action, { error: "" });

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm">
        Sexo
        <select
          name="sex"
          defaultValue={profile?.sex ?? "hombre"}
          className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        >
          <option value="hombre">Hombre</option>
          <option value="mujer">Mujer</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Edad
        <input
          name="age"
          type="number"
          required
          min={10}
          max={120}
          defaultValue={profile?.age ?? 30}
          className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Altura (cm)
        <input
          name="heightCm"
          type="number"
          required
          min={80}
          max={250}
          defaultValue={profile?.heightCm ?? 170}
          className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Peso actual (kg)
        <input
          name="weightKg"
          type="number"
          required
          min={25}
          max={400}
          step="0.1"
          defaultValue={profile?.weightKg ?? 70}
          className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Actividad (para el mantenimiento)
        <select
          name="activityFactor"
          defaultValue={String(profile?.activityFactor ?? 1.2)}
          className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        >
          {levels.map((level) => (
            <option key={level.factor} value={level.factor}>
              {level.label} (×{level.factor})
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Reducir un %
        <input
          name="deficitPercent"
          type="number"
          required
          min={0}
          max={50}
          defaultValue={profile?.deficitPercent ?? 0}
          className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </label>
      {state.error ? <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p> : null}
      <button
        disabled={pending}
        className="w-fit rounded-full bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Guardar datos
      </button>
    </form>
  );
}
