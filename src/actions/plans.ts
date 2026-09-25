"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { PLAN_SLOTS, buildMealPlan } from "@/lib/meal-plan";

function revalidate() {
  revalidatePath("/alimentacion");
  revalidatePath("/alimentacion/plan");
}

export async function replacePlanLines(planId: string, userId: string) {
  const profile = await prisma.bodyProfile.findUnique({ where: { userId } });
  if (!profile) return;
  const foods = await prisma.food.findMany({
    where: { market: "", NOT: { category: { contains: "general" } } },
  });
  const built = buildMealPlan(profile, foods);
  const byName = new Map(foods.map((food) => [food.name, food]));
  await prisma.mealPlanLine.deleteMany({ where: { planId } });
  let sortOrder = 0;
  const rows = built.meals.flatMap((meal) =>
    meal.lines.map((line) => {
      const food = byName.get(line.name);
      const row = {
        planId,
        slot: meal.label.toLowerCase(),
        foodId: food?.id ?? null,
        name: line.name,
        grams: line.grams,
        kcalPer100: (food?.protein ?? 0) * 4 + (food?.carbs ?? 0) * 4 + (food?.fat ?? 0) * 9,
        proteinPer100: food?.protein ?? 0,
        carbsPer100: food?.carbs ?? 0,
        fatPer100: food?.fat ?? 0,
        sortOrder,
      };
      sortOrder += 1;
      return row;
    }),
  );
  if (rows.length > 0) await prisma.mealPlanLine.createMany({ data: rows });
}

export async function createMealPlan(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 1 || name.length > 80) return;
  const profile = await prisma.bodyProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return;
  await prisma.mealPlan.updateMany({ where: { userId: user.id }, data: { active: false } });
  const plan = await prisma.mealPlan.create({
    data: { userId: user.id, name, active: true },
  });
  await replacePlanLines(plan.id, user.id);
  revalidate();
}

export async function activateMealPlan(planId: string) {
  const user = await requireUser();
  const plan = await prisma.mealPlan.findFirst({
    where: { id: planId, userId: user.id },
    select: { id: true },
  });
  if (!plan) return;
  await prisma.mealPlan.updateMany({ where: { userId: user.id }, data: { active: false } });
  await prisma.mealPlan.update({ where: { id: plan.id }, data: { active: true } });
  revalidate();
}

export async function deleteMealPlan(planId: string) {
  const user = await requireUser();
  await prisma.mealPlan.deleteMany({ where: { id: planId, userId: user.id } });
  const next = await prisma.mealPlan.findFirst({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });
  if (next) await prisma.mealPlan.update({ where: { id: next.id }, data: { active: true } });
  revalidate();
}

export async function createPlanForWeight(userId: string, weightKg: number) {
  const existing = await prisma.mealPlan.count({ where: { userId } });
  if (existing === 0) return;
  await prisma.mealPlan.updateMany({ where: { userId }, data: { active: false } });
  const plan = await prisma.mealPlan.create({
    data: { userId, name: `Peso ${weightKg} kg`, active: true },
  });
  await replacePlanLines(plan.id, userId);
}

export async function updatePlanLine(formData: FormData) {
  const user = await requireUser();
  const lineId = String(formData.get("lineId") ?? "");
  const grams = Number(formData.get("grams"));
  const protein = Number(formData.get("protein"));
  const carbs = Number(formData.get("carbs"));
  const fat = Number(formData.get("fat"));
  const note = String(formData.get("note") ?? "").trim().slice(0, 280);
  if (!(grams >= 1 && grams <= 2000)) return;
  if (![protein, carbs, fat].every((value) => Number.isFinite(value) && value >= 0 && value <= 5000)) {
    return;
  }
  const kcal = Math.round(protein * 4 + carbs * 4 + fat * 9);
  const line = await prisma.mealPlanLine.findFirst({
    where: { id: lineId, plan: { userId: user.id } },
    select: { id: true },
  });
  if (!line) return;
  const factor = grams / 100;
  await prisma.mealPlanLine.update({
    where: { id: line.id },
    data: {
      grams,
      note,
      kcalPer100: kcal / factor,
      proteinPer100: protein / factor,
      carbsPer100: carbs / factor,
      fatPer100: fat / factor,
    },
  });
  revalidate();
}

export async function updatePlanGrams(formData: FormData) {
  const user = await requireUser();
  const lineId = String(formData.get("lineId") ?? "");
  const grams = Number(formData.get("grams"));
  if (!(grams >= 1 && grams <= 2000)) return;
  const line = await prisma.mealPlanLine.findFirst({
    where: { id: lineId, plan: { userId: user.id } },
    select: { id: true },
  });
  if (!line) return;
  await prisma.mealPlanLine.update({ where: { id: line.id }, data: { grams } });
  revalidate();
}

export async function movePlanLine(lineId: string, slot: string) {
  const user = await requireUser();
  if (!PLAN_SLOTS.includes(slot as (typeof PLAN_SLOTS)[number])) return;
  const line = await prisma.mealPlanLine.findFirst({
    where: { id: lineId, plan: { userId: user.id } },
    select: { id: true, slot: true },
  });
  if (!line || line.slot === slot) return;
  await prisma.mealPlanLine.update({ where: { id: line.id }, data: { slot } });
  revalidate();
}

export async function clearPlan(planId: string) {
  const user = await requireUser();
  const plan = await prisma.mealPlan.findFirst({
    where: { id: planId, userId: user.id },
    select: { id: true },
  });
  if (!plan) return;
  await prisma.mealPlanLine.deleteMany({ where: { planId: plan.id } });
  revalidate();
}

export async function clearPlanSlot(planId: string, slot: string) {
  const user = await requireUser();
  if (!PLAN_SLOTS.includes(slot as (typeof PLAN_SLOTS)[number])) return;
  const plan = await prisma.mealPlan.findFirst({
    where: { id: planId, userId: user.id },
    select: { id: true },
  });
  if (!plan) return;
  await prisma.mealPlanLine.deleteMany({ where: { planId: plan.id, slot } });
  revalidate();
}

export async function deletePlanLine(lineId: string) {
  const user = await requireUser();
  const line = await prisma.mealPlanLine.findFirst({
    where: { id: lineId, plan: { userId: user.id } },
    select: { id: true },
  });
  if (!line) return;
  await prisma.mealPlanLine.delete({ where: { id: line.id } });
  revalidate();
}

export async function addPlanFood(formData: FormData) {
  const user = await requireUser();
  const planId = String(formData.get("planId") ?? "");
  const foodId = Number(formData.get("foodId"));
  const slot = String(formData.get("slot") ?? "");
  const grams = Number(formData.get("grams") ?? 100);
  if (!PLAN_SLOTS.includes(slot as (typeof PLAN_SLOTS)[number])) return;
  if (!(grams >= 1 && grams <= 2000)) return;
  const plan = await prisma.mealPlan.findFirst({
    where: { id: planId, userId: user.id },
    select: { id: true },
  });
  const food = await prisma.food.findUnique({ where: { id: foodId } });
  if (!plan || !food) return;
  const last = await prisma.mealPlanLine.findFirst({
    where: { planId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  await prisma.mealPlanLine.create({
    data: {
      planId,
      slot,
      foodId: food.id,
      name: food.name,
      grams,
      kcalPer100: food.protein * 4 + food.carbs * 4 + food.fat * 9,
      proteinPer100: food.protein,
      carbsPer100: food.carbs,
      fatPer100: food.fat,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });
  revalidate();
}
