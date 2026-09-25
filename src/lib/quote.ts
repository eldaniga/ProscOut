import { dayOfYear } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export async function quoteForDate(iso: string) {
  const count = await prisma.quote.count();
  if (count === 0) return null;
  const index = (dayOfYear(iso) - 1) % count;
  const rows = await prisma.quote.findMany({
    orderBy: { id: "asc" },
    skip: index,
    take: 1,
  });
  return rows[0] ?? null;
}
