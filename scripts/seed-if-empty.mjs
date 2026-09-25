import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

const prisma = new PrismaClient();
const quotes = await prisma.quote.count();
const foods = await prisma.food.count();
if (quotes > 0 && foods > 0) {
  console.log(`seed omitido (${quotes} frases, ${foods} alimentos)`);
  await prisma.$disconnect();
  process.exit(0);
}

const quoteRows = JSON.parse(readFileSync("prisma/data/quotes.json", "utf8"));
const foodRows = JSON.parse(readFileSync("prisma/data/foods.json", "utf8"));
if (quotes === 0) {
  for (let i = 0; i < quoteRows.length; i += 200) {
    await prisma.quote.createMany({ data: quoteRows.slice(i, i + 200) });
  }
}
if (foods === 0) {
  for (let i = 0; i < foodRows.length; i += 400) {
    await prisma.food.createMany({ data: foodRows.slice(i, i + 400) });
  }
}
console.log("seed listo", await prisma.quote.count(), await prisma.food.count());
await prisma.$disconnect();
