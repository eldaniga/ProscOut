"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { UNTAGGED } from "@/lib/habits";

export function TagSelect({ tags, value }: { tags: string[]; value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <label className="flex items-center gap-2 text-sm">
      Tag
      <select
        value={value}
        onChange={(event) => {
          const next = new URLSearchParams(params.toString());
          if (event.target.value === "todas") next.delete("tag");
          else next.set("tag", event.target.value);
          const query = next.toString();
          router.push(query ? `${pathname}?${query}` : pathname);
        }}
        className="rounded-lg border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
      >
        <option value="todas">Todas</option>
        <option value={UNTAGGED}>sin etiquetas</option>
        {tags.map((tag) => (
          <option key={tag} value={tag}>
            {tag}
          </option>
        ))}
      </select>
    </label>
  );
}
