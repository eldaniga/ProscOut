import { saveProfile } from "@/actions/nutrition";
import { AddFoodByBarcode } from "@/components/AddFoodByBarcode";
import { FilaProducto } from "@/components/Producto";
import { ProfileForm } from "@/components/ProfileForm";
import Link from "next/link";
import { Fragment } from "react";
import { withUnitCount } from "@/lib/food-units";
import { PLAN_SLOTS, kcalGap, portionOf } from "@/lib/meal-plan";
import {
  ACTIVITY_LEVELS,
  basalMetabolicRate,
  maintenanceCalories,
  reducedCalories,
} from "@/lib/nutrition";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function NutritionPage() {
  const user = await requireUser();
  const profile = await prisma.bodyProfile.findUnique({ where: { userId: user.id } });
  const marketCount = await prisma.food.count({ where: { barcode: { not: null } } });
  const activePlan = await prisma.mealPlan.findFirst({
    where: { userId: user.id, active: true },
    include: {
      lines: {
        include: { food: { select: { unitGrams: true, category: true, market: true, price: true, packageSize: true, imageUrl: true, barcode: true } } },
      },
    },
  });
  const plannedKcal = activePlan
    ? activePlan.lines.reduce((sum, line) => sum + portionOf(line).kcal, 0)
    : null;

  const tmb = profile
    ? basalMetabolicRate(profile.sex, profile.weightKg, profile.heightCm, profile.age)
    : null;
  const maintenance =
    profile && tmb !== null ? maintenanceCalories(tmb, profile.activityFactor) : null;
  const target =
    maintenance !== null && profile
      ? reducedCalories(maintenance, profile.deficitPercent)
      : null;

  return (
    <section className="flex max-w-3xl flex-col gap-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Alimentación</h1>
          <p className="mt-1 text-sm text-zinc-500">
            La etiqueta <span className="font-medium">alimentacion</span> usa esta sección para los macros.
            El objetivo sale de tu peso, altura, edad y actividad. Los alimentos se buscan en Plan de alimentación.
          </p>
        </div>
        <Link
          href="/alimentacion/plan"
          className="press shrink-0 rounded-full bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Plan de alimentación
        </Link>
      </div>

      <AddFoodByBarcode />
      <p className="text-sm text-zinc-500">
        Base de mercados: {marketCount} productos con código de barras.
      </p>

      <ProfileForm
        profile={profile}
        levels={ACTIVITY_LEVELS.map((level) => ({ factor: level.factor, label: level.label }))}
        action={saveProfile}
      />

      {tmb !== null && maintenance !== null && target !== null && profile ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="TMB" value={`${tmb} kcal`} hint="Mifflin-St Jeor" />
          <Stat label="Mantenimiento" value={`${maintenance} kcal`} hint="TMB × actividad" />
          <Stat
            label={`Objetivo (−${profile.deficitPercent}%)`}
            value={`${target} kcal`}
            hint="Sobre el mantenimiento"
          />
        </div>
      ) : null}

      <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-lg font-medium">Cómo vas con el plan</h2>
        {target === null || plannedKcal === null || !activePlan ? (
          <p className="mt-2 text-sm text-zinc-500">
            Guarda tu perfil y crea un plan para ver si te pasas o te quedas corto.
          </p>
        ) : (
          <p className="mt-2 text-sm">
            {activePlan.name}: {kcalGap(plannedKcal, target)}
          </p>
        )}
        <Link href="/alimentacion/plan" className="mt-3 inline-block text-sm underline">
          Plan de alimentación
        </Link>
        {activePlan && activePlan.lines.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[36rem] border-separate border-spacing-y-1 text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-500">
                  <th className="font-normal">Alimento</th>
                  <th className="font-normal">Gramos</th>
                  <th className="font-normal">kcal</th>
                  <th className="font-normal">P</th>
                  <th className="font-normal">C</th>
                  <th className="font-normal">G</th>
                </tr>
              </thead>
              <tbody>
                {PLAN_SLOTS.map((slot) => {
                  const lines = activePlan.lines
                    .filter((line) => line.slot === slot)
                    .map((line) => ({ ...line, ...portionOf(line) }));
                  if (lines.length === 0) return null;
                  const sub = lines.reduce(
                    (sum, line) => {
                      sum.kcal += line.kcal;
                      sum.protein += line.protein;
                      sum.carbs += line.carbs;
                      sum.fat += line.fat;
                      return sum;
                    },
                    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
                  );
                  return (
                    <Fragment key={slot}>
                      <tr>
                        <td colSpan={6} className="pt-3 font-medium capitalize">
                          {slot}
                        </td>
                      </tr>
                      {lines.map((line) => (
                        <FilaProducto
                          key={line.id}
                          product={{
                            name: line.name,
                            kcal: line.kcalPer100,
                            protein: line.proteinPer100,
                            carbs: line.carbsPer100,
                            fat: line.fatPer100,
                            unitGrams: line.food?.unitGrams,
                            category: line.food?.category,
                            market: line.food?.market,
                            price: line.food?.price,
                            packageSize: line.food?.packageSize,
                            imageUrl: line.food?.imageUrl,
                            barcode: line.food?.barcode,
                            grams: line.grams,
                            note: line.note,
                          }}
                        >
                          <td className="max-w-xs pr-3 break-words">
                            {withUnitCount(line.name, line.grams, line.food?.unitGrams)}
                            {[line.food?.category, line.food?.market].filter(Boolean).join(" · ") ? (
                              <span className="mt-0.5 block text-xs text-zinc-500">
                                {[line.food?.category, line.food?.market].filter(Boolean).join(" · ")}
                              </span>
                            ) : null}
                            {line.food?.market ? (
                              <span className="mt-0.5 block text-xs text-zinc-500">
                                {[
                                  line.food.packageSize,
                                  line.food.price != null ? `${line.food.price.toFixed(2)} €` : "sin precio",
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            ) : null}
                            {line.note ? (
                              <span className="mt-0.5 block text-xs text-zinc-500">{line.note}</span>
                            ) : null}
                          </td>
                          <td>{line.grams}</td>
                          <td>{line.kcal}</td>
                          <td>{line.protein}</td>
                          <td>{line.carbs}</td>
                          <td>{line.fat}</td>
                        </FilaProducto>
                      ))}
                      <tr className="text-zinc-500">
                        <td>Suma</td>
                        <td />
                        <td>{sub.kcal}</td>
                        <td>{sub.protein.toFixed(1)}</td>
                        <td>{sub.carbs.toFixed(1)}</td>
                        <td>{sub.fat.toFixed(1)}</td>
                      </tr>
                    </Fragment>
                  );
                })}
                <tr className="font-medium">
                  <td className="pt-3">Total</td>
                  <td />
                  <td className="pt-3">
                    {activePlan.lines.reduce((sum, line) => sum + portionOf(line).kcal, 0)}
                  </td>
                  <td className="pt-3">
                    {activePlan.lines.reduce((sum, line) => sum + portionOf(line).protein, 0).toFixed(1)}
                  </td>
                  <td className="pt-3">
                    {activePlan.lines.reduce((sum, line) => sum + portionOf(line).carbs, 0).toFixed(1)}
                  </td>
                  <td className="pt-3">
                    {activePlan.lines.reduce((sum, line) => sum + portionOf(line).fat, 0).toFixed(1)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      <p className="text-xs text-zinc-500">{hint}</p>
    </div>
  );
}
