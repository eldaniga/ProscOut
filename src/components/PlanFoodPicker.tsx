"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addPlanFood } from "@/actions/plans";
import { Producto } from "@/components/Producto";
import { searchPhotosEnabled } from "@/components/SearchPhotosSetting";
import { PLAN_SLOTS } from "@/lib/meal-plan";
import { foldFoodQuery } from "@/lib/nutrition";

const MARKETS = ["mercadona", "carrefour", "lidl", "alcampo", "dia", "masymas"] as const;

const SLOT_LABEL: Record<(typeof PLAN_SLOTS)[number], string> = {
  desayuno: "Desayuno",
  comida: "Comida",
  merienda: "Merienda",
  cena: "Cena",
};

export type PickerFood = {
  id: number;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  unitGrams: number | null;
  category: string;
  market: string;
  price: number | null;
  packageSize: string;
  imageUrl: string;
  barcode: string | null;
};

export function PlanFoodPicker({ planId }: { planId: string }) {
  const [foods, setFoods] = useState<PickerFood[]>([]);
  const [catalogReady, setCatalogReady] = useState(false);
  const [slot, setSlot] = useState<(typeof PLAN_SLOTS)[number]>("comida");
  const [market, setMarket] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagsOpen, setTagsOpen] = useState(false);
  const tagsRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState(true);
  useEffect(() => {
    setPhotos(searchPhotosEnabled());
  }, []);
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/foods/catalog")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("catalog"))))
      .then((rows: PickerFood[]) => {
        if (!cancelled) {
          setFoods(rows);
          setCatalogReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) setCatalogReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    function close(event: PointerEvent) {
      if (!tagsRef.current?.contains(event.target as Node)) setTagsOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const indexed = useMemo(
    () =>
      foods.map((food) => ({
        ...food,
        folded: foldFoodQuery(food.name),
        tagList: food.category.split(", ").filter(Boolean),
        marketList: food.market ? food.market.split(", ") : [],
      })),
    [foods],
  );
  const availableTags = useMemo(() => {
    const found = new Set<string>();
    for (const food of foods) {
      for (const tag of food.category.split(", ")) {
        if (tag) found.add(tag);
      }
    }
    return [...found].sort((a, b) => (a === "general" ? -1 : b === "general" ? 1 : a.localeCompare(b)));
  }, [foods]);
  const needle = foldFoodQuery(query.trim());
  const matches = useMemo(() => {
    if (!needle && !tags.length) return [];
    return indexed
      .filter((food) => !needle || food.folded.includes(needle))
      .filter((food) => !market || food.marketList.includes(market))
      .filter((food) => tags.every((tag) => food.tagList.includes(tag)))
      .slice(0, 12);
  }, [indexed, needle, market, tags]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {PLAN_SLOTS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setSlot(key)}
            className={`press rounded-full px-4 py-2 text-sm ${
              slot === key
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "border border-zinc-300 dark:border-zinc-700"
            }`}
          >
            {SLOT_LABEL[key]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <select
          value={market}
          onChange={(event) => setMarket(event.target.value)}
          className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
        >
          <option value="">Todos los mercados</option>
          {MARKETS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <div ref={tagsRef} className="relative">
          <button
            type="button"
            onClick={() => setTagsOpen((open) => !open)}
            className="press max-w-56 truncate rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-left text-sm dark:border-zinc-700"
          >
            {tags.length ? tags.join(", ") : "Etiquetas"}
          </button>
          {tagsOpen ? (
            <div
              className="absolute z-20 mt-1 max-h-64 w-52 overflow-y-auto rounded-lg border border-zinc-300 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-950"
              onPointerDown={(event) => event.stopPropagation()}
            >
              {availableTags.map((tag) => (
                <label key={tag} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900">
                  <input
                    type="checkbox"
                    checked={tags.includes(tag)}
                    onChange={() =>
                      setTags((current) =>
                        current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
                      )
                    }
                  />
                  {tag}
                </label>
              ))}
            </div>
          ) : null}
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar alimento"
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
        />
      </div>
      {!catalogReady ? (
        <p className="text-sm text-zinc-500">Cargando catálogo…</p>
      ) : foods.length === 0 ? (
        <p className="text-sm text-zinc-500">No se pudo cargar el catálogo.</p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {matches.map((food) => (
          <li
            key={food.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
          >
            <Producto product={food}>
              <span className="flex items-start gap-2 text-left">
                {photos && food.imageUrl ? (
                  <img src={food.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" />
                ) : null}
                <span>
                {food.name}
                {food.unitGrams ? ` · ${food.unitGrams} g por unidad` : ""}
                <span className="block text-xs text-zinc-500">
                  {food.kcal} kcal · P {food.protein} · C {food.carbs} · G {food.fat} / 100 g
                </span>
                {[food.category, food.market].filter(Boolean).length > 0 ? (
                  <span className="block text-xs text-zinc-500">
                    {[food.category, food.market].filter(Boolean).join(" · ")}
                  </span>
                ) : null}
                {food.market || food.category.split(", ").includes("general") ? (
                  <span className="block text-xs text-zinc-500">
                    {[food.packageSize, food.price != null ? `${food.price.toFixed(2)} €` : "sin precio"]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                ) : null}
                </span>
              </span>
            </Producto>
            <form action={addPlanFood} className="flex items-center gap-2">
              <input type="hidden" name="planId" value={planId} />
              <input type="hidden" name="foodId" value={food.id} />
              <input type="hidden" name="slot" value={slot} />
              <input
                name="grams"
                type="number"
                min={1}
                max={2000}
                defaultValue={100}
                className="w-20 rounded-lg border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
              />
              <span className="text-xs text-zinc-500">g</span>
              <button className="press rounded-full border border-zinc-300 px-3 py-1 dark:border-zinc-700">
                Añadir a {SLOT_LABEL[slot]}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
