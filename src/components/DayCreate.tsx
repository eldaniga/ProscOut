"use client";

import { useState } from "react";
import { ActivityForm } from "@/components/ActivityForm";

export function DayCreate({
  availableTags,
  onlyDate,
}: {
  availableTags: string[];
  onlyDate: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-8 max-w-lg">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="press flex w-fit items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
      >
        <span className={`inline-block transition-transform duration-300 ${open ? "rotate-90" : ""}`} aria-hidden>
          ▸
        </span>
        {open ? "Cerrar" : "Crear tarea"}
      </button>
      <div className="fold-panel" data-open={open}>
        <div>
          <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-4 text-sm text-zinc-500">
              Si no marcas horarios ni fechas, la tarea queda solo en este día.
            </p>
            <ActivityForm
              availableTags={availableTags}
              onlyDate={onlyDate}
              onSaved={() => setOpen(false)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
