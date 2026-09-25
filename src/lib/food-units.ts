export function unitCount(grams: number, unitGrams?: number | null) {
  if (!unitGrams || unitGrams <= 0) return null;
  const value = Math.round((grams / unitGrams) * 10) / 10;
  if (value <= 0) return null;
  return Number.isInteger(value) ? String(value) : String(value);
}

export function withUnitCount(name: string, grams: number, unitGrams?: number | null) {
  const count = unitCount(grams, unitGrams);
  return count ? `${count} · ${name}` : name;
}
