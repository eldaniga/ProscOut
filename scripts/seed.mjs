import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { unitGramsForName } from "./food-units.mjs";

const prisma = new PrismaClient();
const quotes = JSON.parse(readFileSync("prisma/data/quotes.json", "utf8"));
const foods = JSON.parse(readFileSync("prisma/data/foods.json", "utf8"));

await prisma.dietEntry.deleteMany();
await prisma.food.deleteMany();
await prisma.quote.deleteMany();

for (let i = 0; i < quotes.length; i += 200) {
  await prisma.quote.createMany({ data: quotes.slice(i, i + 200) });
}
const foodRows = foods.map((food) => ({
  ...food,
  unitGrams: unitGramsForName(food.name),
}));
for (let i = 0; i < foodRows.length; i += 400) {
  await prisma.food.createMany({ data: foodRows.slice(i, i + 400) });
}

console.log("quotes", await prisma.quote.count(), "foods", await prisma.food.count());
await prisma.$disconnect();
