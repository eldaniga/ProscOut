"use client";

import { useEffect, useState } from "react";
import { clearPlan, clearPlanSlot, movePlanLine } from "@/actions/plans";
import { PlanLineEditor } from "@/components/PlanLineEditor";
import { PLAN_SLOTS, kcalGap } from "@/lib/meal-plan";

const SLOT_LABEL: Record<(typeof PLAN_SLOTS)[number], string> = {
  desayuno: "Desayuno",
  comida: "Comida",
  merienda: "Merienda",
  cena: "Cena",
};

type Row = {
  id: string;
  slot: string;
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  note: string;
  kcalPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
  unitGrams?: number | null;
  category: string;
  market: string;
  price?: number | null;
  packageSize: string;
  imageUrl: string;
  barcode: string;
};

export function PlanMeals({ planId, lines, target }: { planId: string; lines: Row[]; target: number }) {
  const [rows, setRows] = useState(lines);
  const [over, setOver] = useState("");
  useEffect(() => {
    setRows(lines);
  }, [lines]);
  const total = rows.reduce(
    (sum, row) => {
      sum.kcal += row.kcal;
      sum.protein += row.protein;
      sum.carbs += row.carbs;
      sum.fat += row.fat;
      return sum;
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  function move(id: string, slot: string) {
    const current = rows.find((row) => row.id === id);
    if (!current || current.slot === slot) return;
    setRows(rows.map((row) => (row.id === id ? { ...row, slot } : row)));
    void movePlanLine(id, slot);
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">{kcalGap(total.kcal, target)}</p>
        {rows.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setRows([]);
              void clearPlan(planId);
            }}
            className="press rounded-full border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
          >
            Limpiar plan
          </button>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-separate border-spacing-y-1 text-sm">
          <thead>
            <tr className="text-left text-zinc-500">
              <th className="font-normal">Alimento</th>
              <th className="font-normal">Gramos</th>
              <th className="font-normal">kcal</th>
              <th className="font-normal">P</th>
              <th className="font-normal">C</th>
              <th className="font-normal">G</th>
              <th />
            </tr>
          </thead>
            {PLAN_SLOTS.map((key) => {
              const slotLines = rows.filter((row) => row.slot === key);
              const sub = slotLines.reduce(
                (sum, row) => {
                  sum.kcal += row.kcal;
                  sum.protein += row.protein;
                  sum.carbs += row.carbs;
                  sum.fat += row.fat;
                  return sum;
                },
                { kcal: 0, protein: 0, carbs: 0, fat: 0 },
              );
              const active = over === key;
              return (
                <tbody
                  key={key}
                  data-slot={key}
                  className={`meal-slot ${active ? "bg-zinc-100 dark:bg-zinc-900" : ""}`}
                >
                  <tr>
                    <td
                      colSpan={7}
                      className={`pt-3 font-medium ${active ? "shadow-[inset_0_0_0_2px] shadow-zinc-900 dark:shadow-zinc-100" : ""}`}
                    >
                      <span className="flex items-center justify-between gap-3">
                        {SLOT_LABEL[key]}
                        {slotLines.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setRows(rows.filter((row) => row.slot !== key));
                              void clearPlanSlot(planId, key);
                            }}
                            className="press text-sm font-normal text-zinc-500 underline"
                          >
                            Limpiar
                          </button>
                        ) : null}
                      </span>
                    </td>
                  </tr>
                  {slotLines.map((line) => (
                    <PlanLineEditor
                      key={line.id}
                      line={line}
                      onOver={setOver}
                      onMove={(slot) => move(line.id, slot)}
                    />
                  ))}
                  <tr className="text-zinc-500">
                    <td>Suma {SLOT_LABEL[key].toLowerCase()}</td>
                    <td />
                    <td>{sub.kcal}</td>
                    <td>{sub.protein.toFixed(1)}</td>
                    <td>{sub.carbs.toFixed(1)}</td>
                    <td>{sub.fat.toFixed(1)}</td>
                    <td />
                  </tr>
                </tbody>
              );
            })}
            <tbody>
            <tr className="font-medium">
              <td className="pt-3">Total del día</td>
              <td />
              <td className="pt-3">{total.kcal}</td>
              <td className="pt-3">{total.protein.toFixed(1)}</td>
              <td className="pt-3">{total.carbs.toFixed(1)}</td>
              <td className="pt-3">{total.fat.toFixed(1)}</td>
              <td />
            </tr>
            </tbody>
        </table>
      </div>
    </>
  );
}
