# Vector Codenames

Single-player browser game using word embeddings.

## For players

- Play online (after GitHub Pages is enabled):
  - `https://<your-github-username>.github.io/2026-02-26-vectorCodenames/`

How to play:
1. The game loads a small dataset by default (`top14000`).
2. Optionally click **Load big dataset (medium, 50k)**.
3. Enter a guess from autocomplete and submit.
4. You score points when your guess is nearer to your words than to enemy words.

Scoring:
- `Score: points / rounds`
- Distances are cosine distances (`1 - cosine similarity`).
- You gain **1 point for each "Your word"** that is nearer than the nearest enemy word.

## Development

### 1) Build reduced embedding files

From the workspace root:

```powershell
.\scripts\filter_embeddings.ps1
```

This generates dataset files in `web/data/`, including:
- `glove.2024.wikigiga.50d.top14000.txt`
- `glove.2024.wikigiga.50d.top50000.txt`

### 2) Run locally

From the workspace root, run one of these:

```powershell
# Option A (Python)
python -m http.server 8000

# Option B (Node)
npx serve .
```

Open:
- `http://localhost:8000/web/` (Python)
- or the URL printed by `serve`

### 3) GitHub Pages deployment

This repo includes a workflow at `.github/workflows/deploy-pages.yml` that deploys the `web/` folder on pushes to `main`.

One-time GitHub setup:
1. Create a GitHub repository and push this project.
2. In GitHub: **Settings → Pages → Source = GitHub Actions**.
3. Ensure the workflow has permission to deploy pages (default for personal repos is usually enough).
4. Push to `main`; the Pages site will be published from the workflow.
