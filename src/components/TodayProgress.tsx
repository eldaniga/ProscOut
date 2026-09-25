"use client";

import { useEffect, useRef, useState } from "react";

export function TodayProgress({ done, total }: { done: number; total: number }) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const shownRef = useRef(0);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const from = shownRef.current;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 700);
      const eased = 1 - (1 - t) ** 3;
      const next = Math.round(from + (percent - from) * eased);
      shownRef.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [percent]);

  return (
    <div className="mt-6 flex items-center gap-6">
      <div
        className="progress-ring grid h-28 w-28 place-items-center rounded-full"
        style={{ ["--progress" as string]: value }}
        role="img"
        aria-label={`${percent}% completado`}
      >
        <div className="grid h-20 w-20 place-items-center rounded-full bg-zinc-50 text-xl font-semibold dark:bg-zinc-950">
          {value}%
        </div>
      </div>
      <div className="min-w-40 flex-1">
        <p className="text-sm text-zinc-500">
          {done} de {total} completadas
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--cell-empty)]">
          <div className="progress-bar h-full rounded-full bg-green-500" style={{ ["--progress" as string]: value }} />
        </div>
      </div>
    </div>
  );
}
