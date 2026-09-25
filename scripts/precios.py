#!/usr/bin/env python3
"""Precios de supermercado cruzados por código de barras.

Mercadona publica en la ficha de cada producto el EAN y el precio de venta
(tienda.mercadona.es). Este script recorre esas fichas y copia el precio a
Food y a mercados.sql cuando el código coincide.

Carrefour, Dia, Lidl, Alcampo y Masymas no están dejando leer el catálogo
con el código de barras: la web responde 403, 404 o una página sin EAN.
Esas cadenas se anotan y no se inventa un precio.
"""

from __future__ import annotations

import json
import sqlite3
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "prisma" / "dev.db"
CACHE_PATH = ROOT / "prisma" / "data" / "mercados.json"
PROGRESS_PATH = ROOT / "prisma" / "data" / "precios.json"
UA = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "es-ES,es;q=0.9",
}
WORKERS = 6


def get_json(url: str) -> dict:
    request = urllib.request.Request(url, headers=UA)
    last_error: Exception | None = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=40) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            if error.code in (404, 410):
                return {}
            last_error = error
            time.sleep(1 + attempt)
        except Exception as error:  # noqa: BLE001
            last_error = error
            time.sleep(1 + attempt)
    raise RuntimeError(f"{url}: {last_error}")


def load_progress() -> dict:
    if PROGRESS_PATH.exists():
        return json.loads(PROGRESS_PATH.read_text())
    return {"ids": [], "done": [], "prices": {}}


def save_progress(progress: dict) -> None:
    PROGRESS_PATH.parent.mkdir(parents=True, exist_ok=True)
    PROGRESS_PATH.write_text(json.dumps(progress))


def collect_ids(node, found: set[str]) -> None:
    if isinstance(node, dict):
        products = node.get("products")
        if isinstance(products, list):
            for product in products:
                if product.get("id"):
                    found.add(str(product["id"]))
        for value in node.values():
            collect_ids(value, found)
    elif isinstance(node, list):
        for value in node:
            collect_ids(value, found)


def mercadona_ids() -> list[str]:
    catalog = get_json("https://tienda.mercadona.es/api/categories/?lang=es")
    found: set[str] = set()
    categories = [
        category
        for root in catalog.get("results") or []
        for category in root.get("categories") or []
    ]
    print(f"mercadona: {len(categories)} categorías", flush=True)
    for index, category in enumerate(categories, start=1):
        payload = get_json(f"https://tienda.mercadona.es/api/categories/{category['id']}/?lang=es")
        collect_ids(payload, found)
        if index % 20 == 0 or index == len(categories):
            print(f"  categorías {index}/{len(categories)} → {len(found)} productos", flush=True)
        time.sleep(0.05)
    return sorted(found)


def product_price(product_id: str) -> tuple[str, str, float | None]:
    payload = get_json(f"https://tienda.mercadona.es/api/products/{product_id}/?lang=es")
    code = "".join(ch for ch in str(payload.get("ean") or "") if ch.isdigit())
    raw = (payload.get("price_instructions") or {}).get("unit_price")
    try:
        price = round(float(raw), 2) if raw not in (None, "") else None
    except (TypeError, ValueError):
        price = None
    return product_id, code, price


def crawl_mercadona(progress: dict) -> None:
    if not progress["ids"]:
        progress["ids"] = mercadona_ids()
        save_progress(progress)
    done = set(progress["done"])
    pending = [product_id for product_id in progress["ids"] if product_id not in done]
    print(f"fichas pendientes {len(pending)} de {len(progress['ids'])}", flush=True)
    finished = 0
    for start in range(0, len(pending), 80):
        chunk = pending[start : start + 80]
        with ThreadPoolExecutor(max_workers=WORKERS) as pool:
            futures = [pool.submit(product_price, product_id) for product_id in chunk]
            for future in as_completed(futures):
                product_id, code, price = future.result()
                progress["done"].append(product_id)
                if code and price is not None and price > 0:
                    progress["prices"][code] = price
                finished += 1
        save_progress(progress)
        print(f"  fichas {finished}/{len(pending)}, con precio {len(progress['prices'])}", flush=True)


def apply_prices(prices: dict[str, float]) -> int:
    connection = sqlite3.connect(DB_PATH)
    try:
        updated = 0
        for code, price in prices.items():
            cursor = connection.execute(
                "UPDATE Food SET price=? WHERE barcode=?",
                (price, code),
            )
            updated += cursor.rowcount
        connection.commit()
        total = connection.execute("SELECT COUNT(*) FROM Food WHERE price IS NOT NULL").fetchone()[0]
        print(f"SQLite: {updated} precios escritos, {total} alimentos con precio")
        return updated
    finally:
        connection.close()


def refresh_exports(prices: dict[str, float]) -> None:
    if not CACHE_PATH.exists():
        return
    rows = json.loads(CACHE_PATH.read_text())
    for row in rows:
        price = prices.get(row.get("barcode") or "")
        if price is not None:
            row["price"] = price
    CACHE_PATH.write_text(json.dumps(rows, ensure_ascii=False))
    import importlib.util

    spec = importlib.util.spec_from_file_location("mercados", ROOT / "scripts" / "mercados.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    products = {row["barcode"]: row for row in rows}
    for row in products.values():
        row.setdefault("packageSize", "")
        row.setdefault("imageUrl", "")
        row.setdefault("price", None)
    module.write_sql(products)


def main() -> None:
    progress = load_progress()
    crawl_mercadona(progress)
    prices = {code: float(price) for code, price in progress["prices"].items()}
    apply_prices(prices)
    refresh_exports(prices)
    connection = sqlite3.connect(DB_PATH)
    try:
        rows = connection.execute(
            """
            SELECT name, barcode, price, packageSize
            FROM Food
            WHERE market LIKE '%mercadona%'
              AND lower(name) LIKE '%yogur%'
              AND (lower(name) LIKE '%bosque%' OR lower(name) LIKE '%fruta%')
            """
        ).fetchall()
    finally:
        connection.close()
    print("yogures mercadona con fruta o bosque:")
    for row in rows:
        print(" ", row)


if __name__ == "__main__":
    main()
