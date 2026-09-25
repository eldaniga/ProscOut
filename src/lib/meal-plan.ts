import {
  basalMetabolicRate,
  foldFoodQuery,
  maintenanceCalories,
  reducedCalories,
} from "@/lib/nutrition";

export type PlanFood = {
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type PlanProfile = {
  sex: string;
  age: number;
  heightCm: number;
  weightKg: number;
  activityFactor: number;
  deficitPercent: number;
};

export type MealLine = {
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type MealSlot = {
  label: string;
  share: number;
  targetKcal: number;
  lines: MealLine[];
};

export type MealPlan = {
  targetKcal: number;
  protein: number;
  carbs: number;
  fat: number;
  meals: MealSlot[];
};

export const PLAN_SLOTS = ["desayuno", "comida", "merienda", "cena"] as const;

export function portionOf(
  line: { grams: number; kcalPer100: number; proteinPer100: number; carbsPer100: number; fatPer100: number },
) {
  const factor = line.grams / 100;
  return {
    kcal: Math.round(line.kcalPer100 * factor),
    protein: Math.round(line.proteinPer100 * factor * 10) / 10,
    carbs: Math.round(line.carbsPer100 * factor * 10) / 10,
    fat: Math.round(line.fatPer100 * factor * 10) / 10,
  };
}

const SLOTS: { label: string; share: number; keywords: string[] }[] = [
  { label: "Desayuno", share: 0.25, keywords: ["avena", "pan", "huevo", "leche", "yogur", "manzana"] },
  { label: "Comida", share: 0.35, keywords: ["pollo", "arroz", "lenteja", "patata", "tomate", "merluza"] },
  { label: "Merienda", share: 0.15, keywords: ["yogur", "manzana", "nuez", "almendra", "queso"] },
  { label: "Cena", share: 0.25, keywords: ["merluza", "atún", "huevo", "tomate", "patata", "pavo"] },
];

const GRAMS = [50, 80, 100, 120, 150, 200];

export function isMealTask(activity: { name: string; tags?: string }) {
  const name = foldFoodQuery(activity.name);
  const tags = (activity.tags ?? "")
    .split(",")
    .map((tag) => foldFoodQuery(tag.trim()));
  return name.includes("comida") || tags.includes("alimentacion");
}

function macrosFor(food: PlanFood, grams: number) {
  const factor = grams / 100;
  return {
    kcal: food.kcal * factor,
    protein: food.protein * factor,
    carbs: food.carbs * factor,
    fat: food.fat * factor,
  };
}

function dailyMacros(profile: PlanProfile, targetKcal: number) {
  let protein = Math.round(profile.weightKg * 1.6);
  let fat = Math.round(profile.weightKg * 0.8);
  let proteinKcal = protein * 4;
  let fatKcal = fat * 9;
  if (proteinKcal + fatKcal > targetKcal) {
    const room = Math.max(targetKcal - proteinKcal, targetKcal * 0.2);
    fat = Math.max(0, Math.floor(room / 9));
    fatKcal = fat * 9;
  }
  if (proteinKcal + fatKcal > targetKcal) {
    protein = Math.max(0, Math.floor((targetKcal - fatKcal) / 4));
    proteinKcal = protein * 4;
  }
  const carbs = Math.max(0, Math.round((targetKcal - proteinKcal - fatKcal) / 4));
  return { protein, fat, carbs };
}

function startsWithWord(name: string, word: string) {
  return foldFoodQuery(name).startsWith(foldFoodQuery(word));
}

function poolFor(foods: PlanFood[], keywords: string[], used: Set<string>) {
  const picked = foods.filter((food) => {
    if (used.has(food.name) || food.kcal < 30 || food.kcal > 450) return false;
    return keywords.some((word) => startsWithWord(food.name, word));
  });
  return picked.length > 0
    ? picked
    : foods.filter((food) => !used.has(food.name) && food.kcal >= 40 && food.kcal <= 250);
}

function plainPenalty(name: string) {
  const folded = foldFoodQuery(name);
  return ["frit", "azucar", "miel", "chocolate", "mousse", "boll"].some((word) => folded.includes(word))
    ? 1
    : 0;
}

function pickLine(candidates: PlanFood[], aimKcal: number, remainingKcal: number): MealLine | null {
  let best: MealLine | null = null;
  let bestRank = Infinity;
  for (const food of candidates) {
    for (const grams of GRAMS) {
      const portion = macrosFor(food, grams);
      if (portion.kcal > remainingKcal * 1.08 || portion.kcal < 40) continue;
      const error = Math.abs(aimKcal - portion.kcal);
      const rank = plainPenalty(food.name) * 1000 + error;
      const tie = best ? food.name.localeCompare(best.name, "es") : -1;
      if (rank < bestRank || (rank === bestRank && tie < 0)) {
        bestRank = rank;
        best = { name: food.name, grams, ...roundLine(portion) };
      }
    }
  }
  return best;
}

function roundLine(values: { kcal: number; protein: number; carbs: number; fat: number }) {
  return {
    kcal: Math.round(values.kcal),
    protein: Math.round(values.protein * 10) / 10,
    carbs: Math.round(values.carbs * 10) / 10,
    fat: Math.round(values.fat * 10) / 10,
  };
}

export function buildMealPlan(profile: PlanProfile, foods: PlanFood[]): MealPlan {
  const tmb = basalMetabolicRate(profile.sex, profile.weightKg, profile.heightCm, profile.age);
  const maintenance = maintenanceCalories(tmb, profile.activityFactor);
  const targetKcal = reducedCalories(maintenance, profile.deficitPercent);
  const macros = dailyMacros(profile, targetKcal);
  const used = new Set<string>();

  const meals = SLOTS.map((slot) => {
    const target = Math.round(targetKcal * slot.share);
    const candidates = poolFor(foods, slot.keywords, used);
    const lines: MealLine[] = [];
    const stems = new Set<string>();
    let filled = 0;
    for (let step = 0; step < 3; step += 1) {
      const remaining = target - filled;
      if (remaining < 60) break;
      const line = pickLine(
        candidates.filter((food) => {
          if (lines.some((item) => item.name === food.name)) return false;
          const stem = slot.keywords.find((word) => startsWithWord(food.name, word));
          return !stem || !stems.has(stem);
        }),
        remaining / (3 - lines.length),
        remaining,
      );
      if (!line) break;
      lines.push(line);
      used.add(line.name);
      const stem = slot.keywords.find((word) => startsWithWord(line.name, word));
      if (stem) stems.add(stem);
      filled += line.kcal;
    }
    return { label: slot.label, share: slot.share, targetKcal: target, lines };
  });

  return { targetKcal, ...macros, meals };
}

export function kcalGap(planned: number, target: number) {
  const diff = planned - target;
  if (Math.abs(diff) <= 15) return `Está en el objetivo: ${planned} kcal de ${target}.`;
  if (diff > 0) return `Por encima: ${diff} kcal más que el objetivo de ${target}.`;
  return `Por debajo: ${-diff} kcal menos que el objetivo de ${target}.`;
}

export function formatMealPlan(plan: MealPlan) {
  const meals = plan.meals
    .map((meal) => {
      const foods = meal.lines
        .map(
          (line) =>
            `- ${line.name}, ${line.grams} g · ${line.kcal} kcal · P ${line.protein} · C ${line.carbs} · G ${line.fat}`,
        )
        .join("\n");
      return `${meal.label} (${meal.targetKcal} kcal)\n${foods || "- Sin alimento que encaje"}`;
    })
    .join("\n\n");
  return `Plan de alimentación · ${plan.targetKcal} kcal\nProteína ${plan.protein} g · Hidratos ${plan.carbs} g · Grasa ${plan.fat} g\n\n${meals}`;
}
