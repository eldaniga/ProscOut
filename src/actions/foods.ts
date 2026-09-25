"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const MARKETS = ["mercadona", "carrefour", "lidl", "alcampo", "dia", "masymas"] as const;

export type BarcodeResult =
  | { status: "exists"; name: string; market: string; category: string }
  | { status: "added"; name: string; market: string; category: string }
  | { status: "unknown"; barcode: string }
  | { status: "error"; message: string };

function cleanBarcode(value: string) {
  return value.replace(/\D/g, "");
}

function revalidate() {
  revalidatePath("/alimentacion");
  revalidatePath("/alimentacion/plan");
}

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

export async function addFoodByBarcode(code: string): Promise<BarcodeResult> {
  await requireUser();
  const barcode = cleanBarcode(code);
  if (barcode.length < 8 || barcode.length > 14) {
    return { status: "error", message: "El código de barras no es válido." };
  }

  const existing = await prisma.food.findUnique({ where: { barcode } });
  if (existing) {
    return {
      status: "exists",
      name: existing.name,
      market: existing.market,
      category: existing.category,
    };
  }

  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`, {
    headers: { "User-Agent": "ProscOut/1.0 (personal nutrition app)" },
    cache: "no-store",
  });
  if (!response.ok) return { status: "unknown", barcode };
  const payload = (await response.json()) as {
    status?: number;
    product?: {
      product_name?: string;
      product_name_es?: string;
      categories_tags?: string[];
      stores?: string;
      quantity?: string;
      image_front_small_url?: string;
      nutriments?: Record<string, number>;
    };
  };
  const product = payload.product;
  const name = (product?.product_name_es || product?.product_name || "").trim();
  if (payload.status !== 1 || !product || name.length < 2) return { status: "unknown", barcode };

  const stores = (product.stores || "").toLowerCase();
  const market = MARKETS.filter((item) => stores.includes(item)).join(", ");
  const blob = (product.categories_tags || []).join(" ").toLowerCase();
  const category = ["jugo", "carnes", "cereal", "lacteos", "pescado", "verduras", "frutas", "bebidas", "snacks"].filter(
    (label) => blob.includes(label === "jugo" ? "juice" : label === "carnes" ? "meat" : label === "lacteos" ? "dairy" : label === "pescado" ? "fish" : label === "verduras" ? "vegetable" : label === "frutas" ? "fruit" : label === "bebidas" ? "beverage" : label === "snacks" ? "snack" : "cereal"),
  );
  const nuts = product.nutriments || {};
  let kcal = num(nuts["energy-kcal_100g"]);
  if (kcal <= 0) kcal = num((nuts["energy-kj_100g"] || 0) / 4.184);

  const created = await prisma.food.create({
    data: {
      name: name.slice(0, 180),
      barcode,
      category: category.join(", ") || "otros",
      market,
      kcal,
      protein: num(nuts.proteins_100g),
      carbs: num(nuts.carbohydrates_100g),
      fat: num(nuts.fat_100g),
      packageSize: (product.quantity || "").slice(0, 40),
      imageUrl: (product.image_front_small_url || "").slice(0, 300),
    },
  });
  revalidate();
  return { status: "added", name: created.name, market: created.market, category: created.category };
}

export async function addFoodManual(_prev: { error: string; ok: string }, formData: FormData) {
  await requireUser();
  const barcode = cleanBarcode(String(formData.get("barcode") ?? ""));
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim().toLowerCase();
  const market = String(formData.get("market") ?? "").trim().toLowerCase();
  if (barcode.length < 8) return { error: "Código de barras no válido.", ok: "" };
  if (name.length < 2) return { error: "Escribe el nombre.", ok: "" };
  const taken = await prisma.food.findUnique({ where: { barcode } });
  if (taken) return { error: `Ese código ya está: ${taken.name}`, ok: "" };
  await prisma.food.create({
    data: {
      name: name.slice(0, 180),
      barcode,
      category: category || "otros",
      market,
      kcal: num(formData.get("kcal")),
      protein: num(formData.get("protein")),
      carbs: num(formData.get("carbs")),
      fat: num(formData.get("fat")),
    },
  });
  revalidate();
  return { error: "", ok: `${name} guardado en la base.` };
}
