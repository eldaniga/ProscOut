"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckBox } from "@/components/CheckBox";
import { formatLongDate } from "@/lib/dates";
import type { DayTask, GraphCell } from "@/lib/habits";

const CELL = 14;
const GAP = 3;

export function ContributionGraph({
  weeks,
  color,
  monthLabels,
  weekdayLabels,
  legend,
  tasksByDay,
  dayLink = false,
  cellSize = CELL,
  centered = false,
  showDay = false,
}: {
  weeks: GraphCell[][];
  color: string;
  monthLabels?: (string | null)[];
  weekdayLabels: readonly string[];
  legend: "binary" | "scale";
  tasksByDay: Record<string, DayTask[]>;
  dayLink?: boolean;
  cellSize?: number;
  centered?: boolean;
  showDay?: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const tasks = selected ? (tasksByDay[selected] ?? []) : [];

  function onSelect(cell: GraphCell) {
    if (!cell.inRange) return;
    if (dayLink) {
      router.push(`/?fecha=${cell.date}`);
      return;
    }
    setSelected((current) => (current === cell.date ? null : cell.date));
  }

  const runs = monthRuns(monthLabels);
  const gap = centered ? 4 : GAP;

  return (
    <div>
      <div className={centered ? "flex justify-center overflow-x-auto" : "overflow-x-auto"}>
        <div className="inline-flex gap-2">
          <div className={`${runs ? "mt-6" : "mt-5"} flex flex-col`} style={{ gap }}>
            {weekdayLabels.map((label, index) => (
              <span
                key={label + index}
                className="flex w-4 items-center text-[10px] text-zinc-500"
                style={{ height: cellSize }}
              >
                {showDay || index % 2 === 0 ? label : ""}
              </span>
            ))}
          </div>
          <div>
            {runs ? (
              <div className="mb-1 flex h-5 gap-[3px]">
                {runs.map((run, index) => (
                  <span
                    key={`${run.label}-${index}`}
                    className="truncate text-xs text-zinc-500"
                    style={{ width: run.span * cellSize + (run.span - 1) * gap }}
                  >
                    {run.label}
                  </span>
                ))}
              </div>
            ) : (
              <div className="mb-1 h-4" />
            )}
            <div className="flex" style={{ gap }}>
              {weeks.map((week) => (
                <div key={week[0]?.date ?? "week"} className="flex flex-col" style={{ gap }}>
                  {week.map((cell) => (
                    <button
                      key={cell.date}
                      type="button"
                      title={cell.tooltip}
                      disabled={!cell.inRange}
                      onClick={() => onSelect(cell)}
                      aria-expanded={selected === cell.date}
                      aria-label={cell.tooltip || cell.date}
                      className={`grid place-items-center rounded-[3px] text-[10px] leading-none disabled:cursor-default ${
                        cell.level >= 3 ? "text-white" : "text-zinc-700 dark:text-zinc-200"
                      } ${selected === cell.date ? "ring-2 ring-zinc-900 dark:ring-zinc-100" : ""}`}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        background: cell.inRange
                          ? cellColor(cell.level, color)
                          : "transparent",
                      }}
                    >
                      {showDay && cell.inRange ? Number(cell.date.slice(8)) : ""}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="fold-panel mt-4" data-open={selected !== null}>
        <div>
          {selected ? (
            <div className="max-w-lg rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-medium capitalize">{formatLongDate(selected)}</h2>
              {tasks.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">Ese día no había actividades.</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-3">
                  {tasks.map((task) => (
                    <li key={task.id} style={{ ["--check-color" as string]: task.color }}>
                      <div className="flex items-center gap-3">
                        <CheckBox
                          activityId={task.id}
                          date={selected}
                          checked={task.done}
                          time={task.time}
                          useSchedule={task.useSchedule}
                          label={`${task.name}, ${task.done ? "hecha" : "pendiente"}`}
                        />
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: task.color }}
                        />
                        <span className={task.done ? "text-zinc-500 line-through" : ""}>
                          {task.name}
                        </span>
                      </div>
                      {task.items.length > 0 ? (
                        <ul className="mt-1 ml-12 list-disc text-sm text-zinc-500">
                          {task.items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div />
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1 text-xs text-zinc-500">
        <span>Menos</span>
        {(legend === "binary" ? [0, 4] : [0, 1, 2, 3, 4]).map((level) => (
          <span
            key={level}
            className="h-3.5 w-3.5 rounded-[2px]"
            style={{ background: cellColor(level as 0 | 1 | 2 | 3 | 4, color) }}
          />
        ))}
        <span>Más</span>
      </div>
    </div>
  );
}

function monthRuns(labels: (string | null)[] | undefined) {
  if (!labels) return null;
  const runs: { label: string; span: number }[] = [];
  for (const label of labels) {
    const text = label ?? "";
    const last = runs[runs.length - 1];
    if (last && last.label === text) last.span += 1;
    else runs.push({ label: text, span: 1 });
  }
  return runs;
}

function cellColor(level: number, color: string) {
  if (level <= 0) return "var(--cell-empty)";
  const mix = [0, 35, 55, 75, 100][level] ?? 100;
  return `color-mix(in srgb, ${color} ${mix}%, var(--cell-empty))`;
}
