const state = {
  words: [],
  wordsByLower: new Map(),
  vectors: new Map(),
  vectorNorms: new Map(),
  leftWords: [],
  rightWords: [],
  rounds: 0,
  points: 0,
  loaded: false,
  pendingIncrement: false,
  history: [],
};

const SMALL_DATASET_PATH = "data/glove.2024.wikigiga.50d.top14000.txt";
const MEDIUM_DATASET_PATH = "data/glove.2024.wikigiga.50d.top50000.txt";

const datasetPathInput = document.getElementById("datasetPath");
const wordCountInput = document.getElementById("wordCount");
const autoIncrementInput = document.getElementById("autoIncrement");
const loadBtn = document.getElementById("loadBtn");
const loadMediumBtn = document.getElementById("loadMediumBtn");
const newRoundBtn = document.getElementById("newRoundBtn");
const submitBtn = document.getElementById("submitBtn");
const guessInput = document.getElementById("guessInput");
const statusEl = document.getElementById("status");
const leftWordsEl = document.getElementById("leftWords");
const rightWordsEl = document.getElementById("rightWords");
const scoreEl = document.getElementById("score");
const resultEl = document.getElementById("roundResult");
const nearestEnemyEl = document.getElementById("nearestEnemy");
const guessSuggestionsEl = document.getElementById("guessSuggestions");
const historyBodyEl = document.getElementById("historyBody");

const MAX_SUGGESTIONS = 12;
let currentSuggestions = [];
let highlightedSuggestionIndex = -1;
let hideSuggestionsTimer = null;

function updateScore() {
  scoreEl.textContent = `Score: ${state.points} / ${state.rounds}`;
}

function setStatus(message) {
  statusEl.textContent = message;
}

function clampWordCount() {
  const raw = Number(wordCountInput.value);
  const n = Number.isInteger(raw) && raw >= 1 ? raw : 1;
  const safeN = Math.min(n, 10);
  wordCountInput.value = String(safeN);
  return safeN;
}

function parseEmbeddingLine(line) {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 3) {
    return null;
  }

  const word = parts[0];
  const vector = new Float32Array(parts.length - 1);
  let sumSquares = 0;

  for (let i = 1; i < parts.length; i++) {
    const value = Number(parts[i]);
    if (!Number.isFinite(value)) {
      return null;
    }
    vector[i - 1] = value;
    sumSquares += value * value;
  }

  const norm = Math.sqrt(sumSquares);
  if (norm === 0) {
    return null;
  }

  return { word, vector, norm };
}

async function loadEmbeddings() {
  const datasetPath = datasetPathInput.value.trim();
  if (!datasetPath) {
    setStatus("Dataset path is empty.");
    return;
  }

  loadBtn.disabled = true;
  setStatus("Loading embeddings...");

  try {
    const response = await fetch(datasetPath);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    const lines = text.split(/\r?\n/);

    state.words = [];
    state.wordsByLower.clear();
    state.vectors.clear();
    state.vectorNorms.clear();

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      const parsed = parseEmbeddingLine(line);
      if (!parsed) {
        continue;
      }

      state.words.push(parsed.word);
      if (!state.wordsByLower.has(parsed.word.toLowerCase())) {
        state.wordsByLower.set(parsed.word.toLowerCase(), parsed.word);
      }
      state.vectors.set(parsed.word, parsed.vector);
      state.vectorNorms.set(parsed.word, parsed.norm);
    }

    if (state.words.length < 20) {
      throw new Error("Too few valid embeddings were loaded.");
    }

    state.loaded = true;
    newRoundBtn.disabled = false;
    guessInput.disabled = false;
    submitBtn.disabled = false;

    setStatus(`Loaded ${state.words.length} words.`);
    startRound();
  } catch (error) {
    setStatus(`Failed to load embeddings: ${error.message}`);
  } finally {
    loadBtn.disabled = false;
  }
}

function loadMediumEmbeddings() {
  datasetPathInput.value = MEDIUM_DATASET_PATH;
  return loadEmbeddings();
}

function hideSuggestions() {
  guessSuggestionsEl.classList.remove("is-visible");
  guessSuggestionsEl.innerHTML = "";
  currentSuggestions = [];
  highlightedSuggestionIndex = -1;
}

function getSuggestions(query) {
  const lower = query.trim().toLowerCase();
  if (!lower) {
    return state.words.slice(0, MAX_SUGGESTIONS);
  }

  const startsWith = [];
  const contains = [];

  for (const word of state.words) {
    const lowerWord = word.toLowerCase();

    if (lowerWord.startsWith(lower)) {
      startsWith.push(word);
    } else if (lowerWord.includes(lower)) {
      contains.push(word);
    }

    if (startsWith.length + contains.length >= MAX_SUGGESTIONS) {
      break;
    }
  }

  return [...startsWith, ...contains].slice(0, MAX_SUGGESTIONS);
}

function renderSuggestions(suggestions) {
  currentSuggestions = suggestions;
  highlightedSuggestionIndex = -1;
  guessSuggestionsEl.innerHTML = "";

  if (suggestions.length === 0) {
    hideSuggestions();
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const word of suggestions) {
    const li = document.createElement("li");
    li.className = "suggestion-item";
    li.setAttribute("role", "option");
    li.dataset.word = word;
    li.textContent = word;
    fragment.appendChild(li);
  }

  guessSuggestionsEl.appendChild(fragment);
  guessSuggestionsEl.classList.add("is-visible");
}

function updateHighlightedSuggestion(nextIndex) {
  if (currentSuggestions.length === 0) {
    highlightedSuggestionIndex = -1;
    return;
  }

  const bounded = (nextIndex + currentSuggestions.length) % currentSuggestions.length;
  highlightedSuggestionIndex = bounded;

  const items = guessSuggestionsEl.querySelectorAll(".suggestion-item");
  items.forEach((item, index) => {
    item.classList.toggle("is-active", index === highlightedSuggestionIndex);
  });
}

function applySuggestion(word) {
  guessInput.value = word;
  hideSuggestions();
}

function resolveGuessWord(input) {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }

  if (state.vectors.has(trimmed)) {
    return trimmed;
  }

  return state.wordsByLower.get(trimmed.toLowerCase()) || "";
}

function sampleWords(count, excluded = new Set()) {
  const pool = state.words.filter((word) => !excluded.has(word));
  if (pool.length < count) {
    throw new Error("Not enough words available for sampling.");
  }

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, count);
}

function startRound() {
  if (!state.loaded) {
    return;
  }

  if (state.pendingIncrement && autoIncrementInput.checked) {
    const incremented = Math.min(clampWordCount() + 1, 10);
    wordCountInput.value = String(incremented);
  }

  const n = clampWordCount();

  try {
    state.leftWords = sampleWords(n);
    state.rightWords = sampleWords(n, new Set(state.leftWords));

    renderBoard();
    resultEl.className = "";
    resultEl.textContent = "No guess yet.";
    nearestEnemyEl.textContent = "Nearest enemy distance: -";
    guessInput.value = "";
    state.pendingIncrement = false;
    submitBtn.disabled = false;
    newRoundBtn.disabled = false;
    setStatus("Round ready. Enter your guess.");
  } catch (error) {
    setStatus(`Cannot start round: ${error.message}`);
  }
}

function renderBoard(evaluation = null) {
  leftWordsEl.innerHTML = "";
  rightWordsEl.innerHTML = "";

  for (const word of state.leftWords) {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.classList.add("word-chip");
    span.textContent = word;

    if (evaluation) {
      const distance = evaluation.leftDistancesByWord.get(word);
      const isGood = distance < evaluation.minEnemyDistance;
      span.classList.add(isGood ? "word-good" : "word-bad");
      const rank = evaluation.rankByWord.get(word);
      span.textContent = `${word} d: ${distance.toFixed(2)} r: ${rank}`;
    }

    li.appendChild(span);
    leftWordsEl.appendChild(li);
  }

  for (const word of state.rightWords) {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.classList.add("word-chip");
    span.textContent = word;

    if (evaluation) {
      const distance = evaluation.rightDistancesByWord.get(word);
      const isGood = distance > evaluation.farthestYourDistance;
      span.classList.add(isGood ? "word-good" : "word-bad");
      const rank = evaluation.rankByWord.get(word);
      span.textContent = `${word} d: ${distance.toFixed(2)} r: ${rank}`;
    }

    li.appendChild(span);
    rightWordsEl.appendChild(li);
  }
}

function cosineDistance(wordA, wordB) {
  const vectorA = state.vectors.get(wordA);
  const vectorB = state.vectors.get(wordB);
  const normA = state.vectorNorms.get(wordA);
  const normB = state.vectorNorms.get(wordB);

  if (!vectorA || !vectorB || !normA || !normB) {
    throw new Error("Missing vector for selected word.");
  }

  let dot = 0;
  for (let i = 0; i < vectorA.length; i++) {
    dot += vectorA[i] * vectorB[i];
  }

  const similarity = dot / (normA * normB);
  return 1 - similarity;
}

function submitGuess() {
  if (!state.loaded) {
    return;
  }

  const guess = guessInput.value.trim();
  const canonicalGuess = resolveGuessWord(guess);
  if (!canonicalGuess || !state.vectors.has(canonicalGuess)) {
    setStatus("Unknown word. Pick a word from autocomplete.");
    return;
  }

  guessInput.value = canonicalGuess;

  const leftDistancesByWord = new Map();
  for (const word of state.leftWords) {
    leftDistancesByWord.set(word, cosineDistance(canonicalGuess, word));
  }

  const rightDistancesByWord = new Map();
  for (const word of state.rightWords) {
    rightDistancesByWord.set(word, cosineDistance(canonicalGuess, word));
  }

  const minEnemyDistance = Math.min(...rightDistancesByWord.values());
  const farthestYourDistance = Math.max(...leftDistancesByWord.values());
  const nearerYourWords = [...leftDistancesByWord.values()].filter((distance) => distance < minEnemyDistance).length;

  const ranked = [
    ...state.leftWords.map((word) => ({ word, distance: leftDistancesByWord.get(word) })),
    ...state.rightWords.map((word) => ({ word, distance: rightDistancesByWord.get(word) })),
  ].sort((a, b) => a.distance - b.distance);

  const rankByWord = new Map();
  ranked.forEach((entry, index) => {
    rankByWord.set(entry.word, index + 1);
  });

  state.rounds += 1;
  state.points += nearerYourWords;
  updateScore();

  state.history.unshift({
    round: state.rounds,
    n: state.leftWords.length,
    guess: canonicalGuess,
    roundPoints: nearerYourWords,
    yourWords: [...state.leftWords],
    enemyWords: [...state.rightWords],
  });
  renderHistory();

  resultEl.className = nearerYourWords > 0 ? "result-good" : "result-bad";
  resultEl.textContent = `Round points: ${nearerYourWords} / ${state.leftWords.length}`;
  nearestEnemyEl.textContent = `Nearest enemy distance: ${minEnemyDistance.toFixed(2)}`;

  renderBoard({
    leftDistancesByWord,
    rightDistancesByWord,
    minEnemyDistance,
    farthestYourDistance,
    rankByWord,
  });

  state.pendingIncrement = true;
  setStatus("Round scored. You can submit another guess or click 'Next round'.");
}

function renderHistory() {
  historyBodyEl.innerHTML = "";

  for (const entry of state.history) {
    const tr = document.createElement("tr");

    const roundTd = document.createElement("td");
    roundTd.textContent = String(entry.round);

    const nTd = document.createElement("td");
    nTd.textContent = String(entry.n);

    const guessTd = document.createElement("td");
    guessTd.textContent = entry.guess;

    const pointsTd = document.createElement("td");
    pointsTd.textContent = `${entry.roundPoints} / ${entry.n}`;

    const yourWordsTd = document.createElement("td");
    yourWordsTd.textContent = entry.yourWords.join(", ");

    const enemyWordsTd = document.createElement("td");
    enemyWordsTd.textContent = entry.enemyWords.join(", ");

    tr.appendChild(roundTd);
    tr.appendChild(nTd);
    tr.appendChild(guessTd);
    tr.appendChild(pointsTd);
    tr.appendChild(yourWordsTd);
    tr.appendChild(enemyWordsTd);

    historyBodyEl.appendChild(tr);
  }
}

loadBtn.addEventListener("click", loadEmbeddings);
loadMediumBtn.addEventListener("click", loadMediumEmbeddings);
newRoundBtn.addEventListener("click", startRound);
submitBtn.addEventListener("click", submitGuess);

guessSuggestionsEl.addEventListener("pointerdown", (event) => {
  const target = event.target.closest(".suggestion-item");
  if (!target) {
    return;
  }

  event.preventDefault();
  applySuggestion(target.dataset.word);
  guessInput.focus();
});

guessInput.addEventListener("input", () => {
  if (!state.loaded || guessInput.disabled) {
    return;
  }

  if (hideSuggestionsTimer) {
    clearTimeout(hideSuggestionsTimer);
    hideSuggestionsTimer = null;
  }

  renderSuggestions(getSuggestions(guessInput.value));
});

guessInput.addEventListener("focus", () => {
  if (!state.loaded || guessInput.disabled) {
    return;
  }

  renderSuggestions(getSuggestions(guessInput.value));
});

guessInput.addEventListener("blur", () => {
  hideSuggestionsTimer = setTimeout(() => {
    hideSuggestions();
  }, 120);
});

guessInput.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown" && currentSuggestions.length > 0) {
    event.preventDefault();
    updateHighlightedSuggestion(highlightedSuggestionIndex + 1);
    return;
  }

  if (event.key === "ArrowUp" && currentSuggestions.length > 0) {
    event.preventDefault();
    updateHighlightedSuggestion(highlightedSuggestionIndex - 1);
    return;
  }

  if (event.key === "Escape") {
    hideSuggestions();
    return;
  }

  if (event.key === "Enter") {
    if (highlightedSuggestionIndex >= 0 && currentSuggestions[highlightedSuggestionIndex]) {
      event.preventDefault();
      applySuggestion(currentSuggestions[highlightedSuggestionIndex]);
      return;
    }

    event.preventDefault();
    submitGuess();
  }
});

updateScore();
if (!datasetPathInput.value.trim()) {
  datasetPathInput.value = SMALL_DATASET_PATH;
}
loadEmbeddings();
