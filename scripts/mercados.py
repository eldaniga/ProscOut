#!/usr/bin/env python3
"""Productos de Mercadona, Carrefour, Lidl, Alcampo, Dia y Masymas.

Lee Open Food Facts (datos abiertos, licencia ODbL). No scrapea las webs
de los supermercados: ahí el código de barras casi nunca está publicado.
Cada producto guarda el código de barras, etiquetas de tipo (jugo, carnes,
cereal…) y la etiqueta del mercado. El resultado entra en la tabla Food
y, aparte, en mercados.sql en la raíz del proyecto.
"""

from __future__ import annotations

import json
import sqlite3
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "prisma" / "dev.db"
SQL_PATH = ROOT / "mercados.sql"
CACHE_PATH = ROOT / "prisma" / "data" / "mercados.json"
UA = "ProscOut/1.0 (personal nutrition app; local market import)"
STORES = ("mercadona", "carrefour", "lidl", "alcampo", "dia", "masymas")
PAGE_SIZE = 100
PAUSE = 0.35

CATEGORY_RULES = (
    ("juice", "jugo"),
    ("nectar", "jugo"),
    ("meat", "carnes"),
    ("poultry", "carnes"),
    ("sausage", "carnes"),
    ("ham", "carnes"),
    ("cereal", "cereal"),
    ("bread", "pan"),
    ("milk", "lacteos"),
    ("yogurt", "lacteos"),
    ("yoghurt", "lacteos"),
    ("cheese", "lacteos"),
    ("dairy", "lacteos"),
    ("fish", "pescado"),
    ("seafood", "pescado"),
    ("tuna", "pescado"),
    ("vegetable", "verduras"),
    ("fruit", "frutas"),
    ("water", "bebidas"),
    ("beverage", "bebidas"),
    ("soda", "bebidas"),
    ("snack", "snacks"),
    ("chocolate", "snacks"),
    ("sauce", "salsas"),
    ("oil", "aceites"),
    ("pasta", "pasta"),
    ("rice", "arroz"),
    ("egg", "huevos"),
    ("legume", "legumbres"),
    ("frozen", "congelados"),
    ("biscuit", "galletas"),
    ("cookie", "galletas"),
    ("coffee", "cafe"),
    ("tea", "infusiones"),
    ("sweet", "dulces"),
)


def fetch_page(store: str, page: int) -> dict:
    query = urllib.parse.urlencode(
        {"q": f'stores:"{store}"', "page_size": PAGE_SIZE, "page": page}
    )
    url = f"https://search.openfoodfacts.org/search?{query}"
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    last_error: Exception | None = None
    for attempt in range(5):
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                return json.load(response)
        except Exception as error:  # noqa: BLE001 — reintentos de red
            last_error = error
            time.sleep(2 + attempt * 2)
    raise RuntimeError(f"{store} página {page}: {last_error}")


def categories_of(tags: list) -> str:
    found: list[str] = []
    blob = " ".join(str(tag) for tag in tags).lower()
    for needle, label in CATEGORY_RULES:
        if needle in blob and label not in found:
            found.append(label)
        if len(found) == 3:
            break
    return ", ".join(found) if found else "otros"


def number(value) -> float:
    try:
        return round(float(value), 2)
    except (TypeError, ValueError):
        return 0.0


def product_of(hit: dict, store: str) -> dict | None:
    code = "".join(ch for ch in str(hit.get("code") or "") if ch.isdigit())
    if len(code) < 8:
        return None
    name = str(hit.get("product_name_es") or hit.get("product_name") or "").strip()
    if len(name) < 2:
        return None
    stores = {store}
    for raw in hit.get("stores") or []:
        folded = str(raw).strip().lower().replace(" ", "").replace("-", "")
        for known in STORES:
            if known in folded or folded in known:
                stores.add(known)
    if "masy mas" in " ".join(str(item).lower() for item in (hit.get("stores") or [])):
        stores.add("masymas")
    nuts = hit.get("nutriments") or {}
    kcal = number(nuts.get("energy-kcal_100g"))
    if kcal <= 0:
        kj = number(nuts.get("energy-kj_100g") or nuts.get("energy_100g"))
        if kj > 0:
            kcal = round(kj / 4.184, 2)
    return {
        "barcode": code,
        "name": name[:180],
        "category": categories_of(hit.get("categories_tags") or []),
        "market": ", ".join(sorted(stores)),
        "kcal": kcal,
        "protein": number(nuts.get("proteins_100g")),
        "carbs": number(nuts.get("carbohydrates_100g")),
        "fat": number(nuts.get("fat_100g")),
        "packageSize": str(hit.get("quantity") or "").strip()[:40],
        "imageUrl": str(hit.get("image_front_small_url") or hit.get("image_front_url") or hit.get("image_url") or "")[:300],
        "price": None,
    }


def download() -> dict[str, dict]:
    products: dict[str, dict] = {}
    if CACHE_PATH.exists():
        products = {row["barcode"]: row for row in json.loads(CACHE_PATH.read_text())}
        print(f"caché {len(products)}")
        if sum(1 for row in products.values() if row.get("imageUrl")) > 20000:
            print("fotos y peso ya están en la caché")
            return products
    for store in STORES:
        first = fetch_page(store, 1)
        pages = int(first.get("page_count") or 1)
        print(f"{store}: {first.get('count')} productos, {pages} páginas")
        batches = [first, *[None] * (pages - 1)]
        for page in range(1, pages + 1):
            payload = batches[0] if page == 1 else fetch_page(store, page)
            if page != 1:
                time.sleep(PAUSE)
            hits = payload.get("hits") or []
            if not hits:
                break
            for hit in hits:
                row = product_of(hit, store)
                if not row:
                    continue
                previous = products.get(row["barcode"])
                if previous:
                    markets = sorted(set(previous["market"].split(", ")) | set(row["market"].split(", ")))
                    previous["market"] = ", ".join(part for part in markets if part)
                    if previous["category"] == "otros" and row["category"] != "otros":
                        previous["category"] = row["category"]
                    if previous["kcal"] <= 0 and row["kcal"] > 0:
                        previous.update({k: row[k] for k in ("kcal", "protein", "carbs", "fat")})
                    if row["packageSize"]:
                        previous["packageSize"] = row["packageSize"]
                    if row["imageUrl"]:
                        previous["imageUrl"] = row["imageUrl"]
                else:
                    products[row["barcode"]] = row
            print(f"  {store} {page}/{pages} → {len(products)} únicos", flush=True)
        CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        CACHE_PATH.write_text(json.dumps(list(products.values()), ensure_ascii=False))
    return products


def sql_quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def write_sql(products: dict[str, dict]) -> None:
    lines = [
        "-- Productos de Mercadona, Carrefour, Lidl, Alcampo, Dia y Masymas.",
        "-- Fuente: Open Food Facts (https://openfoodfacts.org), licencia ODbL.",
        "-- Valores por 100 g. category es la etiqueta de tipo; market, la del supermercado.",
        "-- packageSize es el peso o volumen del envase. price es EUR si Open Prices lo tiene. imageUrl es la foto.",
        "BEGIN;",
        "CREATE TABLE IF NOT EXISTS MarketFood (",
        "  barcode TEXT PRIMARY KEY,",
        "  name TEXT NOT NULL,",
        "  category TEXT NOT NULL,",
        "  market TEXT NOT NULL,",
        "  kcal REAL NOT NULL,",
        "  protein REAL NOT NULL,",
        "  carbs REAL NOT NULL,",
        "  fat REAL NOT NULL,",
        "  price REAL,",
        "  packageSize TEXT NOT NULL,",
        "  imageUrl TEXT NOT NULL",
        ");",
        "DELETE FROM MarketFood;",
    ]
    for row in products.values():
        lines.append(
            "INSERT INTO MarketFood (barcode, name, category, market, kcal, protein, carbs, fat, price, packageSize, imageUrl) VALUES ("
            + ", ".join(
                [
                    sql_quote(row["barcode"]),
                    sql_quote(row["name"]),
                    sql_quote(row["category"]),
                    sql_quote(row["market"]),
                    str(row["kcal"]),
                    str(row["protein"]),
                    str(row["carbs"]),
                    str(row["fat"]),
                    "NULL" if row.get("price") is None else str(row["price"]),
                    sql_quote(row.get("packageSize") or ""),
                    sql_quote(row.get("imageUrl") or ""),
                ]
            )
            + ");"
        )
    lines.append("COMMIT;")
    SQL_PATH.write_text("\n".join(lines) + "\n")
    print(f"escrito {SQL_PATH} ({len(products)} filas)")


def save_sqlite(products: dict[str, dict]) -> None:
    connection = sqlite3.connect(DB_PATH)
    try:
        columns = {row[1] for row in connection.execute("PRAGMA table_info(Food)")}
        if "barcode" not in columns:
            raise SystemExit("Falta la columna barcode. Aplica la migración de Prisma antes.")
        existing = {
            row[0]
            for row in connection.execute("SELECT barcode FROM Food WHERE barcode IS NOT NULL")
        }
        added = 0
        for row in products.values():
            if row["barcode"] in existing:
                connection.execute(
                    "UPDATE Food SET name=?, category=?, market=?, kcal=?, protein=?, carbs=?, fat=?, price=?, packageSize=?, imageUrl=? WHERE barcode=?",
                    (
                        row["name"],
                        row["category"],
                        row["market"],
                        row["kcal"],
                        row["protein"],
                        row["carbs"],
                        row["fat"],
                        row.get("price"),
                        row.get("packageSize") or "",
                        row.get("imageUrl") or "",
                        row["barcode"],
                    ),
                )
                continue
            connection.execute(
                "INSERT INTO Food (name, kcal, protein, carbs, fat, barcode, category, market, price, packageSize, imageUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    row["name"],
                    row["kcal"],
                    row["protein"],
                    row["carbs"],
                    row["fat"],
                    row["barcode"],
                    row["category"],
                    row["market"],
                    row.get("price"),
                    row.get("packageSize") or "",
                    row.get("imageUrl") or "",
                ),
            )
            added += 1
        connection.commit()
        total = connection.execute("SELECT COUNT(*) FROM Food WHERE barcode IS NOT NULL").fetchone()[0]
        print(f"SQLite: {added} nuevos, {total} con código de barras")
    finally:
        connection.close()


def fetch_json(url: str) -> dict:
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    last_error: Exception | None = None
    for attempt in range(5):
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                return json.load(response)
        except Exception as error:  # noqa: BLE001
            if getattr(error, "code", None) == 400:
                raise
            last_error = error
            time.sleep(2 + attempt * 2)
    raise RuntimeError(f"{url}: {last_error}")


def place_matches(place: str, market: str) -> bool:
    folded = place.lower().replace(" ", "").replace("-", "")
    return any(part and part in folded for part in market.split(", "))


def attach_prices(products: dict[str, dict]) -> None:
    """Precio en euros si Open Prices lo tiene en España o en uno de estos mercados."""
    page = 1
    pages = 1
    matched = 0
    try:
        while page <= pages:
            payload = fetch_json(
                f"https://prices.openfoodfacts.org/api/v1/prices?currency=EUR&size=100&page={page}"
            )
            pages = int(payload.get("pages") or 1)
            for item in payload.get("items") or []:
                code = "".join(ch for ch in str(item.get("product_code") or "") if ch.isdigit())
                row = products.get(code)
                price = item.get("price")
                if not row or price is None:
                    continue
                location = item.get("location") or {}
                country = str(location.get("osm_address_country_code") or "").upper()
                place = f"{location.get('osm_brand') or ''} {location.get('osm_name') or ''}"
                in_spain = country == "ES"
                in_store = place_matches(place, row["market"])
                if not in_spain and not in_store:
                    continue
                score = (2 if in_spain else 0) + (1 if in_store else 0)
                if score < row.get("_price_score", 0):
                    continue
                if score == row.get("_price_score", 0) and str(item.get("date") or "") < str(row.get("_price_date") or ""):
                    continue
                row["price"] = round(float(price), 2)
                row["_price_score"] = score
                row["_price_date"] = str(item.get("date") or "")
                matched += 1
            if page % 25 == 0 or page == pages:
                priced = sum(1 for row in products.values() if row.get("price") is not None)
                print(f"  precios {page}/{pages}, con precio {priced}", flush=True)
                CACHE_PATH.write_text(json.dumps(list(products.values()), ensure_ascii=False))
            page += 1
            time.sleep(0.2)
    except Exception as error:
        if "400" not in str(error):
            raise
        print(f"el listado de precios corta en la página {page - 1}")
        CACHE_PATH.write_text(json.dumps(list(products.values()), ensure_ascii=False))
    print(f"precios asignados en {matched} lecturas")


def main() -> None:
    products = download()
    if not any(row.get("price") is not None for row in products.values()):
        attach_prices(products)
    for row in products.values():
        row.pop("_price_score", None)
        row.pop("_price_date", None)
    write_sql(products)
    save_sqlite(products)


if __name__ == "__main__":
    main()
