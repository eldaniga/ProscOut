"use client";

import { useEffect, useState } from "react";

export type ProductoInfo = {
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  unitGrams?: number | null;
  category?: string;
  market?: string;
  price?: number | null;
  packageSize?: string;
  imageUrl?: string;
  barcode?: string | null;
  grams?: number;
  note?: string;
};

export function FichaProducto({ product, onClose }: { product: ProductoInfo; onClose: () => void }) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tags = [product.category, product.market].filter(Boolean).join(" · ");
  const shelf = [
    product.packageSize,
    product.price != null ? `${product.price.toFixed(2)} €` : product.market ? "sin precio" : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
          <article
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-medium">{product.name}</h2>
              <button type="button" onClick={onClose} className="text-zinc-500">
                Cerrar
              </button>
            </div>
            {product.imageUrl ? (
              <img src={product.imageUrl} alt="" className="mt-4 h-48 w-full rounded-xl object-contain" />
            ) : null}
            <dl className="mt-4 grid grid-cols-[8rem_1fr] gap-y-2">
              {product.barcode ? (
                <>
                  <dt className="text-zinc-500">Código</dt>
                  <dd>{product.barcode}</dd>
                </>
              ) : null}
              {tags ? (
                <>
                  <dt className="text-zinc-500">Etiquetas</dt>
                  <dd>{tags}</dd>
                </>
              ) : null}
              {shelf ? (
                <>
                  <dt className="text-zinc-500">Envase</dt>
                  <dd>{shelf}</dd>
                </>
              ) : null}
              {product.unitGrams ? (
                <>
                  <dt className="text-zinc-500">Unidad</dt>
                  <dd>{product.unitGrams} g</dd>
                </>
              ) : null}
              {product.grams ? (
                <>
                  <dt className="text-zinc-500">Ración</dt>
                  <dd>{product.grams} g</dd>
                </>
              ) : null}
              {product.note ? (
                <>
                  <dt className="text-zinc-500">Nota</dt>
                  <dd>{product.note}</dd>
                </>
              ) : null}
              <dt className="text-zinc-500">Por 100 g</dt>
              <dd>
                {product.kcal} kcal · P {product.protein} · C {product.carbs} · G {product.fat}
              </dd>
            </dl>
    </article>
    </div>
  );
}

export function Producto({
  product,
  children,
}: {
  product: ProductoInfo;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-left hover:underline">
        {children}
      </button>
      {open ? <FichaProducto product={product} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function FilaProducto({
  product,
  children,
}: {
  product: ProductoInfo;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900" onClick={() => setOpen(true)}>
        {children}
      </tr>
      {open ? <FichaProducto product={product} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
