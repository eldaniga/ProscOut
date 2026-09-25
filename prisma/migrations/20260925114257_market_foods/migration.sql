-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Food" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "kcal" REAL NOT NULL,
    "protein" REAL NOT NULL,
    "carbs" REAL NOT NULL,
    "fat" REAL NOT NULL,
    "unitGrams" REAL,
    "barcode" TEXT,
    "category" TEXT NOT NULL DEFAULT '',
    "market" TEXT NOT NULL DEFAULT ''
);
INSERT INTO "new_Food" ("carbs", "fat", "id", "kcal", "name", "protein", "unitGrams") SELECT "carbs", "fat", "id", "kcal", "name", "protein", "unitGrams" FROM "Food";
DROP TABLE "Food";
ALTER TABLE "new_Food" RENAME TO "Food";
CREATE UNIQUE INDEX "Food_barcode_key" ON "Food"("barcode");
CREATE INDEX "Food_name_idx" ON "Food"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
