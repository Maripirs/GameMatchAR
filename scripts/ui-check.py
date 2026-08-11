#!/usr/bin/env python3
"""Regression checks for the scan UI.

Every invariant here is one that has actually broken during development, and
each was found by hand. Checking them takes seconds; finding them again does
not.

Self-contained: it serves the repo statically and stubs /health and /match, so
it needs no backend and no network. Match results are fixtures defined below,
which keeps the run deterministic -- the point is layout and interaction.
run deterministic -- the point is layout and interaction, not recognition.

    python3 -m pip install playwright && python3 -m playwright install chromium
    python3 scripts/ui-check.py
    python3 scripts/ui-check.py --headed     # watch it
"""

import argparse
import contextlib
import itertools
import json
import http.server
import socket
import socketserver
import sys
import threading
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
VIEWPORT = {"width": 390, "height": 844}

# Fixtures live here rather than in the app, so the shipped bundle carries no
# test scaffolding and these checks stay deterministic and backend-free. Real
# BGG ids, so the catalog resolves details and filters behave as they would live.
FIXTURES = [
    {"id": 315631, "name": "Santorini: New York", "score": 0.94},
    {"id": 334065, "name": "Verdant", "score": 0.93},
    {"id": 201808, "name": "Clank!: A Deck-Building Adventure", "score": 0.92},
    {"id": 325698, "name": "Juicy Fruits", "score": 0.91},
    {"id": 340677, "name": "Bad Company", "score": 0.9},
]


def stub_backend(page):
    """Answer /health and /match locally, so no server is needed."""
    cycle = itertools.cycle(FIXTURES)

    page.route("**/health", lambda route: route.fulfill(
        status=200, content_type="application/json",
        body=json.dumps({"ok": True, "embeddings": len(FIXTURES)})))

    def match(route):
        entry = next(cycle)
        route.fulfill(status=200, content_type="application/json", body=json.dumps({
            "matches": [{**entry, "rank_score": entry["score"],
                         "source": "bgg_cover", "reference_image_path": ""}],
            "used_obscure": False, "paligemma_used": False,
        }))

    page.route("**/match", match)


def stub_weak_matches(page):
    """Re-answer /match with results too shaky to clear the confidence bar.

    A low score with a close runner-up is what isConfidentMatch() rejects. This
    used to be the case where a player saw nothing at all: the details were held
    back until they tapped Yes, and there is no Yes any more.
    """
    cycle = itertools.cycle(FIXTURES)

    def match(route):
        entry = {**next(cycle), "score": 0.41}
        runner = {**next(cycle), "score": 0.405}
        route.fulfill(status=200, content_type="application/json", body=json.dumps({
            "matches": [
                {**side, "rank_score": side["score"], "source": "bgg_cover",
                 "reference_image_path": ""}
                for side in (entry, runner)
            ],
            "used_obscure": False, "paligemma_used": False,
        }))

    page.route("**/match", match)


# Games stripped of player count, playing time and weight. Before the BGG
# backfill 89% of the catalog looked like this for real; now it is rare, but
# BGG still has gaps and the tile must not fill the empty slots with Rank and
# Type when it happens.
SPARSE = [
    {"id": 823, "name": "The Lord of the Rings", "score": 0.95},
    {"id": 8107, "name": "Risk: The Lord of the Rings Trilogy Edition", "score": 0.94},
]
TRIAGE_FIELDS = (
    "players", "min_players", "max_players",
    "duration", "playing_time", "min_playtime", "max_playtime",
    "average_weight",
)


def stub_sparse_matches(page):
    """Re-answer /match with games whose triage fields are missing."""
    details = json.loads((REPO / "data" / "game_details.json").read_text())
    sparse_ids = {str(entry["id"]) for entry in SPARSE}

    for game_id in sparse_ids:
        record = details.get(game_id)

        if record:
            for field in TRIAGE_FIELDS:
                record.pop(field, None)

    body = json.dumps(details)
    page.route("**/data/game_details.json", lambda route: route.fulfill(
        status=200, content_type="application/json", body=body))

    cycle = itertools.cycle(SPARSE)

    def match(route):
        entry = next(cycle)
        route.fulfill(status=200, content_type="application/json", body=json.dumps({
            "matches": [{**entry, "rank_score": entry["score"],
                         "source": "bgg_cover", "reference_image_path": ""}],
            "used_obscure": False, "paligemma_used": False,
        }))

    page.route("**/match", match)


# Fixed player-poll votes, so the tier checks below assert against known values
# rather than against whatever BGG currently reports.
PLAYER_POLL = {
    "Santorini: New York": {"best": ["4"], "recommended": ["3"], "not": ["2"]},
    "Bad Company": {"best": ["4"], "recommended": ["5", "6"], "not": ["1"]},
    "Verdant": {"best": ["2"], "recommended": ["3", "4"], "not": ["1"]},
}


POLL_FIELDS = (
    "best_player_counts",
    "recommended_player_counts",
    "not_recommended_player_counts",
)


def stub_player_poll(page):
    """Serve the catalog with player-poll votes on exactly three games.

    The votes are cleared from every other record first. The real catalog now
    carries the poll for ~97% of games, and seeding on top of that left these
    checks asserting against whatever BGG currently says -- which changes.
    """
    details = json.loads((REPO / "data" / "game_details.json").read_text())

    for record in details.values():
        seed = PLAYER_POLL.get(record.get("name"))

        if not seed:
            for field in POLL_FIELDS:
                record.pop(field, None)
            continue

        record["best_player_counts"] = seed["best"]
        record["recommended_player_counts"] = seed["recommended"]
        record["not_recommended_player_counts"] = seed["not"]

    body = json.dumps(details)
    page.route("**/data/game_details.json", lambda route: route.fulfill(
        status=200, content_type="application/json", body=body))


# Fixed values for the fields the advanced filters and the expanded card read,
# seeded onto the five fixtures for the same reason as the player poll above:
# asserting against whatever BGG currently says about a real game is how a
# check rots.
ADVANCED_FIELDS = {
    "Santorini: New York": {
        "categories": ["Abstract Strategy"], "mechanics": ["Grid Movement"],
        "suggested_player_age": 8, "language_dependence": {"level": 1},
    },
    "Verdant": {
        "categories": ["Card Game"], "mechanics": ["Tile Placement"],
        "suggested_player_age": 12, "language_dependence": {"level": 2},
    },
    "Clank!: A Deck-Building Adventure": {
        "categories": ["Adventure"], "mechanics": ["Deck, Bag, and Pool Building"],
        "suggested_player_age": 12, "language_dependence": {"level": 3},
    },
    "Juicy Fruits": {
        "categories": ["Card Game"], "mechanics": ["Tile Placement"],
        "suggested_player_age": 8, "language_dependence": {"level": 1},
    },
    "Bad Company": {
        "categories": ["Science Fiction"], "mechanics": ["Dice Rolling"],
        "suggested_player_age": 14, "language_dependence": {"level": 4},
    },
}


def stub_pending_match(page, answer=2):
    """Answer the first few crops and leave the rest hanging.

    Holds the page in the mid-scan state indefinitely, so what the count line
    says while the matcher is still working can be asserted without racing it.
    The real window is about 80 ms.
    """
    cycle = itertools.cycle(FIXTURES)
    answered = itertools.count()

    def match(route):
        if next(answered) >= answer:
            return                      # never fulfilled: the crop stays pending

        entry = next(cycle)
        route.fulfill(status=200, content_type="application/json", body=json.dumps({
            "matches": [{**entry, "rank_score": entry["score"],
                         "source": "bgg_cover", "reference_image_path": ""}],
            "used_obscure": False, "paligemma_used": False,
        }))

    page.route("**/match", match)


def stub_advanced_fields(page):
    """Serve the catalog with known themes, mechanics, ages and language levels."""
    details = json.loads((REPO / "data" / "game_details.json").read_text())

    for record in details.values():
        seed = ADVANCED_FIELDS.get(record.get("name"))

        if seed:
            record.update(seed)
            # The age check falls back to the publisher's box age, which would
            # otherwise decide the verdict for a fixture seeded above it.
            record.pop("min_age", None)

    body = json.dumps(details)
    page.route("**/data/game_details.json", lambda route: route.fulfill(
        status=200, content_type="application/json", body=body))


class Quiet(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(REPO), **kwargs)

    def log_message(self, *args):
        pass


@contextlib.contextmanager
def static_server():
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]

    httpd = socketserver.TCPServer(("127.0.0.1", port), Quiet)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{port}"
    finally:
        httpd.shutdown()


class Checks:
    def __init__(self):
        self.failures = []
        self.passed = 0

    def check(self, label, condition, detail=""):
        if condition:
            self.passed += 1
            print(f"  ok    {label}")
        else:
            self.failures.append(f"{label} {detail}".strip())
            print(f"  FAIL  {label} {detail}".rstrip())


def scan(page, example="game-bag"):
    page.eval_on_selector("#applyFiltersButton", "e => e.click()")
    page.wait_for_timeout(200)
    page.eval_on_selector(
        f'button[data-example-src="examples/{example}.jpg"]', "e => e.click()"
    )
    # No status line to watch any more: a card is done when it has stopped
    # saying it is waiting on the matcher.
    for _ in range(40):
        page.wait_for_timeout(400)
        pending = page.eval_on_selector_all(
            "#resultsGrid .matchCard .matchScore",
            "e => e.filter(x => x.textContent.trim() === 'Waiting').length",
        )
        ready = page.eval_on_selector_all("#resultsGrid .matchCard", "e => e.length")
        if ready and not pending:
            return
    raise AssertionError("scan never completed")


def open_more_filters(page):
    """Unfold the advanced panel's long-tail filters.

    Rating, rank, type and youngest-age sit behind a "More filters" disclosure,
    so a check that drives them has to open it first -- exactly as a player
    would. Idempotent, so callers need not track the state.
    """
    if page.eval_on_selector("#advancedExtraFilters", "e => e.hidden"):
        page.eval_on_selector("#advancedExtraToggle", "e => e.click()")
        page.wait_for_timeout(120)


def shown_display(page, selector):
    return page.eval_on_selector(selector, "e => getComputedStyle(e).display")


def rect(page, selector):
    return page.eval_on_selector(
        selector,
        """e => {const r = e.getBoundingClientRect();
                return {top: Math.round(r.top), bottom: Math.round(r.bottom),
                        left: Math.round(r.left), right: Math.round(r.right),
                        width: Math.round(r.width), height: Math.round(r.height)}}""",
    )


def run(headed):
    from playwright.sync_api import sync_playwright

    c = Checks()

    with static_server() as base, sync_playwright() as pw:
        browser = pw.chromium.launch(headless=not headed)
        context = browser.new_context(viewport=VIEWPORT, has_touch=True)
        page = context.new_page()

        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))

        stub_backend(page)
        page.goto(f"{base}/", wait_until="networkidle", timeout=60000)
        page.wait_for_timeout(1200)

        print("\nlanding")
        c.check("filter panel starts open", page.is_visible("#filterPanel"))
        # The filter panel is permanent now: no toggle, no Done, no collapsed
        # state -- so the controls are simply always reachable.
        c.check("filter controls always reachable", page.is_visible("#playersFilter"))
        c.check(
            "filter defaults are 2 / 30 / medium",
            [
                page.eval_on_selector("#playersFilter", "e => e.value"),
                page.eval_on_selector("#timeFilter", "e => e.value"),
                page.eval_on_selector("#complexityFilter", "e => e.value"),
            ]
            == ["2", "30", "3"],
        )

        scan(page)
        page.wait_for_timeout(400)

        print("\nafter a scan")
        photo, strip = rect(page, "#photoPreview"), rect(page, "#resultsPanel")
        c.check(
            "photo meets the strip with no gap",
            photo["bottom"] == strip["top"],
            f'(photo {photo["bottom"]} vs strip {strip["top"]})',
        )
        c.check(
            "strip is flush to the bottom edge",
            strip["bottom"] == VIEWPORT["height"] and strip["left"] == 0,
            f"({strip})",
        )
        c.check(
            "no tile overflows its bounds",
            page.evaluate(
                """() => Array.from(document.querySelectorAll('#resultsGrid .matchCard'))
                     .filter(x => x.scrollHeight > x.clientHeight + 2).length"""
            )
            == 0,
        )
        c.check(
            "strip opens at the first card",
            page.eval_on_selector("#resultsGrid", "e => e.scrollLeft") == 0,
        )
        # Grading a match is contributor work; a player is never asked.
        c.check(
            "no feedback buttons for a player",
            page.eval_on_selector(
                "#resultsGrid .matchCard .feedbackConfirmButton",
                "e => getComputedStyle(e).display",
            )
            == "none",
        )

        print("\nbox overlay")
        c.check(
            "photo and overlay canvas are the same box",
            rect(page, "#photoPreview") == rect(page, "#boxes"),
        )

        print("\nexpanding")
        before = rect(page, "#resultsGrid .matchCard")
        # Real pointer click: nothing may be covering See more either.
        page.locator("#resultsGrid .matchCard").first.locator(
            ".cardExpandButton"
        ).click(timeout=8000)
        page.wait_for_timeout(500)
        expanded_fields = page.eval_on_selector(
            ".matchCard.isExpanded .gameDetails",
            """e => Array.from(e.querySelectorAll('div'))
                     .filter(d => getComputedStyle(d).display !== 'none')
                     .map(d => d.dataset.field)""",
        )
        # The tile keeps three; expanded is where rank, rating, type and year live.
        c.check(
            "expanding shows more than the tile's three fields",
            len(expanded_fields) > 3,
            f"(showing {expanded_fields})",
        )
        after = rect(page, ".matchCard.isExpanded")
        # Anchored to the panel rather than to the tile, so the bottom edge sits
        # within the strip rather than exactly on the tile's own bottom.
        c.check("grows upward", after["top"] < before["top"], f'({before["top"]} -> {after["top"]})')
        c.check(
            "bottom stays inside the strip",
            strip["top"] <= after["bottom"] <= strip["bottom"],
            f'(card {after["bottom"]}, strip {strip["top"]}-{strip["bottom"]})',
        )
        c.check("stays within the viewport", after["top"] >= 0 and after["bottom"] <= VIEWPORT["height"])
        c.check("strip height unchanged", rect(page, "#resultsPanel")["height"] == strip["height"])
        c.check("photo height unchanged", rect(page, "#photoPreview")["height"] == photo["height"])
        c.check(
            "expanded card is opaque",
            page.eval_on_selector(".matchCard.isExpanded", "e => getComputedStyle(e).opacity") == "1",
        )
        # A real click, and it must reach the button rather than something laid
        # over it. Collapsing back to the strip is what the button does.
        page.locator(".matchCard.isExpanded .findGameButton").click(timeout=8000)
        page.wait_for_timeout(500)
        c.check(
            "Show in picture is tappable and points back at the photo",
            page.eval_on_selector_all(".matchCard.isExpanded", "e => e.length") == 0,
        )

        print("\nexpanding a later card")
        page.eval_on_selector("#resultsGrid", "e => e.scrollLeft = 400")
        page.wait_for_timeout(300)
        page.evaluate(
            "() => document.querySelectorAll('#resultsGrid .matchCard .cardExpandButton')[2].click()"
        )
        page.wait_for_timeout(500)
        later = rect(page, ".matchCard.isExpanded")
        c.check(
            "a later card is fully on screen",
            later["left"] >= 0 and later["right"] <= VIEWPORT["width"],
            f"({later})",
        )
        page.eval_on_selector(".matchCard.isExpanded .cardExpandButton", "e => e.click()")
        page.wait_for_timeout(400)

        print("\nfilters drive the overlay")
        page.eval_on_selector("#filterVisibilityButton", "e => e.click()")
        page.wait_for_timeout(200)
        page.fill("#playersFilter", "9")
        page.wait_for_timeout(600)
        # The count lives in the strip header now; the top bar carries identity
        # plus a short system state.
        c.check(
            "impossible filter reports no fits",
            "0 of" in page.inner_text("#resultCount"),
            f'(count "{page.inner_text("#resultCount")}")',
        )
        c.check(
            "top bar keeps the app name",
            page.inner_text("#topBar h1").strip() == "GameMatch",
        )
        c.check(
            "the status line is gone for good",
            page.eval_on_selector_all("#status", "e => e.length") == 0,
        )
        page.fill("#playersFilter", "2")
        page.wait_for_timeout(600)

        print("\nbox editing")
        page.eval_on_selector("#modifyBoxesButton", "e => e.click()")
        page.wait_for_timeout(600)
        c.check(
            "photo and overlay stay aligned while editing",
            rect(page, "#photoPreview") == rect(page, "#boxes"),
        )
        page.eval_on_selector("#finishModifyingButton", "e => e.click()")
        page.wait_for_timeout(600)
        c.check("strip returns after editing", page.is_visible("#resultsPanel"))
        c.check(
            "cards survive editing",
            page.eval_on_selector_all("#resultsGrid .matchCard", "e => e.length") > 0,
        )

        print("\nunconfident matches are still fully in play")
        # A fresh page rather than a rescan: the strip keeps the previous cards
        # until the new ones land, and reading through that raced.
        weak_page = context.new_page()
        weak_page.on("pageerror", lambda e: errors.append(str(e)))
        stub_backend(weak_page)
        # Registered second, so it wins: Playwright matches routes newest first.
        stub_weak_matches(weak_page)
        weak_page.route("**/recognition-feedback", lambda route: route.fulfill(
            status=200, content_type="application/json", body='{"ok": true}'))
        weak_page.goto(f"{base}/", wait_until="networkidle", timeout=60000)
        weak_page.wait_for_timeout(1200)
        scan(weak_page)
        weak_page.wait_for_timeout(800)
        # Used to assert the raw "0.41". A player is now told the certainty in
        # words -- 0.41 read as a score for the game rather than the matcher's
        # confidence about which game it is -- so the weakest band is what
        # proves the fixture is weak. The figures still exist for contributors;
        # the contributor section below checks that.
        c.check(
            "an unconfident match says so in words, not in a number",
            "Best guess" in weak_page.inner_text("#resultsGrid .matchCard .matchScore"),
            f'(score "{weak_page.inner_text("#resultsGrid .matchCard .matchScore")}")',
        )
        weak = weak_page.inner_text("#resultsGrid .matchCard")
        c.check(
            "details show without anyone confirming the match",
            "Players" in weak and "Time" in weak,
            f"(card text {weak!r})",
        )
        # The point of the change: a low score no longer parks a card in its own
        # "uncertain" rank, it is judged on the game's own numbers like the rest.
        c.check(
            "unconfident cards are ranked by the filters, not held back",
            # 0 fails a filter; 4/5/6 are the fitting tiers. Which tier a
            # given game lands on depends on its BGG votes, so this asserts the
            # split rather than exact values.
            all(
                fit == "0" or int(fit) >= 4
                for fit in weak_page.eval_on_selector_all(
                    "#resultsGrid .matchCard", "e => e.map(c => c.dataset.fit)"
                )
            ),
            f"""(ranks {weak_page.eval_on_selector_all(
                "#resultsGrid .matchCard", "e => e.map(c => c.dataset.fit)")})""",
        )
        c.check(
            "fits lead, in confidence order",
            weak_page.eval_on_selector_all(
                "#resultsGrid .matchCard",
                """e => {const s = e.map(c => Number(c.dataset.score));
                        return s.every((v, i) => !i || s[i - 1] >= v)}""",
            ),
        )

        print("\nwrong game?")
        c.check(
            "offered on the tile, not hidden behind See more",
            weak_page.eval_on_selector(
                "#resultsGrid .matchCard .cardReportWrongButton",
                "e => getComputedStyle(e).display",
            )
            != "none",
        )
        before_count = weak_page.inner_text("#resultCount")
        first = weak_page.eval_on_selector(
            "#resultsGrid .matchCard .matchName", "e => e.textContent"
        )
        # A real pointer click, not e.click(): a JS click skips hit-testing, so
        # it happily "taps" a control that something invisible is covering. An
        # oversized tap pad on See more did exactly that to this button.
        weak_page.locator("#resultsGrid .matchCard").first.locator(
            ".cardReportWrongButton"
        ).click(timeout=8000)
        weak_page.wait_for_timeout(900)
        last = weak_page.eval_on_selector_all(
            "#resultsGrid .matchCard",
            """e => {const c = e[e.length - 1];
                    return [c.querySelector('.matchName').textContent,
                            c.classList.contains('markedWrong'),
                            getComputedStyle(c).opacity]}""",
        )
        c.check("the card moves to the end of the strip", last[0] == first, f"(last {last})")
        c.check("it is greyed out rather than removed", last[1] and float(last[2]) < 1)
        c.check(
            "it stops counting as a match",
            weak_page.inner_text("#resultCount") != before_count,
            f'("{before_count}" -> "{weak_page.inner_text("#resultCount")}")',
        )
        c.check(
            "the offer is withdrawn once taken",
            weak_page.eval_on_selector(
                "#resultsGrid .matchCard:last-child .cardReportWrongButton",
                "e => getComputedStyle(e).display",
            )
            == "none",
        )

        print("\na game with no player, time or weight data")
        sparse_page = context.new_page()
        sparse_page.on("pageerror", lambda e: errors.append(str(e)))
        stub_backend(sparse_page)
        stub_sparse_matches(sparse_page)
        sparse_page.goto(f"{base}/", wait_until="networkidle", timeout=60000)
        sparse_page.wait_for_timeout(1200)
        scan(sparse_page)
        sparse_page.wait_for_timeout(800)
        shown = sparse_page.eval_on_selector(
            "#resultsGrid .matchCard .gameDetails",
            """e => Array.from(e.querySelectorAll('div'))
                     .filter(d => getComputedStyle(d).display !== 'none')
                     .map(d => d.dataset.field)""",
        )
        # The bug: dropping the empty rows slid Rank and Type up into the tile's
        # three slots, so a game with no player count showed its rank under the
        # heading the eye reads as players.
        c.check(
            "the tile keeps its own three fields",
            shown == ["players", "time", "weight"],
            f"(showing {shown})",
        )
        c.check(
            "rank and type never take a triage slot",
            "rank" not in shown and "type" not in shown,
            f"(showing {shown})",
        )
        c.check(
            "a missing value says so",
            "Not known" in sparse_page.inner_text("#resultsGrid .matchCard"),
            f'(card text {sparse_page.inner_text("#resultsGrid .matchCard")!r})',
        )
        # It must still fail the filters rather than quietly passing them.
        c.check(
            "a game with no data does not claim to fit",
            "0 of" in sparse_page.inner_text("#resultCount"),
            f'(count "{sparse_page.inner_text("#resultCount")}")',
        )

        print("\ncontributor view")
        con = context.new_page()
        con.on("pageerror", lambda e: errors.append(str(e)))
        stub_backend(con)
        # Unconfident, because that is where the contributor card used to say
        # "Game details hidden until the match is stronger" instead of the data.
        stub_weak_matches(con)
        con.route("**/recognition-feedback", lambda route: route.fulfill(
            status=200, content_type="application/json", body='{"ok": true}'))
        con.goto(f"{base}/", wait_until="domcontentloaded", timeout=60000)
        con.evaluate("() => localStorage.setItem('gamematchForceContributor', '1')")
        con.goto(f"{base}/", wait_until="networkidle", timeout=60000)
        con.wait_for_timeout(1500)
        c.check(
            "contributor mode is on",
            con.evaluate("() => document.body.classList.contains('contributorMode')"),
        )
        scan(con)
        con.wait_for_timeout(1000)
        tile = con.inner_text("#resultsGrid .matchCard")
        c.check(
            "the same basic data a player sees",
            all(f in tile for f in ("Players", "Time", "Weight")),
            f"(tile text {tile!r})",
        )
        c.check(
            "Yes/No, and small",
            con.eval_on_selector(
                "#resultsGrid .matchCard .feedbackActions",
                """e => Array.from(e.querySelectorAll('button')).map(
                         b => [b.textContent, Math.round(b.getBoundingClientRect().height)])""",
            )
            == [["Yes", 20], ["No", 20]],
        )
        c.check(
            "no Wrong game? -- No covers it",
            shown_display(con, "#resultsGrid .matchCard .cardReportWrongButton") == "none",
        )
        c.check(
            "match source waits for the detailed card",
            shown_display(con, "#resultsGrid .matchCard .matchDiagnostic") == "none",
        )
        c.check(
            "See more without having to answer first",
            shown_display(con, "#resultsGrid .matchCard .cardExpandButton") != "none",
        )
        c.check(
            "no contributor tile overflows",
            con.evaluate(
                """() => Array.from(document.querySelectorAll('#resultsGrid .matchCard'))
                     .filter(x => x.scrollHeight > x.clientHeight + 2).length"""
            )
            == 0,
        )
        # The other half of hiding DINO from players: a contributor must still
        # have it. Hiding it from everyone would look identical in the player
        # check below and quietly remove the annotation tool.
        con.eval_on_selector("#missingBoxesButton", "e => e.click()")
        con.wait_for_timeout(250)
        c.check(
            "a contributor still gets the DINO suggestion button",
            not con.eval_on_selector("#dinoSuggestButton", "e => e.hidden"),
        )
        con.eval_on_selector("#exitModifierButton", "e => e.click()")
        con.wait_for_timeout(200)

        print("\nYes")
        con.eval_on_selector("#resultsGrid .matchCard .feedbackConfirmButton", "e => e.click()")
        con.wait_for_timeout(150)  # short on purpose: no round trip may be waited on
        c.check(
            "both buttons go at once",
            con.eval_on_selector(
                "#resultsGrid .matchCard .feedbackActions",
                """e => Array.from(e.querySelectorAll('button'))
                         .every(b => getComputedStyle(b).display === 'none')""",
            ),
        )

        print("\nNo opens the correction flow")
        con.eval_on_selector_all(
            "#resultsGrid .matchCard .feedbackDenyButton",
            "e => e.find(b => getComputedStyle(b).display !== 'none').click()",
        )
        con.wait_for_timeout(900)
        c.check(
            "the card opens",
            con.eval_on_selector_all(".matchCard.isExpanded", "e => e.length") == 1,
        )
        c.check(
            "onto the correct-game form",
            shown_display(con, ".matchCard.isExpanded .correctionPanel") != "none",
        )
        c.check(
            "and the match source is there to check against",
            shown_display(con, ".matchCard.isExpanded .matchDiagnostic") != "none",
        )
        # A real pointer click, not fill(): "See less" carried an invisible
        # full-card tap pad that swallowed this and collapsed the card instead.
        con.click(".matchCard.isExpanded .correctionPanel input", timeout=8000)
        con.wait_for_timeout(300)
        c.check(
            "tapping the field does not close the card",
            con.eval_on_selector_all(".matchCard.isExpanded", "e => e.length") == 1
            and con.evaluate("() => document.activeElement?.tagName") == "INPUT",
        )
        con.fill(".matchCard.isExpanded .correctionPanel input", "Verdant")
        con.wait_for_timeout(900)
        c.check(
            "the game search still suggests",
            con.eval_on_selector_all(
                ".matchCard.isExpanded .correctionSuggestions > *", "e => e.length"
            )
            > 0,
        )
        c.check(
            "the whole workflow fits on screen",
            0 <= rect(con, ".matchCard.isExpanded")["top"]
            and rect(con, ".matchCard.isExpanded")["bottom"] <= VIEWPORT["height"],
            f'({rect(con, ".matchCard.isExpanded")})',
        )

        print("\nSkip sets the card aside")
        skipped = con.eval_on_selector(".matchCard.isExpanded .matchName", "e => e.textContent")
        con.eval_on_selector(".matchCard.isExpanded .correctionCancelButton", "e => e.click()")
        con.wait_for_timeout(900)
        end = con.eval_on_selector_all(
            "#resultsGrid .matchCard",
            """e => {const c = e[e.length - 1];
                    return [c.querySelector('.matchName').textContent,
                            c.classList.contains('markedWrong')]}""",
        )
        c.check("greyed and moved to the end", end == [skipped, True], f"(last {end})")
        c.check(
            "the correction form is gone",
            shown_display(con, "#resultsGrid .matchCard:last-child .correctionPanel") == "none",
        )

        print("\nplayer-count tiers")
        tp = context.new_page()
        tp.on("pageerror", lambda e: errors.append(str(e)))
        stub_backend(tp)
        stub_player_poll(tp)
        tp.goto(f"{base}/", wait_until="networkidle", timeout=60000)
        tp.wait_for_timeout(1200)
        tp.eval_on_selector("#advancedFilterToggle", "e => e.click()")
        tp.wait_for_timeout(300)
        c.check(
            "the best-at toggle is hidden before any poll data is on screen",
            shown_display(tp, "#bestPlayerCountField") == "none",
        )
        tp.fill("#playersFilter", "4")
        # Time and weight off, so only the player tier separates these cards.
        tp.select_option("#timeFilter", "")
        tp.select_option("#complexityFilter", "")
        scan(tp)
        tp.wait_for_timeout(1200)
        c.check(
            "and appears once a game carries votes",
            shown_display(tp, "#bestPlayerCountField") != "none",
        )

        def tiers():
            return tp.eval_on_selector_all(
                "#resultsGrid .matchCard",
                """e => e.map(c => [c.querySelector('.matchName').textContent,
                                    c.dataset.fit, c.dataset.playerTier])""",
            )

        ranked = tiers()
        by_name = {name: (fit, tier) for name, fit, tier in ranked}
        # Best outranks Recommended outranks a game that merely seats four.
        c.check(
            "best at 4 ranks above a game that merely seats four",
            by_name.get("Bad Company", ("", ""))[0] == "6"
            and by_name.get("Santorini: New York", ("", ""))[0] == "6"
            and by_name.get("Clank!: A Deck-Building Adventure", ("", ""))[0] == "4",
            f"({ranked})",
        )
        c.check(
            "the fits are ordered best-first",
            [fit for _, fit, _ in ranked] == sorted(
                (fit for _, fit, _ in ranked), key=lambda v: -int(v)
            ),
            f"({[f for _, f, _ in ranked]})",
        )
        c.check(
            "a game with no votes lands on the plain supported tier",
            by_name.get("Juicy Fruits", ("", "")) == ("4", "supported"),
            f"(Juicy Fruits {by_name.get('Juicy Fruits')})",
        )
        c.check(
            "the tier shows as a badge on the tile",
            "BEST AT 4" in tp.inner_text("#resultsGrid .matchCard").upper(),
            f'(tile {tp.inner_text("#resultsGrid .matchCard")!r})',
        )

        before = tp.inner_text("#resultCount")
        tp.check("#bestPlayerCountFilter")
        tp.wait_for_timeout(800)
        after_names = [n for n, fit, _ in tiers() if fit not in ("0", "-1", "-2")]
        c.check(
            "best-only keeps just the games voted best at 4",
            sorted(after_names) == ["Bad Company", "Santorini: New York"],
            f"(kept {sorted(after_names)}, count {before!r} -> {tp.inner_text('#resultCount')!r})",
        )

        # Voted down at a count still fits -- the group can play it tonight --
        # it just ranks below every other kind of fit. Verdant is Not
        # Recommended at 1, Bad Company is Not Recommended at 1 too.
        tp.uncheck("#bestPlayerCountFilter")
        tp.fill("#playersFilter", "1")
        tp.wait_for_timeout(800)
        at_one = {n: (fit, tier) for n, fit, tier in tiers()}
        c.check(
            "a poorly-voted count still fits, ranked last among the fits",
            at_one.get("Verdant") == ("3", "not_recommended"),
            f"(Verdant {at_one.get('Verdant')})",
        )
        c.check(
            "and it is not filtered out of the count",
            "0 of" not in tp.inner_text("#resultCount"),
            f'(count "{tp.inner_text("#resultCount")}")',
        )
        c.check(
            "it is badged as poor rather than left unmarked",
            "POOR AT 1" in tp.inner_text("#resultsGrid").upper(),
            f'(strip {tp.inner_text("#resultsGrid")!r})',
        )

        print("\nadvanced filters")
        ap = context.new_page()
        ap.on("pageerror", lambda e: errors.append(str(e)))
        stub_backend(ap)
        stub_advanced_fields(ap)
        ap.goto(f"{base}/", wait_until="networkidle", timeout=60000)
        ap.wait_for_timeout(1200)

        c.check(
            "complexity no longer offers two ways to say Any",
            ap.eval_on_selector_all(
                "#complexityFilter option", "e => e.map(o => o.value)"
            ) == ["", "2", "3", "4", "custom"],
        )

        ap.eval_on_selector("#advancedFilterToggle", "e => e.click()")
        ap.wait_for_timeout(200)
        # Only the dimension under test separates the cards.
        ap.fill("#playersFilter", "")
        ap.select_option("#timeFilter", "")
        ap.select_option("#complexityFilter", "")
        ap.wait_for_timeout(300)
        scan(ap)
        ap.wait_for_timeout(600)

        def fitting(page):
            return sorted(page.eval_on_selector_all(
                "#resultsGrid .matchCard",
                """e => e.filter(c => !['0', '-1', '-2'].includes(c.dataset.fit))
                         .map(c => c.querySelector('.matchName').textContent)""",
            ))

        def verdicts(page):
            # The tile hides this text -- the box on the photo carries the
            # verdict -- so read it rather than looking for it on screen. That
            # it is legible when the card is expanded is checked separately.
            return page.eval_on_selector_all(
                "#resultsGrid .matchCard .filterFit", "e => e.map(f => f.textContent)"
            )

        everything = fitting(ap)
        c.check(
            "all five fixtures fit with nothing set",
            len(everything) == 5,
            f"({everything})",
        )
        c.check("the theme button starts on Any",
                ap.inner_text("#categoryFilterButton") == "Any")
        c.check("the advanced toggle counts nothing yet",
                ap.inner_text("#advancedFilterToggle") == "Advanced")

        ap.click("#categoryFilterButton")
        ap.wait_for_timeout(300)
        c.check("the theme picker opens", ap.is_visible("#filterPickerSheet"))
        # With nothing selected the chips row is display:none and stops being a
        # child at all. A positional row template then handed the list the
        # unbounded track and collapsed the actions row, putting Done past the
        # bottom edge -- so check it while the row is absent.
        c.check(
            "Done is inside the sheet with no chips row",
            rect(ap, "#filterPickerDoneButton")["bottom"]
            <= rect(ap, "#filterPickerSheet")["bottom"],
            f'(done {rect(ap, "#filterPickerDoneButton")}, '
            f'sheet {rect(ap, "#filterPickerSheet")})',
        )
        # The values the games on screen carry lead the list: everything else in
        # the vocabulary can only ever remove cards.
        on_screen = ap.eval_on_selector_all(
            "#filterPickerList .filterPickerHeading:first-child ~ .filterPickerOption",
            "e => e.map(o => o.dataset.value)",
        )
        c.check(
            "the photo's own themes are grouped first",
            sorted(on_screen[:4]) == ["Abstract Strategy", "Adventure",
                                      "Card Game", "Science Fiction"],
            f"({on_screen[:6]})",
        )
        c.check(
            "and the rest of the vocabulary is offered below",
            ap.eval_on_selector_all("#filterPickerList .filterPickerOption", "e => e.length") > 50,
        )
        c.check(
            "options carry how many games in the catalog use them",
            ap.eval_on_selector(
                '.filterPickerOption[data-value="Card Game"] .filterPickerOptionCount',
                "e => Number(e.textContent) > 0",
            ),
        )

        ap.click('.filterPickerOption[data-value="Card Game"] input')
        ap.wait_for_timeout(500)
        c.check(
            "picking one theme keeps just the games that carry it",
            fitting(ap) == ["Juicy Fruits", "Verdant"],
            f"({fitting(ap)})",
        )
        c.check("the button names the single choice",
                ap.inner_text("#categoryFilterButton") == "Card Game")
        c.check("the advanced toggle counts it",
                ap.inner_text("#advancedFilterToggle") == "Advanced · 1",
                f'({ap.inner_text("#advancedFilterToggle")!r})')

        # Two selected values mean "either", not "both" -- the AND reading
        # empties the strip almost every time.
        ap.click('.filterPickerOption[data-value="Adventure"] input')
        ap.wait_for_timeout(500)
        c.check(
            "a second theme widens rather than narrows",
            fitting(ap) == ["Clank!: A Deck-Building Adventure", "Juicy Fruits", "Verdant"],
            f"({fitting(ap)})",
        )
        c.check("the button counts the choices",
                ap.inner_text("#categoryFilterButton") == "2 selected")
        c.check(
            "each choice gets a chip",
            ap.eval_on_selector_all("#filterPickerChips .filterPickerChip", "e => e.length") == 2,
        )
        c.check(
            "and Done is still inside the sheet with the chips row present",
            rect(ap, "#filterPickerDoneButton")["bottom"]
            <= rect(ap, "#filterPickerSheet")["bottom"],
            f'(done {rect(ap, "#filterPickerDoneButton")}, '
            f'sheet {rect(ap, "#filterPickerSheet")})',
        )

        ap.fill("#filterPickerSearch", "fantas")
        ap.wait_for_timeout(300)
        searched = ap.eval_on_selector_all(
            "#filterPickerList .filterPickerOption", "e => e.map(o => o.dataset.value)"
        )
        c.check(
            "search narrows the list",
            searched and all("fantas" in v.lower() for v in searched),
            f"({searched[:5]})",
        )
        ap.fill("#filterPickerSearch", "")
        ap.wait_for_timeout(300)

        # A chip removes its value: the list can be scrolled far from a
        # selection, and hunting the row down again to untick it is worse.
        ap.click("#filterPickerChips .filterPickerChip")
        ap.wait_for_timeout(500)
        # Chips are in selection order, so the first is Card Game -- removing it
        # leaves Adventure, and with it only Clank!.
        c.check(
            "a chip removes its value",
            ap.eval_on_selector_all("#filterPickerChips .filterPickerChip", "e => e.length") == 1
            and fitting(ap) == ["Clank!: A Deck-Building Adventure"],
            f"({fitting(ap)})",
        )
        c.check(
            "and the list checkbox follows it back off",
            ap.eval_on_selector_all(
                "#filterPickerList .filterPickerOption input:checked", "e => e.length"
            ) == 1,
        )

        ap.click("#filterPickerClearButton")
        ap.wait_for_timeout(500)
        c.check("clear puts every card back", len(fitting(ap)) == 5, f"({fitting(ap)})")
        c.check("and the button reads Any again",
                ap.inner_text("#categoryFilterButton") == "Any")

        ap.click("#filterPickerDoneButton")
        ap.wait_for_timeout(300)
        c.check("Done closes the picker", not ap.is_visible("#filterPickerSheet"))

        ap.click("#mechanicFilterButton")
        ap.wait_for_timeout(300)
        ap.click('.filterPickerOption[data-value="Tile Placement"] input')
        ap.click("#filterPickerDoneButton")
        ap.wait_for_timeout(500)
        c.check(
            "the mechanic picker filters on its own field",
            fitting(ap) == ["Juicy Fruits", "Verdant"],
            f"({fitting(ap)})",
        )
        ap.click("#mechanicFilterButton")
        ap.wait_for_timeout(300)
        ap.click("#filterPickerClearButton")
        ap.click("#filterPickerDoneButton")
        ap.wait_for_timeout(400)

        # Youngest player: caps the game's recommended age rather than setting a
        # floor. Reading it the other way round would keep the 14+ games.
        open_more_filters(ap)
        ap.select_option("#youngestAgeFilter", "8")
        ap.wait_for_timeout(500)
        c.check(
            "the youngest-player age keeps games rated at or below it",
            fitting(ap) == ["Juicy Fruits", "Santorini: New York"],
            f"({fitting(ap)})",
        )
        c.check(
            "a game over the age says so",
            "Ages 14+" in verdicts(ap),
            f"({verdicts(ap)})",
        )
        ap.select_option("#youngestAgeFilter", "")

        # A card that fails a filter has to be able to say which one: with this
        # many filters the greyed box on the photo no longer implies the reason.
        ap.select_option("#youngestAgeFilter", "8")
        ap.wait_for_timeout(500)
        ap.eval_on_selector(
            "#resultsGrid .matchCard[data-fit='0'] .cardExpandButton", "e => e.click()"
        )
        ap.wait_for_timeout(400)
        c.check(
            "a filtered-out card shows why once expanded",
            "Ages" in ap.inner_text("#resultsGrid .matchCard.isExpanded"),
            f"({ap.inner_text('#resultsGrid .matchCard.isExpanded')!r})",
        )
        ap.eval_on_selector(
            "#resultsGrid .matchCard.isExpanded .cardExpandButton", "e => e.click()"
        )
        ap.select_option("#youngestAgeFilter", "")
        ap.wait_for_timeout(400)
        c.check("the advanced toggle drops back to bare",
                ap.inner_text("#advancedFilterToggle") == "Advanced",
                f'({ap.inner_text("#advancedFilterToggle")!r})')

        # The fields the advanced filters read are on the expanded card, so a
        # verdict can be checked against what the game actually carries.
        ap.eval_on_selector("#resultsGrid .matchCard .cardExpandButton", "e => e.click()")
        ap.wait_for_timeout(400)
        expanded = ap.inner_text("#resultsGrid .matchCard.isExpanded")
        c.check(
            "the expanded card shows themes, mechanics, age and language",
            all(word in expanded for word in ("Themes", "Mechanics", "Age", "Language")),
            f"({expanded!r})",
        )

        print("\ntime and complexity ranges")
        rp = context.new_page()
        rp.on("pageerror", lambda e: errors.append(str(e)))
        stub_backend(rp)
        rp.goto(f"{base}/", wait_until="networkidle", timeout=60000)
        rp.wait_for_timeout(1200)
        rp.eval_on_selector("#advancedFilterToggle", "e => e.click()")
        rp.wait_for_timeout(300)

        def range_state(page):
            return page.evaluate("""() => ({
                time: document.getElementById('timeRangeLabel').textContent,
                weight: document.getElementById('weightRangeLabel').textContent,
                timeMax: document.getElementById('timeRangeMax').value,
                weightMax: document.getElementById('weightRangeMax').value,
                timePreset: document.getElementById('timeFilter').value,
                weightPreset: document.getElementById('complexityFilter').value,
            })""")

        def set_range(page, kind, which, index):
            page.eval_on_selector(
                f"#{kind}Range{which}",
                """(e, v) => { e.value = String(v);
                               e.dispatchEvent(new Event('input', {bubbles: true})); }""",
                index,
            )
            page.wait_for_timeout(250)

        # The select and the slider are two views of one range, so the sliders
        # must open on whatever the select already says -- not on a second copy
        # of the defaults that could drift from it. The wording differs on
        # purpose: the select names the cap ("Medium"), the label states the
        # number that cap is (3.0) with the band it admits in parentheses.
        start = range_state(rp)
        c.check(
            "the sliders start from the basic selects",
            start["time"] == "Up to 30 min" and start["weight"] == "Up to 3 (medium)",
            f"({start})",
        )

        rp.select_option("#timeFilter", "60")
        rp.wait_for_timeout(300)
        c.check(
            "choosing a preset moves the slider",
            range_state(rp)["time"] == "Up to 60 min",
            f"({range_state(rp)})",
        )

        # The ask that a single cap cannot express.
        set_range(rp, "time", "Min", 2)
        after = range_state(rp)
        c.check(
            "a lower bound reads as a range",
            after["time"] == "Between 30 and 60 min",
            f"({after})",
        )
        c.check(
            "and the select says Custom, since it cannot show a lower bound",
            after["timePreset"] == "custom",
            f"({after})",
        )
        c.check(
            "which the advanced toggle counts",
            rp.inner_text("#advancedFilterToggle") == "Advanced · 1",
            f'({rp.inner_text("#advancedFilterToggle")!r})',
        )

        # Choosing a preset drops the lower bound rather than keeping one the
        # basic panel has no way to show.
        rp.select_option("#timeFilter", "90")
        rp.wait_for_timeout(300)
        c.check(
            "a preset clears the lower bound it cannot display",
            range_state(rp)["time"] == "Up to 90 min",
            f"({range_state(rp)})",
        )

        # Whole-point bands could not separate the catalog: Santorini 1.9,
        # Juicy Fruits 2.0, Verdant 2.1 and Clank! 2.2 all sit inside one band,
        # so the slider moves in tenths and says the number.
        set_range(rp, "weight", "Max", 3)
        set_range(rp, "weight", "Min", 1)
        c.check(
            "an upper bound states the number and the band it admits",
            range_state(rp)["weight"] == "Up to 3 (medium)",
            f"({range_state(rp)})",
        )
        set_range(rp, "weight", "Min", 2)
        c.check(
            "a bounded range states both ends",
            range_state(rp)["weight"] == "2 to 3",
            f"({range_state(rp)})",
        )
        set_range(rp, "weight", "Max", 5)
        c.check(
            "a lower bound alone reads as open-ended",
            range_state(rp)["weight"] == "2 and up",
            f"({range_state(rp)})",
        )
        # The point of the change: a tenth is reachable, and 2.2 vs 2.0 is the
        # difference between Clank! and Juicy Fruits.
        set_range(rp, "weight", "Min", 1)
        set_range(rp, "weight", "Max", 2.1)
        c.check(
            "the slider resolves to a tenth of a point",
            range_state(rp)["weight"] == "Up to 2.1 (medium)",
            f"({range_state(rp)})",
        )

        # Thumbs may not cross or meet: a zero-width range excludes everything,
        # which no drag is ever asking for.
        set_range(rp, "weight", "Min", 5)
        c.check(
            "the thumbs cannot cross",
            rp.eval_on_selector("#weightRangeMin", "e => Number(e.value)")
            < rp.eval_on_selector("#weightRangeMax", "e => Number(e.value)"),
            f"({range_state(rp)})",
        )

        rp.select_option("#complexityFilter", "")
        rp.select_option("#timeFilter", "")
        rp.wait_for_timeout(300)
        c.check(
            "Any at both ends reads as no filter",
            range_state(rp) | {"time": "Any length", "weight": "Any complexity"}
            == range_state(rp),
            f"({range_state(rp)})",
        )

        # A range filters on the game's longest play, at both ends -- the rule
        # the max-only filter always used.
        rp.fill("#playersFilter", "")
        set_range(rp, "time", "Min", 3)
        scan(rp)
        rp.wait_for_timeout(600)
        kept = sorted(rp.eval_on_selector_all(
            "#resultsGrid .matchCard",
            """e => e.filter(c => !['0', '-1', '-2'].includes(c.dataset.fit))
                     .map(c => c.querySelector('.matchName').textContent)""",
        ))
        # Bad Company plays 30 min, Santorini 15-30: both are over before 45.
        c.check(
            "a lower time bound drops the games that end too soon",
            kept == ["Clank!: A Deck-Building Adventure", "Juicy Fruits", "Verdant"],
            f"({kept})",
        )
        c.check(
            "and says why",
            "Under 45 min" in rp.eval_on_selector_all(
                "#resultsGrid .matchCard .filterFit", "e => e.map(f => f.textContent)"
            ),
            f'({rp.eval_on_selector_all("#resultsGrid .matchCard .filterFit", "e => e.map(f => f.textContent)")})',
        )
        rp.close()

        print("\nwhile the matcher is still working")
        lp = context.new_page()
        lp.on("pageerror", lambda e: errors.append(str(e)))
        stub_backend(lp)
        stub_pending_match(lp)
        lp.goto(f"{base}/", wait_until="networkidle", timeout=60000)
        lp.wait_for_timeout(1200)
        lp.eval_on_selector("#applyFiltersButton", "e => e.click()")
        lp.eval_on_selector(
            'button[data-example-src="examples/game-bag.jpg"]', "e => e.click()"
        )

        # Every value the line takes from the moment the strip opens. A ratio
        # here would be a statement about the filters that is not true yet, and
        # a bare box count is a number sitting where the verdict goes.
        said = []
        for _ in range(40):
            lp.wait_for_timeout(150)
            text = lp.eval_on_selector("#resultCount", "e => e.textContent")
            if text and (not said or said[-1] != text):
                said.append(text)

        c.check(
            "the count line only says it is loading",
            said == ["Loading..."],
            f"({said})",
        )
        c.check(
            "some crops really were answered, so this is mid-scan not no-scan",
            lp.eval_on_selector_all(
                "#resultsGrid .matchCard",
                "e => e.filter(c => c.dataset.fit !== '-1').length",
            ) == 2,
        )
        # `Box 3` looked like an answer. Five cards naming themselves, each with
        # a live "Wrong game?" beside it, read as a scan that finished and
        # recognised nothing -- while the count line said it was still loading.
        c.check(
            "an unanswered card has no name yet",
            lp.eval_on_selector_all(
                "#resultsGrid .matchCard[data-pending='yes'] .matchName",
                "e => e.every(n => n.textContent.trim() === '')",
            ),
        )
        c.check(
            "and does not offer to report a match it has not made",
            lp.eval_on_selector_all(
                "#resultsGrid .matchCard[data-pending='yes'] .cardReportWrongButton",
                "e => e.every(b => getComputedStyle(b).display === 'none')",
            ),
        )
        lp.close()

        print("\nreadable and hittable")
        tp = context.new_page()
        tp.on("pageerror", lambda e: errors.append(str(e)))
        stub_backend(tp)
        # Pages share one browser context, so the contributor section above
        # leaves its password in localStorage and every later page logs itself
        # back in -- where "Wrong game?" is deliberately hidden. These are the
        # player's controls, so the page has to start as a player.
        tp.add_init_script(
            "try { localStorage.removeItem('gamematchForceContributor');"
            " localStorage.removeItem('gamematch-contributor-password'); } catch (e) {}"
        )
        tp.goto(f"{base}/", wait_until="networkidle", timeout=60000)
        tp.eval_on_selector("html", "e => { e.dataset.theme = 'light' }")
        scan(tp)
        c.check(
            "measuring the player's view, not the contributor's",
            not tp.evaluate("() => document.body.classList.contains('contributorMode')"),
        )

        # The light theme overrode every other accent but inherited the dark
        # theme's --danger, a pale salmon that lands at 1.94:1 on the light
        # panel -- on the one control a player uses to report a bad match.
        contrast = tp.evaluate(
            """() => {
              // color-mix() computes to `color(srgb 0.24 0.38 1 / 0.62)`, whose
              // channels are 0-1, not 0-255. Reading them as 0-255 makes every
              // mixed background look nearly black and invents failures.
              const parse = c => {
                const m = (c.match(/[-\\d.]+(?:e[-+]?\\d+)?/g) || []).map(Number);
                const [r, g, b, a = 1] = m;
                return /^color\\(/.test(c) ? [r*255, g*255, b*255, a] : [r, g, b, a];
              };
              const over = (f, b) => [0,1,2].map(i => f[i]*f[3] + b[i]*(1-f[3]));
              const lum = ([r,g,b]) => { const f = v => { v /= 255;
                  return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
                return 0.2126*f(r) + 0.7152*f(g) + 0.0722*f(b); };
              const bg = el => { const stack = []; let e = el;
                while (e) { const c = parse(getComputedStyle(e).backgroundColor);
                            if (c[3] > 0) stack.push(c); e = e.parentElement; }
                let base = [255, 255, 255];
                for (let i = stack.length - 1; i >= 0; i--) base = over(stack[i], base);
                return base; };
              const ratio = (fg, back) => { const [a, b] = [lum(fg), lum(back)];
                return (Math.max(a,b) + 0.05) / (Math.min(a,b) + 0.05); };
              // Every visible run of text, not one nominated control. Checking
              // only "Wrong game?" would have missed "See more" sitting at
              // 4.45:1 two rules further down the same file.
              const fails = []; const seen = new Set();
              document.querySelectorAll('*').forEach(el => {
                if (el.children.length) return;
                const text = (el.textContent || '').trim();
                if (!text || text.length > 40) return;
                const cs = getComputedStyle(el);
                const r = el.getBoundingClientRect();
                const size = parseFloat(cs.fontSize);
                if (r.width < 2 || r.height < 2) return;
                if (cs.visibility === 'hidden' || +cs.opacity === 0 || size < 1) return;
                const fg = parse(cs.color);
                if (fg[3] === 0) return;
                const large = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700);
                const back = bg(el.parentElement || el);
                const cr = ratio(over(fg, back), back);
                const need = large ? 3 : 4.5;
                const key = text + cs.color;
                if (cr < need && !seen.has(key)) {
                  seen.add(key);
                  fails.push(text.slice(0, 24) + ' ' + cr.toFixed(2) + ':1');
                }
              });
              return fails;
            }"""
        )
        c.check(
            "every visible label clears its contrast floor (light)",
            not contrast,
            f"({'; '.join(contrast[:4])})" if contrast else "",
        )

        # Measured by hit-testing rather than by box, since several of these
        # deliberately draw small and extend their hit area with a pseudo. The
        # BGG link is the cautionary one: it is masked, and a mask clips the
        # pseudo too, so its expander silently did nothing.
        targets = tp.evaluate(
            """() => {
              const owns = (el, t) => { let e = el;
                while (e) { if (e === t) return true; e = e.parentElement; } return false; };
              const span = t => { const r = t.getBoundingClientRect();
                const cx = r.left + r.width/2, cy = r.top + r.height/2;
                const probe = (dx, dy) => { for (let d = 0; d <= 60; d++) {
                    const el = document.elementFromPoint(cx + dx*d, cy + dy*d);
                    if (!el || !owns(el, t)) return d - 1; } return 60; };
                return [probe(-1,0) + probe(1,0) + 1, probe(0,-1) + probe(0,1) + 1]; };
              const out = {};
              for (const [name, sel] of [
                ['wrong', '.matchCard .cardReportWrongButton'],
                ['expand', '.matchCard .cardExpandButton'],
                ['bgg', '.matchCard .gameDetails > a'],
                ['missing', '#missingBoxesButton'],
              ]) {
                // The strip scrolls sideways, so the first match in the DOM is
                // not necessarily one whose centre is on screen to hit-test.
                const el = [...document.querySelectorAll(sel)].find(e => {
                  const r = e.getBoundingClientRect();
                  if (!r.width || !r.height) return false;
                  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
                  return cx >= 0 && cx <= innerWidth && cy >= 0 && cy <= innerHeight;
                });
                out[name] = el ? span(el) : null;
              }
              return out;
            }"""
        )
        for name in ("wrong", "expand", "bgg", "missing"):
            size = targets.get(name)
            c.check(
                f"{name} is big enough to hit",
                bool(size) and size[0] >= 24 and size[1] >= 24,
                f"({size[0]}x{size[1]})" if size else "(not on screen to measure)",
            )
        tp.close()

        print("\non a laptop-width viewport")
        wp = context.new_page()
        wp.on("pageerror", lambda e: errors.append(str(e)))
        wp.set_viewport_size({"width": 1200, "height": 900})
        stub_backend(wp)
        wp.goto(f"{base}/", wait_until="networkidle", timeout=60000)
        scan(wp)

        # A laptop gets the results as a right-hand column beside the photo
        # rather than a strip beneath it. Before that, a media query pinned the
        # strip top-right at phone width while the base rule still set
        # bottom: 0 and a fixed height, so it became a 390px box floating over
        # the photo with its cards clipped under the filter bar.
        panel = rect(wp, "#resultsPanel")
        card = rect(wp, "#resultsGrid .matchCard")
        photo = rect(wp, "#photoPreview")
        boxes = rect(wp, "#boxes")
        c.check(
            "results are a column down the right-hand side",
            panel["right"] == 1200 and panel["bottom"] == 900 and panel["width"] < 500,
            f"({panel})",
        )
        c.check(
            "and the photo takes the rest of the width, not overlapping it",
            photo["right"] <= panel["left"],
            f"(photo right {photo['right']}, panel left {panel['left']})",
        )
        # `width: auto` on a canvas resolves to its intrinsic pixel width, not
        # to the left/right constraints -- which put the overlay at 1058px over
        # an 888px photo and slid every box off the game it was outlining. The
        # two must agree exactly or the overlay is a lie.
        c.check(
            "the overlay canvas is exactly as wide as the photo it annotates",
            boxes["width"] == photo["width"],
            f"(boxes {boxes['width']}, photo {photo['width']})",
        )
        c.check(
            "cards fill the column rather than scrolling off the side",
            card["width"] > 300 and card["right"] <= panel["right"],
            f"(card {card})",
        )
        c.check(
            "no card is clipped by the chrome above it",
            card["top"] > panel["top"],
            f"(card {card['top']}, panel {panel['top']})",
        )
        wp.close()

        # A browser window on half a desktop screen. This sat between the phone
        # breakpoint and the two-column one, so it got the phone layout in a
        # landscape window: the bottom strip took 220px of height, the photo box
        # went wide and short, and a portrait photo letterboxed into it drew
        # 375px wide inside 785px -- 48% of its own area, with the fixed-size
        # canvas labels swamping what was left.
        hp = context.new_page()
        hp.on("pageerror", lambda e: errors.append(str(e)))
        hp.set_viewport_size({"width": 785, "height": 875})
        stub_backend(hp)
        hp.goto(f"{base}/", wait_until="networkidle", timeout=60000)
        scan(hp)
        fill = hp.evaluate(
            """() => {
              const box = document.querySelector('#photoPreview').getBoundingClientRect();
              const cv = document.querySelector('#photoPreview');
              const boxAR = box.width / box.height, imgAR = cv.width / cv.height;
              const w = boxAR > imgAR ? box.height * imgAR : box.width;
              const h = boxAR > imgAR ? box.height : box.width / imgAR;
              return Math.round((w * h) / (box.width * box.height) * 100);
            }"""
        )
        c.check(
            "a half-screen window does not starve the photo",
            fill >= 75,
            f"(photo fills {fill}% of its box; was 48% on the phone fallback)",
        )
        c.check(
            "and gets the two-column layout, not the bottom strip",
            rect(hp, "#resultsPanel")["bottom"] == 875
            and rect(hp, "#resultsPanel")["right"] == 785
            and rect(hp, "#resultsPanel")["width"] < 400,
            f"({rect(hp, '#resultsPanel')})",
        )
        hp.close()

        print("\nsaying it rather than shading it")
        sp = context.new_page()
        sp.on("pageerror", lambda e: errors.append(str(e)))
        stub_backend(sp)
        sp.add_init_script(
            "try { localStorage.removeItem('gamematchForceContributor');"
            " localStorage.removeItem('gamematch-contributor-password'); } catch (e) {}"
        )
        sp.goto(f"{base}/", wait_until="networkidle", timeout=60000)
        scan(sp)

        # Filtered-out used to be conveyed by opacity alone: nothing in the
        # accessibility tree, nothing at low vision, and never *which* filter it
        # missed. The reason was computed all along and hidden on the tile.
        c.check(
            "a filtered-out tile says why, without being expanded",
            sp.evaluate(
                """() => {
                  const card = document.querySelector('#resultsGrid .matchCard.rejected');
                  if (!card) return false;
                  const fit = card.querySelector('.filterFit');
                  return Boolean(fit) && getComputedStyle(fit).display !== 'none'
                    && fit.textContent.trim().length > 0;
                }"""
            ),
        )
        # A screen reader announced where a card was and never what it was.
        c.check(
            "a card is named by its game, not by its position",
            sp.evaluate(
                """() => {
                  const card = document.querySelector('#resultsGrid .matchCard');
                  const name = card.querySelector('.matchName').textContent.trim();
                  return name.length > 0
                    && (card.getAttribute('aria-label') || '').startsWith(name);
                }"""
            ),
            f"(aria {sp.eval_on_selector('#resultsGrid .matchCard', 'e => e.ariaLabel')!r})",
        )
        # A player cannot act on 0.982, and it reads as a score for the game.
        c.check(
            "certainty is worded, with no bare numbers left on the card",
            not sp.evaluate(
                """() => /Similarity|confidence \\d|0\\.\\d\\d/.test(
                     document.querySelector('#resultsGrid').innerText)"""
            ),
        )
        # A collapsed section must never quietly narrow the results.
        c.check(
            "the More filters fold announces how many are on",
            sp.evaluate(
                """() => {
                  const toggle = document.querySelector('#advancedExtraToggle');
                  if (!toggle) return false;
                  const before = toggle.textContent.trim();
                  document.querySelector('#minRatingFilter').value = '7';
                  document.querySelector('#minRatingFilter')
                    .dispatchEvent(new Event('change', {bubbles: true}));
                  return before === 'More filters'
                    && /\\b1 on\\b/.test(toggle.textContent);
                }"""
            ),
            f"(toggle {sp.eval_on_selector('#advancedExtraToggle', 'e => e.textContent.trim()')!r})",
        )
        # The help sheet is for players; a password field in it reads as
        # something the reader is supposed to have.
        c.check(
            "contributor sign-in is not shown to players",
            sp.eval_on_selector("#contributorArea", "e => e.hidden"),
        )
        # Grounding DINO is a transformer on the backend host, so M0 closed the
        # anonymous route -- but the button kept calling it and erroring. Manual
        # box drawing is the path that matters to a player and stays open.
        sp.eval_on_selector("#missingBoxesButton", "e => e.click()")
        sp.wait_for_timeout(250)
        c.check(
            "a player can still draw a box the scanner missed",
            sp.evaluate("() => document.body.classList.contains('manualBoxMode')"),
        )
        c.check(
            "but is not offered the DINO route that would 404 for them",
            sp.eval_on_selector("#dinoSuggestButton", "e => e.hidden")
            and sp.eval_on_selector("#dismissDinoSuggestButton", "e => e.hidden"),
            f"(suggest hidden {sp.eval_on_selector('#dinoSuggestButton', 'e => e.hidden')})",
        )
        sp.close()

        print("\nconsole")
        c.check("no page errors", not errors, f"({errors[:2]})")

        browser.close()

    print(f"\n{c.passed} passed, {len(c.failures)} failed")
    for line in c.failures:
        print(f"  - {line}")
    return 1 if c.failures else 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--headed", action="store_true", help="show the browser")
    sys.exit(run(parser.parse_args().headed))
