"use client";

import { setCheckTime, toggleCheck } from "@/actions/checks";

export function CheckBox({
  activityId,
  date,
  checked,
  label,
  disabled = false,
  time = null,
  useSchedule = false,
}: {
  activityId: string;
  date: string;
  checked: boolean;
  label: string;
  disabled?: boolean;
  time?: string | null;
  useSchedule?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
    <form action={toggleCheck.bind(null, activityId, date)}>
      <button
        type="submit"
        disabled={disabled}
        aria-pressed={checked}
        aria-label={label}
        className={`flex h-9 w-9 items-center justify-center rounded-md border text-sm ${
          checked
            ? "border-transparent text-white"
            : "border-zinc-300 text-transparent dark:border-zinc-700"
        } disabled:opacity-30`}
        style={checked ? { background: "var(--check-color, #22c55e)" } : undefined}
      >
        ✓
      </button>
    </form>
    {useSchedule && checked ? (
      <form action={setCheckTime.bind(null, activityId, date)}>
        <input
          type="time"
          name="time"
          defaultValue={time ?? ""}
          aria-label={`Hora de ${label}`}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          className="rounded-md border border-zinc-300 bg-transparent px-1 py-1 text-xs dark:border-zinc-700"
        />
      </form>
    ) : null}
    </div>
  );
}
