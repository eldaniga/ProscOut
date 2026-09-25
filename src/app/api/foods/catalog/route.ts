import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const foods = await prisma.food.findMany({
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
  });

  return NextResponse.json(foods);
}
