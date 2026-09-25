import Link from "next/link";
import {
  activateMealPlan,
  createMealPlan,
  deleteMealPlan,
} from "@/actions/plans";
import { PlanFoodPicker } from "@/components/PlanFoodPicker";
import { PlanMeals } from "@/components/PlanMeals";
import { portionOf } from "@/lib/meal-plan";
import { reducedCalories, basalMetabolicRate, maintenanceCalories } from "@/lib/nutrition";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function MealPlanPage(props: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const user = await requireUser();
  const query = await props.searchParams;
  const profile = await prisma.bodyProfile.findUnique({ where: { userId: user.id } });
  const plans = await prisma.mealPlan.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      lines: {
        orderBy: { sortOrder: "asc" },
        include: { food: { select: { unitGrams: true, category: true, market: true, price: true, packageSize: true, imageUrl: true, barcode: true } } },
      },
    },
  });
  const requested = typeof query.plan === "string" ? query.plan : "";
  const current = plans.find((plan) => plan.id === requested) ?? plans.find((plan) => plan.active) ?? plans[0];
  const foods = current
    ? await prisma.food.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          kcal: true,
          protein: true,
          carbs: true,
          fat: true,
          unitGrams: true,
          category: true,
          market: true,
          price: true,
          packageSize: true,
          imageUrl: true,
          barcode: true,
        },
      })
    : [];

  const target = profile
    ? reducedCalories(
        maintenanceCalories(
          basalMetabolicRate(profile.sex, profile.weightKg, profile.heightCm, profile.age),
          profile.activityFactor,
        ),
        profile.deficitPercent,
      )
    : null;

  const rows = current
    ? current.lines.map((line) => ({ ...line, ...portionOf(line) }))
    : [];

  return (
    <section className="flex max-w-4xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Plan de alimentación</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Varios planes guardados. Los gramos se editan y las columnas se recalculan con la base local.
        </p>
        <Link href="/alimentacion" className="mt-2 inline-block text-sm underline">
          Volver a alimentación
        </Link>
      </div>

      {!profile ? (
        <p className="text-sm text-zinc-500">
          Primero guarda edad, peso y altura en{" "}
          <Link href="/alimentacion" className="underline">
            Alimentación
          </Link>
          .
        </p>
      ) : (
        <form action={createMealPlan} className="flex flex-wrap items-center gap-2">
          <input
            name="name"
            required
            maxLength={80}
            placeholder="Nombre del plan"
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
          />
          <button className="rounded-full bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
            Crear plan
          </button>
        </form>
      )}

      {plans.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {plans.map((plan) => (
            <li key={plan.id} className="flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1 text-sm dark:border-zinc-800">
              <Link href={`/alimentacion/plan?plan=${plan.id}`} className={plan.id === current?.id ? "font-medium" : ""}>
                {plan.name}
                {plan.active ? " · activo" : ""}
              </Link>
              {plan.id === current?.id && !plan.active ? (
                <form action={activateMealPlan.bind(null, plan.id)}>
                  <button className="text-zinc-500 underline">Usar</button>
                </form>
              ) : null}
              <form action={deleteMealPlan.bind(null, plan.id)}>
                <button className="text-zinc-500 underline">Borrar</button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}

      {current && target !== null ? (
        <div className="flex flex-col gap-4">
          <PlanMeals
            target={target}
            lines={rows.map((line) => ({
              id: line.id,
              slot: line.slot,
              name: line.name,
              grams: line.grams,
              kcal: line.kcal,
              protein: line.protein,
              carbs: line.carbs,
              fat: line.fat,
              note: line.note,
              kcalPer100: line.kcalPer100,
              proteinPer100: line.proteinPer100,
              carbsPer100: line.carbsPer100,
              fatPer100: line.fatPer100,
              unitGrams: line.food?.unitGrams,
              category: line.food?.category ?? "",
              market: line.food?.market ?? "",
              price: line.food?.price,
              packageSize: line.food?.packageSize ?? "",
              imageUrl: line.food?.imageUrl ?? "",
              barcode: line.food?.barcode ?? "",
            }))}
          />
          <PlanFoodPicker planId={current.id} foods={foods} />
        </div>
      ) : null}
    </section>
  );
}
