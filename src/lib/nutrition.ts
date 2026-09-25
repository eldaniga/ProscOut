export const ACTIVITY_LEVELS = [
  { factor: 1.2, label: "Sedentario" },
  { factor: 1.375, label: "Ligero" },
  { factor: 1.55, label: "Moderado" },
  { factor: 1.725, label: "Intenso" },
] as const;

/** Mifflin-St Jeor, kilocalorías por día. */
export function basalMetabolicRate(
  sex: string,
  weightKg: number,
  heightCm: number,
  age: number,
) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === "mujer" ? base - 161 : base + 5);
}

export function maintenanceCalories(tmb: number, activityFactor: number) {
  return Math.round(tmb * activityFactor);
}

export function foldFoodQuery(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function reducedCalories(maintenance: number, deficitPercent: number) {
  const percent = Math.min(50, Math.max(0, deficitPercent));
  return Math.round(maintenance * (1 - percent / 100));
}
