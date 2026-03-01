const state = {
  words: [],
  wordsByLower: new Map(),
  vectors: new Map(),
  vectorNorms: new Map(),
  loaded: false,
  rounds: 0,
  points: 0,
  history: [],
  currentEquation: null,
};

const SMALL_DATASET_PATH = "data/glove.2024.wikigiga.50d.top14000.txt";
const MEDIUM_DATASET_PATH = "data/glove.2024.wikigiga.50d.top50000.txt";
const DE_SMALL_DATASET_PATH = "data/cc.de.300.top14000.txt";
const DE_MEDIUM_DATASET_PATH = "data/cc.de.300.top30000.txt";

const DEFAULT_SMALL_DATASET_BY_LANG = {
  en: SMALL_DATASET_PATH,
  de: DE_SMALL_DATASET_PATH,
};

const DATASET_PRESETS = [
  { id: "en-small", lang: "en", size: "small", path: SMALL_DATASET_PATH, label: "English small (14k)" },
  { id: "en-medium", lang: "en", size: "medium", path: MEDIUM_DATASET_PATH, label: "English medium (50k)" },
  { id: "de-small", lang: "de", size: "small", path: DE_SMALL_DATASET_PATH, label: "German small (14k)" },
  { id: "de-medium", lang: "de", size: "medium", path: DE_MEDIUM_DATASET_PATH, label: "German medium (30k)" },
];

const EQUATION_TYPES = [
  { coeffs: [1, 1] },
  { coeffs: [1, 1, -1] },
  { coeffs: [1, -1, 1] },
  { coeffs: [1, -1, -1] },
];

const MAX_SUGGESTIONS = 12;
const ADDITIONAL_WORD_COUNT = 10;

const datasetPathInput = document.getElementById("datasetPath");
const datasetPresetSelect = document.getElementById("datasetPreset");
const languageSelect = document.getElementById("languageSelect");
const loadBtn = document.getElementById("loadBtn");
const loadMediumBtn = document.getElementById("loadMediumBtn");
const newRoundBtn = document.getElementById("newRoundBtn");
const submitBtn = document.getElementById("submitBtn");
const guessInput = document.getElementById("guessInput");
const guessSuggestionsEl = document.getElementById("guessSuggestions");
const equationEl = document.getElementById("equation");
const statusEl = document.getElementById("status");
const roundResultEl = document.getElementById("roundResult");
const distanceResultEl = document.getElementById("distanceResult");
const submittedDistanceEl = document.getElementById("submittedDistance");
const comparisonDistancesEl = document.getElementById("comparisonDistances");
const scoreEl = document.getElementById("score");
const historyBodyEl = document.getElementById("historyBody");

let currentLanguage = "en";
let currentSuggestions = [];
let highlightedSuggestionIndex = -1;
let hideSuggestionsTimer = null;
let lastSubmittedGuess = "";

function setStatus(message) {
  statusEl.textContent = message;
}

function updateScore() {
  scoreEl.textContent = `Score: ${state.points} / ${state.rounds}`;
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

function rebuildDatasetPresetOptions() {
  const currentPath = datasetPathInput.value.trim();
  datasetPresetSelect.innerHTML = "";

  for (const preset of DATASET_PRESETS) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.label;
    datasetPresetSelect.appendChild(option);
  }

  if (!currentPath) {
    datasetPathInput.value = DEFAULT_SMALL_DATASET_BY_LANG[currentLanguage];
  }

  syncDatasetPresetWithPath();
}

function syncDatasetPresetWithPath() {
  const path = datasetPathInput.value.trim();
  const matchedPreset = DATASET_PRESETS.find((preset) => preset.path === path);

  const customOption = datasetPresetSelect.querySelector("option[value='__custom__']");
  if (customOption) {
    customOption.remove();
  }

  if (matchedPreset) {
    datasetPresetSelect.value = matchedPreset.id;
    return;
  }

  const option = document.createElement("option");
  option.value = "__custom__";
  option.textContent = "Custom path";
  datasetPresetSelect.appendChild(option);
  datasetPresetSelect.value = "__custom__";
}

function setLanguage(nextLanguage) {
  const previousLanguage = currentLanguage;
  currentLanguage = nextLanguage === "de" ? "de" : "en";

  const previousDefaultPath = DEFAULT_SMALL_DATASET_BY_LANG[previousLanguage];
  const nextDefaultPath = DEFAULT_SMALL_DATASET_BY_LANG[currentLanguage];
  const datasetPath = datasetPathInput.value.trim();
  if (!datasetPath || datasetPath === previousDefaultPath) {
    datasetPathInput.value = nextDefaultPath;
  }

  rebuildDatasetPresetOptions();
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
  datasetPathInput.value = currentLanguage === "de" ? DE_MEDIUM_DATASET_PATH : MEDIUM_DATASET_PATH;
  syncDatasetPresetWithPath();
  return loadEmbeddings();
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

function formatEquation(words, coeffs) {
  let text = "";
  for (let i = 0; i < words.length; i++) {
    const sign = coeffs[i] >= 0 ? "+" : "-";
    if (i === 0) {
      text += `${coeffs[i] < 0 ? "-" : ""}${words[i]}`;
    } else {
      text += ` ${sign} ${words[i]}`;
    }
  }
  return `${text} = ?`;
}

function buildTargetVector(words, coeffs) {
  const firstVector = state.vectors.get(words[0]);
  if (!firstVector) {
    throw new Error("Missing vector for sampled word.");
  }

  const target = new Float32Array(firstVector.length);

  for (let i = 0; i < words.length; i++) {
    const vector = state.vectors.get(words[i]);
    if (!vector) {
      throw new Error("Missing vector for sampled word.");
    }

    const scale = coeffs[i];
    for (let j = 0; j < vector.length; j++) {
      target[j] += scale * vector[j];
    }
  }

  let sumSquares = 0;
  for (let i = 0; i < target.length; i++) {
    sumSquares += target[i] * target[i];
  }

  const norm = Math.sqrt(sumSquares);
  if (norm === 0) {
    throw new Error("Target equation produced zero vector.");
  }

  return { target, norm };
}

function startRound() {
  if (!state.loaded) {
    return;
  }

  try {
    const equationType = EQUATION_TYPES[Math.floor(Math.random() * EQUATION_TYPES.length)];
    const words = sampleWords(equationType.coeffs.length);
    const comparisonWords = sampleWords(ADDITIONAL_WORD_COUNT, new Set(words));
    const targetData = buildTargetVector(words, equationType.coeffs);

    state.currentEquation = {
      words,
      comparisonWords,
      coeffs: equationType.coeffs,
      targetVector: targetData.target,
      targetNorm: targetData.norm,
      equationText: formatEquation(words, equationType.coeffs),
    };

    equationEl.textContent = state.currentEquation.equationText;
    guessInput.value = "";
    lastSubmittedGuess = "";
    hideSuggestions();
    roundResultEl.className = "";
    roundResultEl.textContent = "No guess yet.";
    distanceResultEl.textContent = "Distance: -";
    submittedDistanceEl.textContent = "Submitted word distance: -";
    comparisonDistancesEl.innerHTML = "";
    setStatus("Equation ready. Enter your guess.");
  } catch (error) {
    setStatus(`Cannot start round: ${error.message}`);
  }
}

function renderDistanceBreakdown(guessWord, guessDistance, comparisonDistances) {
  submittedDistanceEl.textContent = `${guessWord}: ${guessDistance.toFixed(4)}`;
  comparisonDistancesEl.innerHTML = "";

  for (const entry of comparisonDistances) {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.classList.add("word-chip");

    if (entry.distance > guessDistance) {
      span.classList.add("word-good");
    } else if (entry.distance < guessDistance) {
      span.classList.add("word-bad");
    }

    span.textContent = `${entry.word}: ${entry.distance.toFixed(4)}`;
    li.appendChild(span);
    comparisonDistancesEl.appendChild(li);
  }
}

function cosineDistanceToTarget(word) {
  const vector = state.vectors.get(word);
  const norm = state.vectorNorms.get(word);
  if (!vector || !norm || !state.currentEquation) {
    throw new Error("Missing vector data.");
  }

  let dot = 0;
  for (let i = 0; i < vector.length; i++) {
    dot += vector[i] * state.currentEquation.targetVector[i];
  }

  const similarity = dot / (norm * state.currentEquation.targetNorm);
  return 1 - similarity;
}

function scoreFromDistance(distance) {
  if (distance <= 0.22) return 3;
  if (distance <= 0.34) return 2;
  if (distance <= 0.5) return 1;
  return 0;
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

function submitGuess() {
  if (!state.loaded || !state.currentEquation) {
    return;
  }

  const canonicalGuess = resolveGuessWord(guessInput.value);
  if (!canonicalGuess || !state.vectors.has(canonicalGuess)) {
    setStatus("Unknown word. Pick a word from autocomplete.");
    return;
  }

  if (lastSubmittedGuess && canonicalGuess === lastSubmittedGuess) {
    startRound();
    return;
  }

  guessInput.value = canonicalGuess;

  const distance = cosineDistanceToTarget(canonicalGuess);
  const roundPoints = scoreFromDistance(distance);
  const comparisonDistances = state.currentEquation.comparisonWords.map((word) => ({
    word,
    distance: cosineDistanceToTarget(word),
  }));

  state.rounds += 1;
  state.points += roundPoints;
  updateScore();

  state.history.unshift({
    round: state.rounds,
    equation: state.currentEquation.equationText,
    guess: canonicalGuess,
    distance,
    points: roundPoints,
  });
  renderHistory();

  roundResultEl.className = roundPoints > 0 ? "result-good" : "result-bad";
  roundResultEl.textContent = `Points this round: ${roundPoints}`;
  distanceResultEl.textContent = `Distance: ${distance.toFixed(4)}`;
  renderDistanceBreakdown(canonicalGuess, distance, comparisonDistances);
  lastSubmittedGuess = canonicalGuess;
  setStatus("Round scored. Submit the same word again to go to the next round.");
}

function renderHistory() {
  historyBodyEl.innerHTML = "";

  for (const entry of state.history) {
    const tr = document.createElement("tr");

    const roundTd = document.createElement("td");
    roundTd.textContent = String(entry.round);

    const equationTd = document.createElement("td");
    equationTd.textContent = entry.equation;

    const guessTd = document.createElement("td");
    guessTd.textContent = entry.guess;

    const distanceTd = document.createElement("td");
    distanceTd.textContent = entry.distance.toFixed(4);

    const pointsTd = document.createElement("td");
    pointsTd.textContent = String(entry.points);

    tr.appendChild(roundTd);
    tr.appendChild(equationTd);
    tr.appendChild(guessTd);
    tr.appendChild(distanceTd);
    tr.appendChild(pointsTd);

    historyBodyEl.appendChild(tr);
  }
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

loadBtn.addEventListener("click", loadEmbeddings);
loadMediumBtn.addEventListener("click", loadMediumEmbeddings);
newRoundBtn.addEventListener("click", startRound);
submitBtn.addEventListener("click", submitGuess);
languageSelect.addEventListener("change", () => {
  setLanguage(languageSelect.value);
});
datasetPresetSelect.addEventListener("change", () => {
  const selectedPreset = DATASET_PRESETS.find((preset) => preset.id === datasetPresetSelect.value);
  if (!selectedPreset) {
    return;
  }

  datasetPathInput.value = selectedPreset.path;
});
datasetPathInput.addEventListener("input", () => {
  syncDatasetPresetWithPath();
});

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
  datasetPathInput.value = DEFAULT_SMALL_DATASET_BY_LANG[currentLanguage];
}
setLanguage(languageSelect.value || "en");
syncDatasetPresetWithPath();
loadEmbeddings();
