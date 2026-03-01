# Vector Codenames

Single-player browser game using word embeddings.

## Games

- Classic game (near your words, away from enemy words):
	- Online: [https://tomthe.github.io/vector_word_game/index.html](https://tomthe.github.io/vector_word_game/index.html)
	- Local: `web/index.html`
- Add-words game (vector equations with `+` and `-`):
	- Online: [https://tomthe.github.io/vector_word_game/add-words.html](https://tomthe.github.io/vector_word_game/add-words.html)
	- Local: `web/add-words.html`


## For players

Play online:
[https://tomthe.github.io/vector_word_game](https://tomthe.github.io/vector_word_game)

The game UI supports English and German (`Language` selector in setup).

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

This project uses:
- GloVe embeddings (English): https://nlp.stanford.edu/projects/glove/
- fastText Common Crawl embeddings (German): https://fasttext.cc/docs/en/crawl-vectors.html

If you want to reproduce this, download the source files from those pages.

## Development

### 1) Build reduced embedding files

From the workspace root:

```powershell
.\scripts\filter_embeddings.ps1
```

This generates dataset files in `web/data/` for any available source files (English and/or German), including:
- `glove.2024.wikigiga.50d.top14000.txt`
- `glove.2024.wikigiga.50d.top50000.txt`
- `cc.de.300.top14000.txt`
- `cc.de.300.top30000.txt`

German source defaults to `cc.de.300.vec.gz` in the repository root.

Useful options:

```powershell
# Build only German fastText subsets
.\scripts\filter_embeddings.ps1 -SkipEnglish

# Build only English GloVe subsets
.\scripts\filter_embeddings.ps1 -SkipGerman

# Custom German source path
.\scripts\filter_embeddings.ps1 -GermanVecGzPath "D:\downloads\cc.de.300.vec.gz" -SkipEnglish
```


### 2) GitHub Pages deployment

This repo includes a workflow at `.github/workflows/deploy-pages.yml` that deploys the `web/` folder on pushes to `main`.

## Further reading: GitHub + GloVe

GitHub repository:
[https://github.com/tomthe/vector_word_game](https://github.com/tomthe/vector_word_game)

What are GloVe embeddings?
- GloVe (Global Vectors for Word Representation) maps each word to a fixed-size numeric vector.
- GloVe is trained on very large text corpora by counting how often words co-occur with other words across many contexts.
- The training objective fits vectors so their dot products reflect global co-occurrence statistics (for example, ratios of how often words appear with shared context words).
- Because of this, words that appear in similar contexts get vectors that are close to each other in vector space.
- In this game, each guess is compared against "Your words" and "Enemy words" using cosine distance.
- A good guess is closer to your target words and farther away from enemy words.
- The reduced files in `web/data/` are trimmed subsets of the original vector sources, so loading stays fast in the browser.

Official GloVe project page:
[https://nlp.stanford.edu/projects/glove/](https://nlp.stanford.edu/projects/glove/)

Official fastText vectors page:
[https://fasttext.cc/docs/en/crawl-vectors.html](https://fasttext.cc/docs/en/crawl-vectors.html)
