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
        c.check(
            "the fixtures really are unconfident",
            "0.41" in weak_page.inner_text("#resultsGrid .matchCard .matchScore"),
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
        tp.select_option("#complexityFilter", "5")
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
