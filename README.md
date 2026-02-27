# Vector Codenames

Single-player browser game using word embeddings.


## For players

- Play online (after GitHub Pages is enabled):
  - `https://tomthe.github.io/vector_word_game`

How to play:
1. You see two groups of words: Yours and "Enemy words"
2. Guess a word that is "nearer" to your words than to all the enemy words
3.Enter the guess (it has to be a common word) and use autocomplete
4. You score points when your guess is nearer to your words than to all enemy words.

Scoring:
- `Score: points / rounds`
- Distances are cosine distances (`1 - cosine similarity`).
- You gain **1 point for each "Your word"** that is nearer than the nearest enemy word.

## Embeddings

This project uses Glove embeddings from https://nlp.stanford.edu/projects/glove/

If you want to reproduce this, you have to download them from there.

## Development

### 1) Build reduced embedding files

From the workspace root:

```powershell
.\scripts\filter_embeddings.ps1
```

This generates dataset files in `web/data/`, including:
- `glove.2024.wikigiga.50d.top14000.txt`
- `glove.2024.wikigiga.50d.top50000.txt`


### 2) GitHub Pages deployment

This repo includes a workflow at `.github/workflows/deploy-pages.yml` that deploys the `web/` folder on pushes to `main`.
