"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { deletePlanLine, updatePlanLine } from "@/actions/plans";
import { FichaProducto } from "@/components/Producto";
import { unitCount } from "@/lib/food-units";

export function PlanLineEditor({
  line,
  onMove,
  onOver,
}: {
  onMove?: (slot: string) => void;
  onOver?: (slot: string) => void;
  line: {
    id: string;
    slot?: string;
    name: string;
    grams: number;
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    note: string;
    unitGrams?: number | null;
    category?: string;
    market?: string;
    price?: number | null;
    packageSize?: string;
    imageUrl?: string;
    barcode?: string | null;
    kcalPer100?: number;
    proteinPer100?: number;
    carbsPer100?: number;
    fatPer100?: number;
  };
}) {
  const [open, setOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(line.note.length > 0);
  const [grams, setGrams] = useState(line.grams);
  const [protein, setProtein] = useState(line.protein);
  const [carbs, setCarbs] = useState(line.carbs);
  const [fat, setFat] = useState(line.fat);
  const kcal = Math.round(protein * 4 + carbs * 4 + fat * 9);
  const tags = [line.category, line.market].filter(Boolean).join(" · ");
  const formId = `line-${line.id}`;
  const drag = useRef({ x: 0, y: 0, moved: false, slot: "" });
  const ghostRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  function grab(event: React.PointerEvent<HTMLTableCellElement>) {
    if (event.button !== 0) return;
    drag.current = { x: event.clientX, y: event.clientY, moved: false, slot: "" };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function placeGhost(x: number, y: number) {
    const card = ghostRef.current;
    if (!card) return;
    card.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -70%) rotate(-3deg) scale(1.04)`;
    card.style.opacity = "1";
  }

  function pulling(event: React.PointerEvent<HTMLTableCellElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    if (Math.hypot(event.clientX - drag.current.x, event.clientY - drag.current.y) <= 8) return;
    if (!drag.current.moved) {
      drag.current.moved = true;
      setDragging(true);
    }
    placeGhost(event.clientX, event.clientY);
    const cell = event.currentTarget;
    cell.style.pointerEvents = "none";
    const under = document.elementFromPoint(event.clientX, event.clientY);
    cell.style.pointerEvents = "";
    const slot = under?.closest("[data-slot]")?.getAttribute("data-slot") ?? "";
    if (slot !== drag.current.slot) {
      drag.current.slot = slot;
      onOver?.(slot);
    }
  }

  function drop(event: React.PointerEvent<HTMLTableCellElement>) {
    if (!drag.current.moved) return;
    const cell = event.currentTarget;
    cell.releasePointerCapture(event.pointerId);
    cell.style.pointerEvents = "none";
    const under = document.elementFromPoint(event.clientX, event.clientY);
    cell.style.pointerEvents = "";
    const slot = under?.closest("[data-slot]")?.getAttribute("data-slot");
    setDragging(false);
    drag.current.slot = "";
    onOver?.("");
    if (slot) onMove?.(slot);
  }

  useLayoutEffect(() => {
    if (dragging) placeGhost(drag.current.x, drag.current.y);
  }, [dragging]);

  function changeGrams(value: number) {
    const factor = line.grams > 0 ? value / line.grams : 1;
    setGrams(value);
    setProtein(Math.round(line.protein * factor * 10) / 10);
    setCarbs(Math.round(line.carbs * factor * 10) / 10);
    setFat(Math.round(line.fat * factor * 10) / 10);
  }

  return (
    <>
      <tr
        data-slot={line.slot}
        className={`cursor-grab transition-opacity duration-200 ${dragging ? "opacity-30" : ""}`}
        onClick={() => {
          if (drag.current.moved) {
            drag.current.moved = false;
            return;
          }
          setOpen(true);
        }}
      >
        <td
          className="max-w-xs pr-3 break-words align-top touch-none"
          onPointerDown={grab}
          onPointerMove={pulling}
          onPointerUp={drop}
        >
          <span>
              {unitCount(grams, line.unitGrams) ? `${unitCount(grams, line.unitGrams)} · ` : ""}
              {line.name}
              {tags ? <span className="mt-1 block text-xs text-zinc-500">{tags}</span> : null}
              {line.market || line.packageSize || line.price != null ? (
                <span className="mt-0.5 block text-xs text-zinc-500">
                  {[line.packageSize, line.price != null ? `${line.price.toFixed(2)} €` : "sin precio"].filter(Boolean).join(" · ")}
                </span>
              ) : null}
          </span>
          {line.note && !noteOpen ? (
            <span className="mt-1 block text-xs text-zinc-500">{line.note}</span>
          ) : null}
        </td>
        <td className="align-top" onClick={(event) => event.stopPropagation()}>
          <input
            form={formId}
            name="grams"
            type="number"
            min={1}
            max={2000}
            value={grams}
            onChange={(event) => changeGrams(Number(event.target.value))}
            className="w-20 rounded-lg border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
          />
        </td>
        <td className="align-top" onClick={(event) => event.stopPropagation()}>
          <input
            form={formId}
            name="kcal"
            type="number"
            readOnly
            value={kcal}
            className="w-20 rounded-lg border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
          />
        </td>
        <td className="align-top" onClick={(event) => event.stopPropagation()}>
          <input
            form={formId}
            name="protein"
            type="number"
            min={0}
            step="0.1"
            value={protein}
            onChange={(event) => setProtein(Number(event.target.value))}
            className="w-16 rounded-lg border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
          />
        </td>
        <td className="align-top" onClick={(event) => event.stopPropagation()}>
          <input
            form={formId}
            name="carbs"
            type="number"
            min={0}
            step="0.1"
            value={carbs}
            onChange={(event) => setCarbs(Number(event.target.value))}
            className="w-16 rounded-lg border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
          />
        </td>
        <td className="align-top" onClick={(event) => event.stopPropagation()}>
          <input
            form={formId}
            name="fat"
            type="number"
            min={0}
            step="0.1"
            value={fat}
            onChange={(event) => setFat(Number(event.target.value))}
            className="w-16 rounded-lg border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
          />
        </td>
        <td className="align-top" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={noteOpen ? "Cerrar nota" : "Añadir nota"}
              aria-expanded={noteOpen}
              onClick={() => setNoteOpen((value) => !value)}
              className={`press grid h-8 w-8 place-items-center rounded-full border ${
                line.note
                  ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                  : "border-zinc-300 text-zinc-500 dark:border-zinc-700"
              }`}
            >
              <NoteIcon />
            </button>
            <form id={formId} action={updatePlanLine}>
              <input type="hidden" name="lineId" value={line.id} />
              <button className="press text-sm text-zinc-500 underline">Guardar</button>
            </form>
            <form action={deletePlanLine.bind(null, line.id)}>
              <button className="press text-sm text-zinc-500 underline">Quitar</button>
            </form>
          </div>
        </td>
      </tr>
      {open ? (
        <FichaProducto
          product={{
            name: line.name,
            kcal: line.kcalPer100 ?? line.kcal,
            protein: line.proteinPer100 ?? line.protein,
            carbs: line.carbsPer100 ?? line.carbs,
            fat: line.fatPer100 ?? line.fat,
            unitGrams: line.unitGrams,
            category: line.category,
            market: line.market,
            price: line.price,
            packageSize: line.packageSize,
            imageUrl: line.imageUrl,
            barcode: line.barcode,
            grams,
            note: line.note,
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
      {dragging
        ? createPortal(
            <div
              ref={ghostRef}
              className="pointer-events-none fixed top-0 left-0 z-50 w-56 rounded-2xl border border-zinc-900 bg-white px-4 py-3 text-sm opacity-0 shadow-2xl will-change-transform dark:border-zinc-100 dark:bg-zinc-900"
            >
              <p className="font-medium">{line.name}</p>
              <p className="mt-1 text-xs text-zinc-500">{kcal} kcal · {grams} g</p>
            </div>,
            document.body,
          )
        : null}
      {noteOpen ? (
        <tr>
          <td colSpan={7} className="pb-2">
            <textarea
              form={formId}
              name="note"
              rows={2}
              maxLength={280}
              defaultValue={line.note}
              placeholder="Nota de este alimento"
              className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
            />
          </td>
        </tr>
      ) : (
        <tr className="hidden">
          <td>
            <input form={formId} type="hidden" name="note" value={line.note} />
          </td>
        </tr>
      )}
    </>
  );
}

function NoteIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 3.5h7.2L19.5 8.8V20a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M14 3.8V8.5h4.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 12.5h7M8.5 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
