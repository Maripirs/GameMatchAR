#!/usr/bin/env python3
"""Computed-style snapshot, for proving a CSS refactor changed nothing.

`ui-check.py` asserts behaviour. It would not notice a margin moving 2px or a
colour shifting a shade, which is exactly what goes wrong when rules are merged
or moved: the cascade decides a property somewhere else than it used to.

This walks the app through the states that matter, records the full computed
style of every element, and diffs two runs. It is a safety net, not a test
suite -- there is nothing to assert, only "the same as before".

    python3 scripts/style-snapshot.py --save before
    ...refactor...
    python3 scripts/style-snapshot.py --save after
    python3 scripts/style-snapshot.py --diff before after

Reuses ui-check.py's stub backend and static server, so it needs no network.
"""

import argparse
import importlib.util
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SNAP_DIR = REPO / ".style-snapshots"

_spec = importlib.util.spec_from_file_location("uicheck", Path(__file__).parent / "ui-check.py")
uicheck = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(uicheck)

# Properties worth comparing. The full computed style is ~340 properties per
# element, most of them inherited defaults that no refactor can touch; this is
# everything the stylesheet actually sets, plus the geometry it produces.
PROPERTIES = [
    "display", "position", "top", "right", "bottom", "left", "width", "height",
    "min-width", "min-height", "max-width", "max-height",
    "margin-top", "margin-right", "margin-bottom", "margin-left",
    "padding-top", "padding-right", "padding-bottom", "padding-left",
    "color", "background-color", "background-image", "opacity", "visibility",
    "border-top-width", "border-right-width", "border-bottom-width",
    "border-left-width", "border-top-color", "border-left-color",
    "border-top-left-radius", "border-bottom-right-radius", "border-style",
    "font-size", "font-weight", "font-family", "line-height", "letter-spacing",
    "text-align", "text-decoration-line", "text-overflow", "text-transform",
    "white-space", "overflow-x", "overflow-y", "z-index", "box-shadow",
    "flex-direction", "align-items", "justify-content", "gap", "flex-grow",
    "flex-shrink", "flex-basis", "grid-template-columns", "grid-template-rows",
    "transform", "transition-property", "cursor", "pointer-events", "content",
]

DUMP_JS = """(props) => {
  const out = {};
  const seen = new Map();
  document.querySelectorAll('*').forEach((el) => {
    // A stable key per element: tag + id + classes + its index among siblings
    // that share them. Nothing here depends on document order changing.
    const base = el.tagName.toLowerCase()
      + (el.id ? '#' + el.id : '')
      + (typeof el.className === 'string' && el.className
          ? '.' + el.className.trim().split(/\\s+/).sort().join('.')
          : '');
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    const key = base + '[' + n + ']';
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    // Elements inside a `hidden` subtree paint nothing, so their computed
    // styles are noise -- and there are hundreds of them, because the
    // contributor panels sit in the DOM of every page. Recording whether an
    // element renders lets the diff ignore the ones that cannot be seen.
    const rendered = !!(el.offsetParent || r.width || r.height);
    const rec = {'__rendered': rendered};
    if (rendered) {
      for (const p of props) rec[p] = cs.getPropertyValue(p);
      rec['__rect'] = [Math.round(r.x), Math.round(r.y),
                       Math.round(r.width), Math.round(r.height)].join(',');
    }
    out[key] = rec;
  });
  return out;
}"""


def capture(page, label, store):
    store[label] = page.evaluate(DUMP_JS, PROPERTIES)


def snapshot(name):
    from playwright.sync_api import sync_playwright

    store = {}
    with uicheck.static_server() as base, sync_playwright() as pw:
        browser = pw.chromium.launch()

        for theme in ("light", "dark"):
            for width, tag in ((390, "phone"), (1280, "laptop")):
                context = browser.new_context(
                    viewport={"width": width, "height": 900}, has_touch=True
                )
                page = context.new_page()
                uicheck.stub_backend(page)
                page.add_init_script(
                    "try { localStorage.removeItem('gamematchForceContributor');"
                    " localStorage.setItem('gamematch-theme-preference', '%s'); }"
                    " catch (e) {}" % theme
                )
                page.goto(f"{base}/", wait_until="networkidle", timeout=60000)
                page.wait_for_timeout(600)
                capture(page, f"{tag}/{theme}/landing", store)

                uicheck.scan(page)
                page.wait_for_timeout(400)
                capture(page, f"{tag}/{theme}/results", store)

                # Expanded card: a whole second layout for the same element.
                page.eval_on_selector("#resultsGrid .cardExpandButton", "e => e.click()")
                page.wait_for_timeout(400)
                capture(page, f"{tag}/{theme}/expanded", store)
                page.eval_on_selector("#resultsGrid .cardExpandButton", "e => e.click()")
                page.wait_for_timeout(300)

                # Advanced filters, including the folded-away long tail.
                page.eval_on_selector("#advancedFilterToggle", "e => e.click()")
                page.wait_for_timeout(300)
                uicheck.open_more_filters(page)
                capture(page, f"{tag}/{theme}/advanced", store)

                # Manual box mode, which restyles the whole stage.
                page.eval_on_selector("#missingBoxesButton", "e => e.click()")
                page.wait_for_timeout(400)
                capture(page, f"{tag}/{theme}/manual", store)
                context.close()

        # Contributor mode: the states a player never reaches.
        context = browser.new_context(viewport={"width": 390, "height": 900},
                                      has_touch=True)
        page = context.new_page()
        uicheck.stub_backend(page)
        uicheck.stub_weak_matches(page)
        page.goto(f"{base}/", wait_until="domcontentloaded", timeout=60000)
        page.evaluate("() => localStorage.setItem('gamematchForceContributor', '1')")
        page.goto(f"{base}/", wait_until="networkidle", timeout=60000)
        # contributor.css is fetched on demand, so a capture taken too early
        # records the contributor UI unstyled and every later diff is garbage.
        if (REPO / "contributor.css").exists():
            page.wait_for_function(
                "() => [...document.styleSheets].some(s =>"
                " (s.href || '').includes('contributor.css'))",
                timeout=15000,
            )
        page.wait_for_timeout(1200)
        capture(page, "phone/contributor/landing", store)
        uicheck.scan(page)
        page.wait_for_timeout(400)
        capture(page, "phone/contributor/results", store)
        page.eval_on_selector("#resultsGrid .cardExpandButton", "e => e.click()")
        page.wait_for_timeout(400)
        capture(page, "phone/contributor/expanded", store)
        # The correction form, which is the deepest contributor-only layout and
        # the one most likely to be decided by a rule that moved.
        page.eval_on_selector("#resultsGrid .feedbackDenyButton", "e => e.click()")
        page.wait_for_timeout(500)
        capture(page, "phone/contributor/correction", store)
        page.eval_on_selector("#resultsGrid .cardExpandButton", "e => e.click()")
        page.wait_for_timeout(300)
        # Manual box mode in contributor mode: where the DINO controls live.
        page.eval_on_selector("#missingBoxesButton", "e => e.click()")
        page.wait_for_timeout(400)
        capture(page, "phone/contributor/manual", store)
        context.close()
        browser.close()

    SNAP_DIR.mkdir(exist_ok=True)
    path = SNAP_DIR / f"{name}.json"
    path.write_text(json.dumps(store, indent=0, sort_keys=True))
    elements = sum(len(v) for v in store.values())
    print(f"saved {path.relative_to(REPO)}: {len(store)} states, {elements} elements, "
          f"{elements * len(PROPERTIES):,} property values")
    return 0


def diff(left, right):
    a = json.loads((SNAP_DIR / f"{left}.json").read_text())
    b = json.loads((SNAP_DIR / f"{right}.json").read_text())
    changes = []

    for state in sorted(set(a) | set(b)):
        ea, eb = a.get(state, {}), b.get(state, {})
        for key in sorted(set(ea) | set(eb)):
            if key not in ea:
                changes.append(f"{state}: element APPEARED {key}")
                continue
            if key not in eb:
                changes.append(f"{state}: element VANISHED {key}")
                continue
            # Both invisible: nothing to compare. One visible and the other
            # not is itself the finding.
            if not ea[key].get("__rendered") and not eb[key].get("__rendered"):
                continue
            for prop in sorted(set(ea[key]) | set(eb[key])):
                va, vb = ea[key].get(prop), eb[key].get(prop)
                if va != vb:
                    changes.append(f"{state}: {key}\n    {prop}: {va!r} -> {vb!r}")

    if not changes:
        print(f"identical: {left} and {right} agree on every property of every element")
        return 0

    print(f"{len(changes)} differences between {left} and {right}:\n")
    for line in changes[:60]:
        print(f"  {line}")
    if len(changes) > 60:
        print(f"\n  ...and {len(changes) - 60} more")
    return 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--save", metavar="NAME")
    parser.add_argument("--diff", nargs=2, metavar=("LEFT", "RIGHT"))
    args = parser.parse_args()

    if args.save:
        sys.exit(snapshot(args.save))
    if args.diff:
        sys.exit(diff(*args.diff))
    parser.error("need --save NAME or --diff LEFT RIGHT")
