"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { createPlanForWeight } from "@/actions/plans";
import { ACTIVITY_LEVELS } from "@/lib/nutrition";
import { isIsoDate, todayISO } from "@/lib/dates";

function revalidate() {
  revalidatePath("/alimentacion");
  revalidatePath("/");
  revalidatePath("/actividades/lista");
  revalidatePath("/alimentacion/plan");
}

export async function saveProfile(_prev: { error: string }, formData: FormData) {
  const user = await requireUser();
  const sex = String(formData.get("sex") ?? "");
  const age = Number(formData.get("age"));
  const heightCm = Number(formData.get("heightCm"));
  const weightKg = Number(formData.get("weightKg"));
  const activityFactor = Number(formData.get("activityFactor"));
  const deficitPercent = Number(formData.get("deficitPercent"));

  if (sex !== "hombre" && sex !== "mujer") return { error: "Elige sexo para la fórmula." };
  if (!Number.isInteger(age) || age < 10 || age > 120) return { error: "Edad no válida." };
  if (!(heightCm >= 80 && heightCm <= 250)) return { error: "Altura no válida." };
  if (!(weightKg >= 25 && weightKg <= 400)) return { error: "Peso no válido." };
  if (!ACTIVITY_LEVELS.some((level) => level.factor === activityFactor)) {
    return { error: "Nivel de actividad no válido." };
  }
  if (!Number.isInteger(deficitPercent) || deficitPercent < 0 || deficitPercent > 50) {
    return { error: "El porcentaje de reducción va de 0 a 50." };
  }

  const previous = await prisma.bodyProfile.findUnique({
    where: { userId: user.id },
    select: { weightKg: true },
  });
  await prisma.bodyProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, sex, age, heightCm, weightKg, activityFactor, deficitPercent },
    update: { sex, age, heightCm, weightKg, activityFactor, deficitPercent },
  });
  if (previous && previous.weightKg !== weightKg) {
    await createPlanForWeight(user.id, weightKg);
  }
  revalidate();
  return { error: "" };
}

export async function addDietEntry(formData: FormData) {
  const user = await requireUser();
  const foodId = Number(formData.get("foodId"));
  const grams = Number(formData.get("grams"));
  const date = String(formData.get("date") ?? todayISO());
  if (!isIsoDate(date) || !Number.isInteger(foodId)) return;
  if (!(grams > 0 && grams <= 5000)) return;

  const food = await prisma.food.findUnique({ where: { id: foodId }, select: { id: true } });
  if (!food) return;

  await prisma.dietEntry.create({
    data: { userId: user.id, foodId, grams, date },
  });
  revalidate();
}

export async function deleteDietEntry(id: string) {
  const user = await requireUser();
  await prisma.dietEntry.deleteMany({ where: { id, userId: user.id } });
  revalidate();
}
