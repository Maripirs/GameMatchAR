# GameMatch AR

Static GitHub Pages build of the GameMatch shelf scanner.

Current bundle:

- 541 games with local metadata
- YOLO board-game-box model

## What Works On GitHub Pages

- Webcam or uploaded-image scanning
- YOLO board-game-box detection in the browser
- Server-side visual matching through your GameMatch backend
- Local game metadata from `data/game_details.json`
- Player count, duration, and complexity filters
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
- Backend API: `https://api.gamematch.maripi.net`

In GitHub, set **Settings -> Pages -> Custom domain** to:

```text
gamematch.maripi.net
```

In DNS, point:

```text
gamematch.maripi.net CNAME YOUR_GITHUB_USERNAME.github.io
```

Point `api.gamematch.maripi.net` to the FastAPI backend with Cloudflare Tunnel, Tailscale Funnel, a VPS proxy, or another HTTPS host.

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
