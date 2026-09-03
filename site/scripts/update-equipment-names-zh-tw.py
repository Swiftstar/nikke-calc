#!/usr/bin/env python3
"""Generate official zh-TW cube and favorite-item display-name maps.

The application keeps Korean cube and favorite-item names as canonical keys.
This updater joins those existing records to the live BlablaLink zh-TW CDN by
stable IDs, then emits display labels only:

* cube IDs come from data/base_stat_tables/cube.json;
* favorite-item ownership comes from scraper/nikke_scraped.json, and the live
  item's icon resource ID identifies the owning canonical character.

Run from anywhere in the repository:

    python3 site/scripts/update-equipment-names-zh-tw.py
    python3 site/scripts/update-equipment-names-zh-tw.py --check
"""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
from pathlib import Path
import re
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[2]
CUBE_SOURCE = ROOT / "data" / "base_stat_tables" / "cube.json"
CHARACTER_SOURCE = ROOT / "scraper" / "nikke_scraped.json"
OUTPUT = ROOT / "site" / "src" / "i18n" / "equipment-names-zh-tw.ts"
LOCALE = "zh-tw"
WORKERS = 8
ICON_RESOURCE_ID = re.compile(r"c(\d+)_")

sys.path.insert(0, str(ROOT))
from scraper.cdn_path import url as cdn_url  # noqa: E402


def fetch_json(path: str) -> object:
    request = Request(cdn_url(path), headers={"User-Agent": "nikke-calc-name-map/1"})
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            with urlopen(request, timeout=20) as response:
                return json.load(response)
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
            last_error = error
            if attempt < 2:
                time.sleep(0.5 * (2**attempt))
    raise RuntimeError(f"failed to fetch {path}: {last_error}")


def localized_name(record: object, expected_id: int, path: str) -> str:
    if not isinstance(record, dict):
        raise ValueError(f"{path}: expected an object")
    if record.get("id") != expected_id:
        raise ValueError(
            f"{path}: requested id {expected_id}, received {record.get('id')!r}"
        )
    name = record.get("name_localkey")
    if not isinstance(name, str) or not name.strip():
        raise ValueError(f"{path}: missing name_localkey")
    return name.strip()


def load_cubes() -> list[tuple[str, int]]:
    raw = json.loads(CUBE_SOURCE.read_text(encoding="utf-8"))
    cubes: list[tuple[str, int]] = []
    for canonical_name, details in raw.items():
        if canonical_name.startswith("_") or canonical_name == "공통":
            continue
        cube_id = details.get("id")
        if not isinstance(cube_id, int):
            raise ValueError(f"{canonical_name}: missing integer cube id")
        cubes.append((canonical_name, cube_id))
    return cubes


def load_favorite_items() -> dict[int, str]:
    raw = json.loads(CHARACTER_SOURCE.read_text(encoding="utf-8"))
    favorites: dict[int, str] = {}
    for character_name, details in raw.items():
        favorite = details.get("애장품")
        if not favorite:
            continue
        resource_id = details.get("id")
        item_name = favorite.get("아이템명")
        if not isinstance(resource_id, int) or not isinstance(item_name, str) or not item_name:
            raise ValueError(f"{character_name}: invalid canonical favorite-item data")
        if resource_id in favorites:
            raise ValueError(f"duplicate character resource id: {resource_id}")
        favorites[resource_id] = item_name
    return favorites


def build_cube_mapping(cubes: list[tuple[str, int]]) -> dict[str, str]:
    live_map = fetch_json("/equip/cube_rare_map.json")
    if not isinstance(live_map, list):
        raise ValueError("cube_rare_map.json: expected a list")
    live_ids = {entry.get("id") for entry in live_map if isinstance(entry, dict)}
    missing_ids = [cube_id for _name, cube_id in cubes if cube_id not in live_ids]
    if missing_ids:
        raise ValueError(f"canonical cube IDs absent from live map: {missing_ids}")

    fetched: dict[str, str] = {}
    with ThreadPoolExecutor(max_workers=WORKERS) as executor:
        pending = {}
        for canonical_name, cube_id in cubes:
            path = f"/equip/{LOCALE}/cube_{cube_id}.json"
            pending[executor.submit(fetch_json, path)] = (canonical_name, cube_id, path)
        for future in as_completed(pending):
            canonical_name, cube_id, path = pending[future]
            fetched[canonical_name] = localized_name(future.result(), cube_id, path)
    return {name: fetched[name] for name, _cube_id in cubes}


def build_favorite_mapping(canonical: dict[int, str]) -> dict[str, str]:
    rare_map = fetch_json("/equip/favorite_rare_map.json")
    if not isinstance(rare_map, dict) or not isinstance(rare_map.get("SSR"), list):
        raise ValueError("favorite_rare_map.json: missing SSR id list")

    by_resource_id: dict[int, str] = {}
    with ThreadPoolExecutor(max_workers=WORKERS) as executor:
        pending = {}
        for favorite_id in rare_map["SSR"]:
            if not isinstance(favorite_id, int):
                raise ValueError(f"invalid favorite-item id: {favorite_id!r}")
            path = f"/equip/{LOCALE}/favorite_{favorite_id}.json"
            pending[executor.submit(fetch_json, path)] = (favorite_id, path)
        for future in as_completed(pending):
            favorite_id, path = pending[future]
            record = future.result()
            name = localized_name(record, favorite_id, path)
            assert isinstance(record, dict)
            icon = record.get("icon_resource_id")
            match = ICON_RESOURCE_ID.search(icon) if isinstance(icon, str) else None
            if not match:
                raise ValueError(f"{path}: cannot derive character resource id from {icon!r}")
            resource_id = int(match.group(1))
            if resource_id in by_resource_id:
                raise ValueError(f"duplicate favorite item for character resource id {resource_id}")
            by_resource_id[resource_id] = name

    missing = sorted(set(canonical) - set(by_resource_id))
    if missing:
        raise ValueError(f"canonical favorite items absent from live zh-TW records: {missing}")
    return {item_name: by_resource_id[resource_id] for resource_id, item_name in canonical.items()}


def render(cubes: dict[str, str], favorites: dict[str, str]) -> str:
    rows = [
        "// Generated by site/scripts/update-equipment-names-zh-tw.py.",
        "// Source: live BlablaLink CDN /equip/zh-tw/{cube,favorite}_{id}.json",
        "// Canonical keys/IDs: data/base_stat_tables/cube.json and scraper/nikke_scraped.json",
        "// Derived display names only; Korean keys remain the application's identifiers.",
        "",
        "export const cubeNamesZhTW: Readonly<Record<string, string>> = {",
    ]
    for canonical_name, display_name in cubes.items():
        rows.append(
            f"  {json.dumps(canonical_name, ensure_ascii=False)}: "
            f"{json.dumps(display_name, ensure_ascii=False)},"
        )
    rows.extend(["};", "", "export const favoriteItemNamesZhTW: Readonly<Record<string, string>> = {"])
    for canonical_name, display_name in favorites.items():
        rows.append(
            f"  {json.dumps(canonical_name, ensure_ascii=False)}: "
            f"{json.dumps(display_name, ensure_ascii=False)},"
        )
    rows.extend(["};", ""])
    return "\n".join(rows)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="fail if the committed mapping differs from the current CDN",
    )
    args = parser.parse_args()

    cubes = load_cubes()
    favorites = load_favorite_items()
    content = render(build_cube_mapping(cubes), build_favorite_mapping(favorites))
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != content:
            print(f"{OUTPUT.relative_to(ROOT)} is out of date", file=sys.stderr)
            return 1
        print(
            f"{OUTPUT.relative_to(ROOT)} is current "
            f"({len(cubes)} cube names, {len(favorites)} favorite-item names)"
        )
        return 0

    OUTPUT.write_text(content, encoding="utf-8")
    print(
        f"wrote {OUTPUT.relative_to(ROOT)} "
        f"({len(cubes)} cube names, {len(favorites)} favorite-item names)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
