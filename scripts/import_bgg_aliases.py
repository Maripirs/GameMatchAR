#!/usr/bin/env python3
"""Import BGG alternate game names into GameMatch's static alias database."""

import argparse
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path


DEFAULT_API_URL = "https://boardgamegeek.com/xmlapi2/thing"
DEFAULT_USER_AGENT = "GameMatch/1.0 (+https://github.com/Maripirs/GameMatchAR)"


def parse_args():
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, default=root / "data" / "games_index.json")
    parser.add_argument("--output", type=Path, default=root / "data" / "game_aliases.json")
    parser.add_argument(
        "--completed",
        type=Path,
        default=root / ".cache" / "bgg_aliases_completed.json",
        help="Local resume state; IDs here are not requested again unless --refresh is used.",
    )
    parser.add_argument("--token", default=os.environ.get("BGG_TOKEN", ""))
    parser.add_argument("--api-url", default=DEFAULT_API_URL)
    parser.add_argument("--batch-size", type=int, default=20)
    parser.add_argument("--delay", type=float, default=5.0)
    parser.add_argument("--retries", type=int, default=5)
    parser.add_argument("--limit", type=int, default=0, help="Maximum IDs this run; 0 means all.")
    parser.add_argument("--refresh", action="store_true")
    return parser.parse_args()


def read_json(path, fallback):
    if not path.exists():
        return fallback
    return json.loads(path.read_text(encoding="utf-8"))


def write_json_atomic(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary.replace(path)


def chunks(values, size):
    for index in range(0, len(values), size):
        yield values[index : index + size]


def fetch_items(ids, args):
    query = urllib.parse.urlencode({"id": ",".join(ids)})
    request = urllib.request.Request(
        f"{args.api_url}?{query}",
        headers={
            "User-Agent": DEFAULT_USER_AGENT,
            "Accept": "application/xml,text/xml",
            "Authorization": f"Bearer {args.token}",
        },
    )
    for attempt in range(args.retries):
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                return ET.fromstring(response.read())
        except urllib.error.HTTPError as error:
            if error.code == 401:
                raise SystemExit(
                    "BGG rejected the request. Set BGG_TOKEN to a valid BGG bearer token."
                ) from error
            if error.code not in {429, 500, 502, 503, 504} or attempt + 1 >= args.retries:
                raise
        except urllib.error.URLError:
            if attempt + 1 >= args.retries:
                raise
        time.sleep(max(args.delay, 2 ** attempt))
    raise RuntimeError("BGG request failed")


def aliases_from_item(item, canonical_name):
    seen = {canonical_name.casefold()}
    aliases = []
    for name in item.findall("./name"):
        if name.get("type") != "alternate":
            continue
        value = (name.get("value") or "").strip()
        folded = value.casefold()
        if value and folded not in seen:
            seen.add(folded)
            aliases.append(value)
    return sorted(aliases, key=str.casefold)


def main():
    args = parse_args()
    if not args.token.strip():
        raise SystemExit("Set BGG_TOKEN to your BGG bearer token before running this importer.")
    if not 1 <= args.batch_size <= 20:
        raise SystemExit("--batch-size must be between 1 and 20.")

    catalog = read_json(args.catalog, [])
    names_by_id = {
        str(game["id"]): str(game.get("name") or "").strip()
        for game in catalog
        if isinstance(game, dict) and game.get("id") and game.get("name")
    }
    aliases = read_json(args.output, {})
    completed = set() if args.refresh else set(read_json(args.completed, []))
    pending = [game_id for game_id in names_by_id if game_id not in completed]
    if args.limit > 0:
        pending = pending[: args.limit]

    print(f"Catalog: {len(names_by_id)} games")
    print(f"Already checked: {len(completed)}")
    print(f"Checking now: {len(pending)}")

    checked_this_run = 0
    for batch in chunks(pending, args.batch_size):
        root = fetch_items(batch, args)
        returned = set()
        for item in root.findall("./item"):
            game_id = str(item.get("id") or "")
            if game_id not in names_by_id:
                continue
            returned.add(game_id)
            found = aliases_from_item(item, names_by_id[game_id])
            existing = aliases.get(game_id, [])
            merged = sorted(
                {str(value).strip() for value in [*existing, *found] if str(value).strip()},
                key=str.casefold,
            )
            if merged:
                aliases[game_id] = merged
            else:
                aliases.pop(game_id, None)

        completed.update(returned)
        checked_this_run += len(returned)
        write_json_atomic(
            args.output,
            dict(sorted(aliases.items(), key=lambda entry: int(entry[0]))),
        )
        write_json_atomic(args.completed, sorted(completed, key=int))
        print(
            f"Checked {checked_this_run}/{len(pending)} this run; "
            f"{len(aliases)} games have aliases."
        )
        if checked_this_run < len(pending):
            time.sleep(args.delay)

    print(f"Done. Wrote {args.output}")


if __name__ == "__main__":
    main()
