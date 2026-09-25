"use client";

import { useActionState, useRef, useState } from "react";
import { addFoodByBarcode, addFoodManual, type BarcodeResult } from "@/actions/foods";

const emptyManual = { error: "", ok: "" };

export function AddFoodByBarcode() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const lockRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [unknown, setUnknown] = useState("");
  const [manual, formAction] = useActionState(addFoodManual, emptyManual);

  async function start() {
    setOpen(true);
    setMessage("");
    setUnknown("");
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
        if (!result || lockRef.current) return;
        lockRef.current = true;
        void onCode(result.getText(), controls.stop);
      });
      stopRef.current = () => controls.stop();
    } catch {
      setOpen(false);
      setMessage("No se pudo abrir la cámara. Permite el acceso o prueba desde el navegador del móvil.");
    }
  }

  function stop() {
    stopRef.current?.();
    stopRef.current = null;
    setOpen(false);
  }

  async function onCode(code: string, stopCamera: () => void) {
    setBusy(true);
    stopCamera();
    stopRef.current = null;
    const outcome: BarcodeResult = await addFoodByBarcode(code);
    setBusy(false);
    lockRef.current = false;
    if (outcome.status === "exists") {
      setUnknown("");
      setMessage(`Ya estaba: ${outcome.name}${outcome.market ? ` (${outcome.market})` : ""}.`);
    } else if (outcome.status === "added") {
      setUnknown("");
      setMessage(`Añadido: ${outcome.name}. Etiquetas: ${outcome.category || "otros"}${outcome.market ? `, ${outcome.market}` : ""}.`);
    } else if (outcome.status === "unknown") {
      setMessage("Ese código no está en la base ni en Open Food Facts. Completa los datos.");
      setUnknown(outcome.barcode);
    } else {
      setMessage(outcome.message);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="text-lg font-medium">Añadir alimento a la BBDD</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Si el producto no está, abre la cámara y apunta al código de barras.
      </p>
      <button
        type="button"
        onClick={() => (open ? stop() : void start())}
        className="press mt-3 rounded-full bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        {open ? "Cerrar cámara" : "Añadir alimento a la BBDD"}
      </button>
      <div className="fold-panel mt-3" data-open={open ? "true" : "false"}>
        <div>
          <video ref={videoRef} className="w-full max-w-md rounded-xl bg-black" muted playsInline />
        </div>
      </div>
      {busy ? <p className="mt-2 text-sm">Buscando el código…</p> : null}
      {message ? <p className="mt-2 text-sm">{message}</p> : null}
      {unknown || manual.ok ? (
        <form action={formAction} className="mt-3 grid gap-2 sm:grid-cols-2">
          <input type="hidden" name="barcode" value={unknown} />
          <input name="name" placeholder="Nombre" required className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" />
          <input name="category" placeholder="Etiqueta (jugo, carnes…)" className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" />
          <input name="market" placeholder="Mercado" className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" />
          <input name="kcal" inputMode="decimal" placeholder="kcal / 100 g" className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" />
          <input name="protein" inputMode="decimal" placeholder="Proteína" className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" />
          <input name="carbs" inputMode="decimal" placeholder="Hidratos" className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" />
          <input name="fat" inputMode="decimal" placeholder="Grasa" className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" />
          <button className="press rounded-full border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700 sm:col-span-2">
            Guardar alimento
          </button>
          {manual.error ? <p className="text-sm text-red-600 sm:col-span-2">{manual.error}</p> : null}
          {manual.ok ? <p className="text-sm sm:col-span-2">{manual.ok}</p> : null}
        </form>
      ) : null}
    </div>
  );
}
