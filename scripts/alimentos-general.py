#!/usr/bin/env python3
"""Alimentos genéricos, orientativos para cualquier país.

Nutrición: búsqueda en Open Food Facts, por 100 g.
Foto: miniatura de Wikimedia Commons. Sin precio. Cada uno lleva sus
etiquetas y, además, la etiqueta general.
"""

from __future__ import annotations

import json
import sqlite3
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "prisma" / "dev.db"
SQL_PATH = ROOT / "alimentos_general.sql"
CACHE_PATH = ROOT / "prisma" / "data" / "alimentos-general.json"
UA = {"User-Agent": "ProscOut/1.0 (personal nutrition; generic foods)"}

# nombre, etiquetas, búsqueda, palabra del nombre, foto, kcal mín y máx por 100 g
FOODS = [
    ("Pechuga de pollo", "pollo, carne", "pechuga de pollo", "pechuga", "raw chicken breast", 90, 180),
    ("Muslo de pollo", "pollo, carne", "muslo de pollo", "muslo", "raw chicken thigh", 100, 220),
    ("Pechuga de pavo", "pavo, carne", "pechuga de pavo", "pavo", "raw turkey breast", 80, 180),
    ("Ternera magra", "ternera, carne", "filete de ternera", "ternera", "raw beef steak", 90, 200),
    ("Lomo de cerdo", "cerdo, carne", "lomo de cerdo", "cerdo", "raw pork loin", 110, 250),
    ("Huevo", "huevos", "huevo", "huevo", "chicken egg", 120, 170),
    ("Clara de huevo", "huevos", "clara de huevo", "clara", "egg white", 40, 70),
    ("Salmón", "pescado", "salmon", "salmon", "raw salmon", 140, 250),
    ("Merluza", "pescado", "merluza", "merluza", "raw white fish", 60, 160),
    ("Atún", "pescado", "atun", "atun", "raw tuna", 80, 200),
    ("Gambas", "pescado", "gambas", "gamba", "raw shrimp", 60, 140),
    ("Bacalao", "pescado", "bacalao", "bacalao", "raw cod", 50, 130),
    ("Leche entera", "lacteos", "leche entera", "leche", "glass of milk", 50, 80),
    ("Leche desnatada", "lacteos", "leche desnatada", "leche", "skim milk", 25, 45),
    ("Yogur natural", "lacteos", "yogur natural", "yogur", "plain yogurt", 40, 90),
    ("Queso fresco", "lacteos", "queso fresco", "queso", "cottage cheese", 150, 280),
    ("Arroz blanco", "arroz, cereal", "arroz blanco", "arroz", "cooked white rice", 100, 180),
    ("Arroz integral", "arroz, cereal", "arroz integral", "arroz", "cooked brown rice", 140, 200),
    ("Pasta", "pasta, cereal", "espaguetis", "espagueti", "cooked pasta", 120, 180),
    ("Pan", "pan, cereal", "pan de molde", "pan", "sliced bread", 220, 320),
    ("Avena", "cereal", "copos de avena", "avena", "rolled oats", 340, 420),
    ("Quinoa", "cereal", "quinoa", "quinoa", "cooked quinoa", 100, 180),
    ("Patata", "verduras", "patata", "patata", "raw potato", 60, 120),
    ("Boniato", "verduras", "boniato", "boniato", "sweet potato", 70, 140),
    ("Lentejas", "legumbres", "lentejas cocidas", "lenteja", "cooked lentils", 70, 140),
    ("Garbanzos", "legumbres", "garbanzos cocidos", "garbanzo", "cooked chickpeas", 80, 180),
    ("Alubias", "legumbres", "alubias cocidas", "alubia", "cooked black beans", 70, 180),
    ("Tofu", "proteina", "tofu", "tofu", "tofu block", 50, 200),
    ("Tomate", "verduras", "tomate cherry", "tomate", "red tomato", 12, 40),
    ("Lechuga", "verduras", "lechuga iceberg", "lechuga", "romaine lettuce", 8, 30),
    ("Brócoli", "verduras", "brocoli", "brocoli", "raw broccoli", 20, 60),
    ("Zanahoria", "verduras", "zanahoria", "zanahoria", "carrots", 20, 50),
    ("Cebolla", "verduras", "cebolla", "cebolla", "onion", 20, 50),
    ("Manzana", "frutas", "manzana", "manzana", "red apple", 40, 70),
    ("Plátano", "frutas", "platano de canarias", "platano", "banana", 70, 130),
    ("Naranja", "frutas", "naranja", "naranja", "orange fruit", 30, 70),
    ("Aceite de oliva", "aceites", "aceite de oliva", "aceite", "olive oil bottle", 800, 900),
    ("Almendra", "frutos secos", "almendras", "almendra", "almonds", 500, 650),
    ("Nuez", "frutos secos", "nueces", "nuece", "walnuts", 600, 750),
    ("Miel", "dulces", "miel", "miel", "honey jar", 280, 350),
]

REJECT = (
    "bebida",
    "galleta",
    "frito",
    "snack",
    "chips",
    "inflado",
    "zumo",
    "nectar",
    "batido",
    "turron",
    "burger",
    "helado",
    "salsa",
    "polvo",
)


def get_json(url: str) -> dict:
    request = urllib.request.Request(url, headers=UA)
    for attempt in range(6):
        try:
            with urllib.request.urlopen(request, timeout=40) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            if error.code != 429 or attempt == 5:
                raise
            time.sleep(8 + attempt * 4)
    raise RuntimeError(url)


def number(value) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def fold(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value.lower())
    return "".join(char for char in normalized if unicodedata.category(char) != "Mn")


def nutrition(query: str, must: str, low: float, high: float) -> tuple[float, float, float, float]:
    url = "https://search.openfoodfacts.org/search?" + urllib.parse.urlencode(
        {"q": query, "page_size": 20, "fields": "product_name,nutriments"}
    )
    best: tuple[float, float, float, float] | None = None
    best_distance = 10**9
    middle = (low + high) / 2
    for hit in get_json(url).get("hits") or []:
        label = fold(str(hit.get("product_name") or ""))
        if must not in label or any(word in label for word in REJECT):
            continue
        nuts = hit.get("nutriments") or {}
        kcal = number(nuts.get("energy-kcal_100g"))
        if kcal <= 0:
            kj = number(nuts.get("energy-kj_100g") or nuts.get("energy_100g"))
            if kj > 0:
                kcal = kj / 4.184
        if kcal < low or kcal > high:
            continue
        distance = abs(kcal - middle)
        if distance < best_distance:
            best_distance = distance
            best = (
                round(kcal, 2),
                round(number(nuts.get("proteins_100g")), 2),
                round(number(nuts.get("carbohydrates_100g")), 2),
                round(number(nuts.get("fat_100g")), 2),
            )
    if not best:
        raise RuntimeError(query)
    return best


def photo(query: str) -> str:
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(
        {
            "action": "query",
            "generator": "search",
            "gsrsearch": query,
            "gsrnamespace": 6,
            "gsrlimit": 1,
            "prop": "imageinfo",
            "iiprop": "url",
            "iiurlwidth": 300,
            "format": "json",
        }
    )
    pages = (get_json(url).get("query") or {}).get("pages") or {}
    if not pages:
        return ""
    info = (next(iter(pages.values())).get("imageinfo") or [{}])[0]
    return str(info.get("thumburl") or info.get("url") or "")[:300]


def sql_quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def main() -> None:
    saved = {}
    if CACHE_PATH.exists():
        saved = {row["name"]: row for row in json.loads(CACHE_PATH.read_text())}
    rows = []
    for name, tags, query, must, image_query, low, high in FOODS:
        if name in saved:
            rows.append(saved[name])
            print(f"{name}: caché", flush=True)
            continue
        kcal, protein, carbs, fat = nutrition(query, must, low, high)
        image = photo(image_query)
        category = f"{tags}, general"
        rows.append(
            {
                "name": name,
                "category": category,
                "kcal": kcal,
                "protein": protein,
                "carbs": carbs,
                "fat": fat,
                "imageUrl": image,
            }
        )
        print(f"{name}: {kcal} kcal · {category}", flush=True)
        saved[name] = rows[-1]
        CACHE_PATH.write_text(json.dumps(list(saved.values()), ensure_ascii=False))
        time.sleep(0.35)

    lines = [
        "-- Alimentos genéricos, orientativos, sin precio.",
        "-- Nutrición: Open Food Facts, por 100 g. Foto: Wikimedia Commons. Sin precio.",
        "-- category incluye las etiquetas del alimento y la etiqueta general.",
        "BEGIN;",
        "CREATE TABLE IF NOT EXISTS GeneralFood (",
        "  name TEXT PRIMARY KEY,",
        "  category TEXT NOT NULL,",
        "  kcal REAL NOT NULL,",
        "  protein REAL NOT NULL,",
        "  carbs REAL NOT NULL,",
        "  fat REAL NOT NULL,",
        "  imageUrl TEXT NOT NULL",
        ");",
        "DELETE FROM GeneralFood;",
    ]
    for row in rows:
        lines.append(
            "INSERT INTO GeneralFood (name, category, kcal, protein, carbs, fat, imageUrl) VALUES ("
            + ", ".join(
                [
                    sql_quote(row["name"]),
                    sql_quote(row["category"]),
                    str(row["kcal"]),
                    str(row["protein"]),
                    str(row["carbs"]),
                    str(row["fat"]),
                    sql_quote(row["imageUrl"]),
                ]
            )
            + ");"
        )
    lines.append("COMMIT;")
    SQL_PATH.write_text("\n".join(lines) + "\n")

    connection = sqlite3.connect(DB_PATH)
    try:
        added = 0
        for row in rows:
            existing = connection.execute(
                "SELECT id FROM Food WHERE name = ? AND market = '' AND barcode IS NULL AND category LIKE '%general%'",
                (row["name"],),
            ).fetchone()
            if existing:
                connection.execute(
                    "UPDATE Food SET category=?, kcal=?, protein=?, carbs=?, fat=?, imageUrl=?, price=NULL WHERE id=?",
                    (row["category"], row["kcal"], row["protein"], row["carbs"], row["fat"], row["imageUrl"], existing[0]),
                )
                continue
            connection.execute(
                "INSERT INTO Food (name, kcal, protein, carbs, fat, category, market, price, packageSize, imageUrl) VALUES (?, ?, ?, ?, ?, ?, '', NULL, '', ?)",
                (row["name"], row["kcal"], row["protein"], row["carbs"], row["fat"], row["category"], row["imageUrl"]),
            )
            added += 1
        connection.commit()
        print(f"SQLite: {added} nuevos, {len(rows)} generales")
    finally:
        connection.close()


if __name__ == "__main__":
    main()
