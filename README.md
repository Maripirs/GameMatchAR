# GameMatch

Static GitHub Pages build of the GameMatch shelf scanner.

Current bundle:

- About 5,000 games with local metadata
- Long-tail game metadata lazy-loaded only when a match needs it
- YOLO board-game-box model

## What Works On GitHub Pages

- Webcam or uploaded-image scanning
- YOLO board-game-box detection in the browser
- Server-side visual matching through your GameMatch backend
- Local game metadata from `data/game_details.json`
- Lazy obscure metadata from the backend's `/catalog/details?tier=obscure`, or
  `data/game_details_obscure.json` if you build it locally (not in the repo --
  see below)
- Conditional player-count expansion support from `data/player_expansion_index.json`
- Player count, duration, and complexity filters
- CSV-backed rank, rating, expansion, and game-type tags for advanced filters
- Optional contributor mode when connected to a GameMatch backend
- YOLO, backend health, and game metadata begin loading as soon as the app opens

Uploaded images are decoded in the browser first. If that fails and a backend is reachable, the app asks `/decode-image` to convert the upload to JPEG before scanning.

## What Does Not Run Here

- Rebuilding embeddings
- FastAPI endpoints

Those still belong in the hosted or local backend project.

## Deploy

Put the contents of this folder at the root of a GitHub Pages branch or repo.

Required files:

- `index.html`
- `app.js`
- `style.css`
- `js/`
- `data/`
- `models/`
- `.nojekyll`
- `CNAME`

The app must be served over HTTPS for phone camera access. GitHub Pages does this automatically.

This build is configured for:

- Frontend: `https://gamematch.maripi.net`
- Backend API: `https://api.maripi.net`

In GitHub, set **Settings -> Pages -> Custom domain** to:

```text
gamematch.maripi.net
```

In DNS, point:

```text
gamematch.maripi.net CNAME YOUR_GITHUB_USERNAME.github.io
```

Point `api.maripi.net` to the FastAPI backend with Cloudflare Tunnel, Tailscale Funnel, a VPS proxy, or another HTTPS host.

## Match Feedback

Every recognized crop shows a lightweight `Yes` / `No` prompt. Those public votes are sent to `/recognition-feedback` with a lower ranking weight so repeated false positives can gradually push down troublesome reference images without letting one casual tap swing the matcher too hard.

## Contributor Mode

Contributor mode lets trusted users confirm or deny recognition results from the same scanner UI.

Backend requirements:

- Run the GameMatch FastAPI backend over HTTPS.
- Set `GAMEMATCH_CONTRIBUTOR_PASSWORD` before starting the backend.
- Enable CORS for the GitHub Pages origin.
- If the app is served separately from the backend, set `window.GAMEMATCH_API_BASE` to the backend origin before loading `app.js`.

In the app:

- Open the info menu.
- Enter the contributor password.
- Use `OK` or `X` on each recognized crop.
- After `X`, choose the correct game from suggestions or paste a BGG URL/ID to save that crop as a corrected reference.

Contributor confirmations are sent to `/recognition-feedback` with full weight and can save useful crops as user references. Denied matches are logged for review and ranking adjustment.

## Updating Recognition

When you collect better user references locally, rebuild the backend user-reference embeddings.

If you refresh the game metadata for the browser filters/details, replace:

- `data/game_details.json`
- `data/game_details_obscure.json` — **untracked.** 33.7 MB of single-line JSON
  that git cannot delta, so every refresh added a permanent blob to history.
  Build it locally and let the backend serve it; the catalog rebuild endpoint
  picks it up. With the backend unreachable, obscure matches simply lose their
  details and nothing else changes.

Player-count expansions that make a base game fit a larger player-count filter are tracked separately in `data/player_expansion_index.json`. Add conservative entries there when you know a specific expansion raises the supported player count; the app will label those results as fitting only with that expansion included.

The default metadata build targets the top 5,000 CSV-ranked games with at least 50 ratings, while preserving existing BGG-enriched records already in `data/game_details.json`:

```bash
python3 scripts/build_game_details.py --csv /Users/maripi/Desktop/GameMatch-web/boardgames_ranks.csv --skip-bgg
```

That fast build does not call BGG. To enrich records with BGG XML fields such as minimum age, categories, mechanics, families, designers, publishers, player-count polls, and language-dependence data, run without `--skip-bgg`:

```bash
python3 scripts/build_game_details.py --csv /Users/maripi/Desktop/GameMatch-web/boardgames_ranks.csv --allow-fallback
```

To build the optional long-tail catalog without making startup slower, generate a second file that excludes the core catalog. The app only fetches it when a confident match is missing from `data/game_details.json`:

```bash
python3 scripts/build_game_details.py \
  --csv /Users/maripi/Desktop/GameMatch-web/boardgames_ranks.csv \
  --output data/game_details_obscure.json \
  --limit 0 \
  --skip-bgg \
  --exclude-details data/game_details.json
```

The long-tail file is CSV-backed unless you explicitly enrich it later, so some obscure games may show rank/rating/year but not player count, duration, or weight yet.
