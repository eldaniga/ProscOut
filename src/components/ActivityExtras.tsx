"use client";

import { useState } from "react";
import { addActivityItem, deleteActivityItem } from "@/actions/activities";
import { ActivityForm } from "@/components/ActivityForm";

export function ActivityExtras({
  activity,
  items,
  availableTags = [],
}: {
  activity: {
    id: string;
    name: string;
    color: string;
    days: string;
    tags?: string;
    useSchedule?: boolean;
    scheduleTime?: string | null;
  };
  items: { id: string; text: string }[];
  availableTags?: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-fit items-center gap-1.5 text-sm text-zinc-500"
      >
        <span
          className={`inline-block transition-transform duration-300 ${open ? "rotate-90" : ""}`}
          aria-hidden
        >
          ▸
        </span>
        {open ? "Cerrar" : `Editar y añadir${items.length ? ` (${items.length})` : ""}`}
      </button>
      <div className="fold-panel" data-open={open}>
        <div>
          <div className="flex flex-col gap-4 border-t border-zinc-200 pt-3 dark:border-zinc-800">
            <ActivityForm
              activity={activity}
              availableTags={availableTags}
              onSaved={() => setOpen(false)}
            />
            <div>
              <p className="mb-2 text-sm">Dentro de esta actividad</p>
              <ul className="mb-2 flex flex-col gap-1">
                {items.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-2 text-sm">
                    <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">{item.text}</span>
                    <form action={deleteActivityItem.bind(null, item.id)}>
                      <button type="submit" className="text-zinc-500 underline">
                        Quitar
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
              <form action={addActivityItem.bind(null, activity.id)} className="flex gap-2">
                <input
                  name="text"
                  required
                  maxLength={200}
                  placeholder="Añadir algo"
                  className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
                />
                <button
                  type="submit"
                  className="rounded-full bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
                >
                  Añadir
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
