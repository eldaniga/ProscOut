"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { rememberTag } from "@/actions/activities";

export function TagPicker({
  available,
  initial,
}: {
  available: string[];
  initial: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(initial);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const needle = query.trim().toLowerCase();
  const options = useMemo(() => {
    const pool = [...new Set([...available, ...selected])].sort();
    if (!needle) return pool;
    return pool.filter((tag) => tag.includes(needle));
  }, [available, selected, needle]);
  const canCreate = needle.length > 0 && !options.includes(needle) && needle.length <= 40;

  function add(tag: string) {
    setSelected((current) => (current.includes(tag) ? current : [...current, tag]));
    setQuery("");
    if (!available.includes(tag)) {
      void rememberTag(tag).then(() => router.refresh());
    }
  }

  function remove(tag: string) {
    setSelected((current) => current.filter((item) => item !== tag));
  }

  return (
    <div className="relative flex flex-col gap-2 text-sm">
      <span>Etiquetas</span>
      {selected.map((tag) => (
        <input key={tag} type="hidden" name="tags" value={tag} />
      ))}
      <div className="flex flex-wrap gap-2">
        {selected.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => remove(tag)}
            className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            {tag} ×
          </button>
        ))}
      </div>
      <input
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        placeholder="Buscar o crear"
        className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
      />
      {open ? (
        <div className="flex flex-wrap gap-2 rounded-lg border border-zinc-200 p-2 dark:border-zinc-800">
          {options.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => add(tag)}
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs dark:border-zinc-700"
            >
              {tag}
            </button>
          ))}
          {canCreate ? (
            <button
              type="button"
              onClick={() => add(needle)}
              className="rounded-full border border-dashed border-zinc-400 px-3 py-1 text-xs"
            >
              Crear {needle}
            </button>
          ) : null}
          {options.length === 0 && !canCreate ? (
            <span className="text-xs text-zinc-500">No hay etiquetas todavía.</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
