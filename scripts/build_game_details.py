#!/usr/bin/env python3
import argparse
import csv
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path


DEFAULT_BGG_THING_URL = "https://api.geekdo.com/xmlapi2/thing"
DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/126.0 Safari/537.36 GameMatchAR/0.1"
)
DEFAULT_GAME_LIMIT = 5000
DEFAULT_MIN_USERS_RATED = 50
CSV_SUBDOMAIN_RANK_FIELDS = {
    "abstracts_rank": "abstract",
    "cgs_rank": "customizable",
    "childrensgames_rank": "children",
    "familygames_rank": "family",
    "partygames_rank": "party",
    "strategygames_rank": "strategy",
    "thematic_rank": "thematic",
    "wargames_rank": "war",
}
BGG_LINK_TYPES = {
    "boardgamecategory": "categories",
    "boardgamemechanic": "mechanics",
    "boardgamefamily": "families",
    "boardgamedesigner": "designers",
    "boardgameartist": "artists",
    "boardgamepublisher": "publishers",
}


def main():
    args = parse_args()
    project_root = args.project_root.resolve()
    visual_index_path = resolve_path(project_root, args.visual_index)
    csv_path = resolve_optional_path(project_root, args.csv)
    output_path = resolve_path(project_root, args.output)

    seeds = collect_game_seeds(
        ids_from=args.ids_from,
        visual_index_path=visual_index_path,
        csv_path=csv_path,
        min_users_rated=args.min_users_rated,
    )

    if args.limit:
        seeds = seeds[: args.limit]

    existing = load_existing(output_path)

    if args.skip_bgg:
        details_by_id = {
            str(seed["id"]): merge_existing_with_seed(existing.get(str(seed["id"])), seed)
            for seed in seeds
        }
        preserve_existing_details(details_by_id, existing, refresh=args.refresh)
        print(f"Source games: {len(seeds)}")
        print("Using BGG API: no (--skip-bgg)")
        print(f"Output: {output_path}")
        write_details(output_path, sort_details(details_by_id), pretty=args.pretty)
        print(f"Done. Wrote {len(details_by_id)} games.")
        return

    if args.refresh:
        details_by_id = {}
        pending = seeds
    else:
        details_by_id = {
            str(seed["id"]): merge_existing_with_seed(existing.get(str(seed["id"])), seed)
            for seed in seeds
            if str(seed["id"]) in existing
        }
        preserve_existing_details(details_by_id, existing, refresh=args.refresh)
        pending = [seed for seed in seeds if str(seed["id"]) not in details_by_id]

    print(f"Source games: {len(seeds)}")
    print(f"Already cached: {len(details_by_id)}")
    print(f"To fetch: {len(pending)}")
    print(f"Output: {output_path}")

    if not pending:
        write_details(output_path, sort_details(details_by_id), pretty=args.pretty)
        return

    fetched_count = 0

    for batch in chunked(pending, args.batch_size):
        batch_ids = [str(seed["id"]) for seed in batch]
        batch_seed_by_id = {str(seed["id"]): seed for seed in batch}

        try:
            items = fetch_bgg_items(
                batch_ids,
                api_url=args.api_url,
                retries=args.retries,
                retry_delay=args.retry_delay,
                user_agent=args.user_agent,
                token=args.token,
            )
        except BggUnauthorized as err:
            if not args.allow_fallback:
                raise SystemExit(
                    f"{err}\n"
                    "BGG returned 401 Unauthorized. Set BGG_TOKEN or pass --token, then rerun.\n"
                    "Use --allow-fallback only if you intentionally want placeholder records."
                )

            print(f"Skipped batch {','.join(batch_ids)}: {err}")
            items = {}
        except Exception as err:
            print(f"Skipped batch {','.join(batch_ids)}: {err}")
            items = {}

        for game_id in batch_ids:
            seed = batch_seed_by_id[game_id]
            item = items.get(game_id)

            if item is None:
                details = fallback_details(seed)
                print(f"[{len(details_by_id) + 1}/{len(seeds)}] Missing BGG data for {seed['name']}")
            else:
                details = details_from_item(item, seed)
                print(f"[{len(details_by_id) + 1}/{len(seeds)}] Saved {details['name']}")

            details_by_id[game_id] = details
            fetched_count += 1

        write_details(output_path, sort_details(details_by_id), pretty=args.pretty)

        if fetched_count < len(pending):
            time.sleep(args.delay)

    print(f"Done. Wrote {len(details_by_id)} games.")


def parse_args():
    parser = argparse.ArgumentParser(
        description=(
            "Build a static GameMatch game details database from BGG XML API data. "
            "The output is safe to ship with GitHub Pages."
        )
    )
    parser.add_argument(
        "--project-root",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help="Static GameMatch app root.",
    )
    parser.add_argument(
        "--visual-index",
        type=Path,
        default=Path("data/visual_index.json"),
        help="Visual index to read IDs from.",
    )
    parser.add_argument(
        "--csv",
        type=Path,
        default=Path("boardgames_ranks.csv"),
        help="Optional boardgames_ranks.csv path for rank/year/name seeds.",
    )
    parser.add_argument(
        "--ids-from",
        choices=["visual-index", "csv", "both"],
        default="csv",
        help="Which source decides the game IDs to fetch.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/game_details.json"),
        help="Output JSON path.",
    )
    parser.add_argument("--limit", type=int, default=DEFAULT_GAME_LIMIT, help="Fetch only the first N games.")
    parser.add_argument(
        "--min-users-rated",
        type=int,
        default=DEFAULT_MIN_USERS_RATED,
        help="When using CSV IDs, skip games with fewer ratings.",
    )
    parser.add_argument(
        "--skip-bgg",
        action="store_true",
        help="Do not call BGG; write CSV-backed records and preserve existing enriched records.",
    )
    parser.add_argument("--batch-size", type=int, default=20)
    parser.add_argument("--delay", type=float, default=2.0, help="Seconds between BGG requests.")
    parser.add_argument("--retries", type=int, default=6)
    parser.add_argument("--retry-delay", type=float, default=3.0)
    parser.add_argument("--refresh", action="store_true", help="Refetch games already in output.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON instead of writing compact output.")
    parser.add_argument("--api-url", default=DEFAULT_BGG_THING_URL)
    parser.add_argument(
        "--token",
        default=os.environ.get("BGG_TOKEN"),
        help="BGG bearer token. Defaults to BGG_TOKEN environment variable.",
    )
    parser.add_argument(
        "--allow-fallback",
        action="store_true",
        help="Write placeholder records for failed BGG requests.",
    )
    parser.add_argument("--user-agent", default=DEFAULT_USER_AGENT)
    return parser.parse_args()


def resolve_path(project_root, path):
    return path if path.is_absolute() else project_root / path


def resolve_optional_path(project_root, path):
    resolved = resolve_path(project_root, path)
    return resolved if resolved.exists() else None


def collect_game_seeds(ids_from, visual_index_path, csv_path, min_users_rated):
    csv_seeds = read_csv_seeds(csv_path, min_users_rated) if csv_path else {}
    visual_seeds = read_visual_index_seeds(visual_index_path) if visual_index_path.exists() else {}

    if ids_from == "csv":
        seeds = list(csv_seeds.values())
    elif ids_from == "both":
        merged = dict(csv_seeds)

        for game_id, seed in visual_seeds.items():
            merged[game_id] = {**seed, **merged.get(game_id, {})}

        seeds = list(merged.values())
    else:
        seeds = [
            {**seed, **csv_seeds.get(game_id, {})}
            for game_id, seed in visual_seeds.items()
        ]

    return sorted(seeds, key=seed_sort_key)


def read_visual_index_seeds(path):
    data = json.loads(path.read_text(encoding="utf-8"))
    refs = data.get("refs", []) if isinstance(data, dict) else data if isinstance(data, list) else []
    seeds = {}

    for ref in refs:
        game_id = clean_id(ref.get("id"))
        name = clean_text(ref.get("name"))

        if not game_id or not name:
            continue

        seeds.setdefault(game_id, {"id": int(game_id), "name": name})

    return seeds


def read_csv_seeds(path, min_users_rated):
    seeds = {}

    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)

        for row in reader:
            game_id = clean_id(row.get("id"))
            name = clean_text(row.get("name"))

            if not game_id or not name:
                continue

            users_rated = parse_int(row.get("usersrated"))

            if min_users_rated and (users_rated is None or users_rated < min_users_rated):
                continue

            seeds[game_id] = {
                "id": int(game_id),
                "name": name,
                "year_published": parse_int(row.get("yearpublished")),
                "rank": parse_rank(row.get("rank")),
                "users_rated": users_rated,
                "average_rating": parse_float(row.get("average")),
                "bayes_average": parse_float(row.get("bayesaverage")),
                "is_expansion": parse_bool_int(row.get("is_expansion")),
                "subdomain_ranks": parse_subdomain_ranks(row),
            }
            seeds[game_id]["game_type_tags"] = game_type_tags(seeds[game_id]["subdomain_ranks"])

    return seeds


def seed_sort_key(seed):
    rank = seed.get("rank")
    return (
        rank is None,
        rank if rank is not None else 10**12,
        seed["name"].casefold(),
        seed["id"],
    )


class BggUnauthorized(RuntimeError):
    pass


def fetch_bgg_items(ids, api_url, retries, retry_delay, user_agent, token=None):
    query = urllib.parse.urlencode({"id": ",".join(ids), "stats": "1"}, safe=",")
    url = f"{api_url}?{query}"
    headers = {"User-Agent": user_agent}

    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = urllib.request.Request(url, headers=headers)

    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                status = response.getcode()

                if status == 202:
                    print(f"BGG is preparing {','.join(ids)}; retry {attempt}/{retries}")
                    time.sleep(retry_delay)
                    continue

                if status == 401:
                    raise BggUnauthorized("BGG returned 401 Unauthorized.")

                body = response.read()
                return parse_bgg_response(body)
        except urllib.error.HTTPError as err:
            if err.code == 401:
                raise BggUnauthorized("BGG returned 401 Unauthorized.") from err

            if err.code == 202:
                print(f"BGG is preparing {','.join(ids)}; retry {attempt}/{retries}")
                time.sleep(retry_delay)
                continue

            raise

    raise RuntimeError(f"BGG did not return data after {retries} retries.")


def parse_bgg_response(body):
    root = ET.fromstring(body)
    items = {}

    for item in root.findall("item"):
        game_id = clean_id(item.get("id"))

        if not game_id:
            continue

        items[game_id] = item

    return items


def details_from_item(item, seed):
    game_id = int(item.get("id"))
    primary_name = find_primary_name(item) or seed["name"]
    links = link_values_by_type(item)
    year = xml_value_int(item, "yearpublished")
    min_players = xml_value_int(item, "minplayers")
    max_players = xml_value_int(item, "maxplayers")
    playing_time = xml_value_int(item, "playingtime")
    min_playtime = xml_value_int(item, "minplaytime")
    max_playtime = xml_value_int(item, "maxplaytime")
    min_age = xml_value_int(item, "minage")
    average_weight = find_average_weight(item)
    rank = find_boardgame_rank(item) or seed.get("rank")
    users_rated = rating_value_int(item, "usersrated") or seed.get("users_rated")
    average_rating = rating_value_float(item, "average") or seed.get("average_rating")
    bayes_average = rating_value_float(item, "bayesaverage") or seed.get("bayes_average")
    player_poll = find_suggested_player_counts(item)

    return clean_none_values(
        {
            "id": game_id,
            "name": primary_name,
            "alternate_names": find_alternate_names(item, primary_name),
            "year_published": year or seed.get("year_published"),
            "min_players": min_players,
            "max_players": max_players,
            "players": format_range(min_players, max_players),
            "playing_time": playing_time,
            "min_playtime": min_playtime,
            "max_playtime": max_playtime,
            "duration": format_duration(min_playtime, max_playtime, playing_time),
            "min_age": min_age,
            "average_weight": average_weight,
            "rank": rank,
            "subdomain_ranks": seed.get("subdomain_ranks"),
            "game_type_tags": seed.get("game_type_tags"),
            "categories": links.get("categories"),
            "mechanics": links.get("mechanics"),
            "families": links.get("families"),
            "designers": links.get("designers"),
            "artists": links.get("artists"),
            "publishers": links.get("publishers"),
            "best_player_counts": player_poll.get("best"),
            "recommended_player_counts": player_poll.get("recommended"),
            "not_recommended_player_counts": player_poll.get("not_recommended"),
            "language_dependence": find_language_dependence(item),
            "bgg_url": bgg_url(game_id, primary_name),
            "thumbnail_url": element_text(item, "thumbnail"),
            "image_url": element_text(item, "image"),
            "users_rated": users_rated,
            "average_rating": average_rating,
            "bayes_average": bayes_average,
            "is_expansion": seed.get("is_expansion"),
            "metadata_sources": ["boardgames_ranks", "bgg_xml"],
            "updated_at": now_iso(),
        }
    )


def fallback_details(seed):
    game_id = int(seed["id"])
    name = seed["name"]

    return clean_none_values(
        {
            "id": game_id,
            "name": name,
            "year_published": seed.get("year_published"),
            "min_players": None,
            "max_players": None,
            "players": None,
            "playing_time": None,
            "min_playtime": None,
            "max_playtime": None,
            "duration": None,
            "average_weight": None,
            "rank": seed.get("rank"),
            "subdomain_ranks": seed.get("subdomain_ranks"),
            "game_type_tags": seed.get("game_type_tags"),
            "bgg_url": bgg_url(game_id, name),
            "users_rated": seed.get("users_rated"),
            "average_rating": seed.get("average_rating"),
            "bayes_average": seed.get("bayes_average"),
            "is_expansion": seed.get("is_expansion"),
            "metadata_sources": ["boardgames_ranks"],
            "updated_at": now_iso(),
        }
    )


def merge_existing_with_seed(existing, seed):
    fallback = fallback_details(seed)

    if not existing:
        return fallback

    merged = {**fallback, **existing}
    sources = set(fallback.get("metadata_sources", []))
    sources.update(existing.get("metadata_sources", []))

    if "thumbnail_url" in existing or "image_url" in existing:
        sources.add("bgg_xml")

    merged["metadata_sources"] = sorted(sources)
    return clean_none_values(merged)


def preserve_existing_details(details_by_id, existing, refresh=False):
    if refresh:
        return

    for game_id, details in existing.items():
        details_by_id.setdefault(str(game_id), details)


def find_primary_name(item):
    for name in item.findall("name"):
        if name.get("type") == "primary":
            return clean_text(name.get("value"))

    name = item.find("name")
    return clean_text(name.get("value")) if name is not None else None


def find_alternate_names(item, primary_name):
    alternates = []
    seen = {primary_name.casefold()} if primary_name else set()

    for name in item.findall("name"):
        value = clean_text(name.get("value"))

        if not value:
            continue

        key = value.casefold()

        if key in seen:
            continue

        seen.add(key)

        if name.get("type") != "primary":
            alternates.append(value)

    return alternates


def link_values_by_type(item):
    links = {target: [] for target in BGG_LINK_TYPES.values()}

    for link in item.findall("link"):
        target = BGG_LINK_TYPES.get(link.get("type"))
        value = clean_text(link.get("value"))

        if target and value and value not in links[target]:
            links[target].append(value)

    return links


def find_average_weight(item):
    average_weight = item.find("./statistics/ratings/averageweight")
    return parse_float(average_weight.get("value")) if average_weight is not None else None


def rating_value_int(item, tag):
    element = item.find(f"./statistics/ratings/{tag}")
    return parse_int(element.get("value")) if element is not None else None


def rating_value_float(item, tag):
    element = item.find(f"./statistics/ratings/{tag}")
    return parse_float(element.get("value")) if element is not None else None


def find_boardgame_rank(item):
    for rank in item.findall("./statistics/ratings/ranks/rank"):
        if rank.get("name") == "boardgame":
            return parse_int(rank.get("value"))

    return None


def find_suggested_player_counts(item):
    poll = find_poll(item, "suggested_numplayers")
    results = {
        "best": [],
        "recommended": [],
        "not_recommended": [],
    }

    if poll is None:
        return results

    for count_results in poll.findall("results"):
        player_count = clean_text(count_results.get("numplayers"))

        if not player_count:
            continue

        votes = {
            clean_text(result.get("value")): parse_int(result.get("numvotes")) or 0
            for result in count_results.findall("result")
        }
        best_votes = votes.get("Best", 0)
        recommended_votes = votes.get("Recommended", 0)
        not_recommended_votes = votes.get("Not Recommended", 0)

        if best_votes > recommended_votes and best_votes > not_recommended_votes:
            results["best"].append(player_count)

        if best_votes + recommended_votes > not_recommended_votes:
            results["recommended"].append(player_count)
        elif not_recommended_votes > 0:
            results["not_recommended"].append(player_count)

    return results


def find_language_dependence(item):
    poll = find_poll(item, "language_dependence")

    if poll is None:
        return None

    result_nodes = poll.findall("./results/result")

    if not result_nodes:
        return None

    best = max(result_nodes, key=lambda result: parse_int(result.get("numvotes")) or 0)
    votes = parse_int(best.get("numvotes"))

    if not votes:
        return None

    return clean_none_values(
        {
            "level": parse_int(best.get("level")),
            "description": clean_text(best.get("value")),
            "votes": votes,
        }
    )


def find_poll(item, name):
    for poll in item.findall("poll"):
        if poll.get("name") == name:
            return poll

    return None


def xml_value_int(item, tag):
    element = item.find(tag)
    return parse_int(element.get("value")) if element is not None else None


def element_text(item, tag):
    element = item.find(tag)

    if element is None or element.text is None:
        return None

    return element.text.strip() or None


def parse_subdomain_ranks(row):
    ranks = {}

    for field, tag in CSV_SUBDOMAIN_RANK_FIELDS.items():
        rank = parse_rank(row.get(field))

        if rank:
            ranks[tag] = rank

    return ranks


def game_type_tags(subdomain_ranks):
    return sorted(subdomain_ranks)


def format_range(min_value, max_value):
    if min_value is None and max_value is None:
        return None

    if min_value == max_value or max_value is None:
        return str(min_value)

    if min_value is None:
        return str(max_value)

    return f"{min_value}-{max_value}"


def format_duration(min_playtime, max_playtime, playing_time):
    if min_playtime and max_playtime and min_playtime != max_playtime:
        return f"{min_playtime}-{max_playtime} min"

    value = playing_time or max_playtime or min_playtime
    return f"{value} min" if value else None


def bgg_url(game_id, name):
    slug = slugify(name)
    return f"https://boardgamegeek.com/boardgame/{game_id}/{slug}" if slug else f"https://boardgamegeek.com/boardgame/{game_id}"


def slugify(text):
    text = text.lower().replace("&", " and ")
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def clean_id(value):
    value = clean_text(value)

    if not value or not value.isdigit():
        return None

    return value


def clean_text(value):
    if value is None:
        return None

    value = str(value).strip()
    return value or None


def parse_int(value):
    value = clean_text(value)

    if not value or value.lower() in {"not ranked", "nan"}:
        return None

    try:
        return int(float(value))
    except ValueError:
        return None


def parse_float(value):
    value = clean_text(value)

    if not value or value.lower() in {"nan", "not ranked"}:
        return None

    try:
        return float(value)
    except ValueError:
        return None


def parse_bool_int(value):
    parsed = parse_int(value)

    if parsed is None:
        return None

    return bool(parsed)


def parse_rank(value):
    parsed = parse_int(value)

    return parsed if parsed and parsed > 0 else None


def clean_none_values(details):
    return {
        key: value
        for key, value in details.items()
        if value is not None and value != [] and value != {}
    }


def load_existing(path):
    if not path.exists():
        return {}

    data = json.loads(path.read_text(encoding="utf-8"))

    if not isinstance(data, dict):
        raise ValueError(f"Expected object in {path}")

    return data


def write_details(path, details, pretty=False):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_suffix(path.suffix + ".tmp")
    json_text = (
        json.dumps(details, ensure_ascii=False, indent=2)
        if pretty
        else json.dumps(details, ensure_ascii=False, separators=(",", ":"))
    )
    temp_path.write_text(
        json_text + "\n",
        encoding="utf-8",
    )
    temp_path.replace(path)


def sort_details(details_by_id):
    items = details_by_id.items()

    return {
        str(game_id): details
        for game_id, details in sorted(
            items,
            key=lambda item: (
                item[1].get("rank") is None,
                item[1].get("rank", 10**12),
                item[1].get("name", "").casefold(),
                int(item[0]),
            ),
        )
    }


def chunked(items, size):
    for index in range(0, len(items), size):
        yield items[index : index + size]


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


if __name__ == "__main__":
    main()
