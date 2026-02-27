# Vector Codenames

Single-player browser game using word embeddings.

## 1) Build the reduced embedding file

From the workspace root:

```powershell
.\scripts\filter_embeddings.ps1
```

Notes:
- The script reads directly from `glove.2024.wikigiga.50d.zip`.
- It also reads `word-frequency.zip` (`unigram_freq.csv`) and picks the most common words.
- By default it creates:
	- `web/data/glove.2024.wikigiga.50d.top14000.txt` (small)
	- `web/data/glove.2024.wikigiga.50d.top50000.txt` (medium)
- Output keeps frequency order and only writes words found in the embedding file.

## 2) Run the game in a local web server

From the workspace root, run one of these:

```powershell
# Option A (Python)
python -m http.server 8000

# Option B (Node)
npx serve .
```

Then open:
- `http://localhost:8000/web/` (Python)
- or the URL printed by `serve`

## 3) Play

1. Default dataset path is `data/glove.2024.wikigiga.50d.top14000.txt` (small).
2. The game auto-loads the default dataset on page open.
3. Use **Load big dataset (medium, 50k)** to switch and load `data/glove.2024.wikigiga.50d.top50000.txt`.
4. Enter a guess from autocomplete and submit.
5. By default the game starts with `n=1` and increments `n` each new round.
6. Open **Setup** to change dataset path, set manual `n`, or disable auto-increment.

Scoring:
- `Score: points / rounds`
- Distances are cosine distances (`1 - cosine similarity`).
- You gain **1 point for each "Your word"** that is nearer than the nearest "Enemy word".
- Results are shown directly on the board:
	- Green = well done
	- Red = not well done
