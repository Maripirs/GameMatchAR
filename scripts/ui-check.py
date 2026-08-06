#!/usr/bin/env python3
"""Regression checks for the scan UI.

Every invariant here is one that has actually broken during development, and
each was found by hand. Checking them takes seconds; finding them again does
not.

Self-contained: it serves the repo statically and runs against ?mock=1, so it
needs no backend and no network. Match results are fixtures, which makes the
run deterministic -- the point is layout and interaction, not recognition.

    python3 -m pip install playwright && python3 -m playwright install chromium
    python3 scripts/ui-check.py
    python3 scripts/ui-check.py --headed     # watch it
"""

import argparse
import contextlib
import http.server
import socket
import socketserver
import sys
import threading
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
VIEWPORT = {"width": 390, "height": 844}


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
    for _ in range(40):
        page.wait_for_timeout(400)
        ready = page.eval_on_selector_all("#resultsGrid .matchCard", "e => e.length")
        status = page.inner_text("#status")
        if ready and not status.startswith("Matching "):
            return
    raise AssertionError("scan never completed")


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

        page.goto(f"{base}/?mock=1", wait_until="networkidle", timeout=60000)
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
        c.check(
            "mock matches are pre-confirmed",
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
        page.eval_on_selector("#resultsGrid .matchCard .cardExpandButton", "e => e.click()")
        page.wait_for_timeout(500)
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
        page.eval_on_selector(".matchCard.isExpanded .cardExpandButton", "e => e.click()")
        page.wait_for_timeout(400)

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
            "top status stays terse",
            len(page.inner_text("#status")) <= 32,
            f'(status "{page.inner_text("#status")}")',
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
