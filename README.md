# Vector Codenames

Single-player browser game using word embeddings.

## 1) Build the reduced embedding file

From the workspace root:

```powershell
.\scripts\filter_embeddings.ps1 -TopN 20000 -OutputPath "web/data/glove.2024.wikigiga.50d.top20000.txt"
```

Notes:
- The script reads directly from `glove.2024.wikigiga.50d.zip`.
- It also reads `word-frequency.zip` (`unigram_freq.csv`) and picks the first `TopN` most common words.
- Output keeps that frequency order and only writes words found in the embedding file.

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

1. Keep dataset path as `data/glove.2024.wikigiga.50d.top20000.txt`.
2. The game auto-loads the default dataset on page open.
3. Enter a guess from autocomplete and submit.
4. By default the game starts with `n=1` and increments `n` each new round.
5. Open **Setup** to change dataset path, set manual `n`, or disable auto-increment.

Scoring:
- `Score: points / rounds`
- Distances are cosine distances (`1 - cosine similarity`).
- You gain **1 point for each "Your word"** that is nearer than the nearest "Enemy word".
- Results are shown directly on the board:
	- Green = well done
	- Red = not well done
