"use client";

import { useRouter } from "next/navigation";
import { UNTAGGED } from "@/lib/habits";

export function GraphFilters({
  basePath,
  periodKey,
  periodValue,
  prev,
  next,
  title,
  activities,
  selected,
  tags,
  tag,
}: {
  basePath: string;
  periodKey: "mes" | "ano";
  periodValue: string;
  prev: string;
  next: string;
  title: string;
  activities: { id: string; name: string; color: string }[];
  selected: string;
  tags: string[];
  tag: string;
}) {
  const router = useRouter();

  function go(period: string, actividad: string, nextTag = tag) {
    const params = new URLSearchParams();
    params.set(periodKey, period);
    params.set("actividad", actividad);
    if (nextTag && nextTag !== "todas") params.set("tag", nextTag);
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => go(prev, selected)}
          className="rounded-full border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
          aria-label="Periodo anterior"
        >
          ←
        </button>
        <h1 className="min-w-0 text-center text-xl font-semibold capitalize">
          {title}
        </h1>
        <button
          type="button"
          onClick={() => go(next, selected)}
          className="rounded-full border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
          aria-label="Periodo siguiente"
        >
          →
        </button>
      </div>
      <label className="flex items-center gap-2 text-sm">
        Sección
        <select
          value={selected}
          onChange={(event) => go(periodValue, event.target.value)}
          className="rounded-lg border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
        >
          <option value="todas">Todas</option>
          {activities.map((activity) => (
            <option key={activity.id} value={activity.id}>
              {activity.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        Tag
        <select
          value={tag}
          onChange={(event) => go(periodValue, selected, event.target.value)}
          className="rounded-lg border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
        >
          <option value="todas">Todas</option>
          <option value={UNTAGGED}>sin etiquetas</option>
          {tags.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
