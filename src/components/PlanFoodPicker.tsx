"use client";

import { useEffect, useMemo, useState } from "react";
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

export function PlanFoodPicker({ planId, foods }: { planId: string; foods: PickerFood[] }) {
  const [slot, setSlot] = useState<(typeof PLAN_SLOTS)[number]>("comida");
  const [market, setMarket] = useState("");
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState(true);
  useEffect(() => {
    setPhotos(searchPhotosEnabled());
  }, []);
  const indexed = useMemo(
    () => foods.map((food) => ({ ...food, folded: foldFoodQuery(food.name) })),
    [foods],
  );
  const needle = foldFoodQuery(query.trim());
  const matches = needle
    ? indexed
        .filter((food) => food.folded.includes(needle))
        .filter((food) => !market || food.market.split(", ").includes(market))
        .slice(0, 12)
    : [];

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
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar alimento"
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
        />
      </div>
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
                {food.market ? (
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
