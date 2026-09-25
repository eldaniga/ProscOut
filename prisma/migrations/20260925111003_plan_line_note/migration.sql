-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MealPlanLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "foodId" INTEGER,
    "name" TEXT NOT NULL,
    "grams" REAL NOT NULL,
    "kcalPer100" REAL NOT NULL,
    "proteinPer100" REAL NOT NULL,
    "carbsPer100" REAL NOT NULL,
    "fatPer100" REAL NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "MealPlanLine_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MealPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MealPlanLine_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MealPlanLine" ("carbsPer100", "fatPer100", "foodId", "grams", "id", "kcalPer100", "name", "planId", "proteinPer100", "slot", "sortOrder") SELECT "carbsPer100", "fatPer100", "foodId", "grams", "id", "kcalPer100", "name", "planId", "proteinPer100", "slot", "sortOrder" FROM "MealPlanLine";
DROP TABLE "MealPlanLine";
ALTER TABLE "new_MealPlanLine" RENAME TO "MealPlanLine";
CREATE INDEX "MealPlanLine_planId_idx" ON "MealPlanLine"("planId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
