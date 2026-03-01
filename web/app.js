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
const DE_SMALL_DATASET_PATH = "data/cc.de.300.top14000.txt";
const DE_MEDIUM_DATASET_PATH = "data/cc.de.300.top30000.txt";

const DEFAULT_SMALL_DATASET_BY_LANG = {
  en: SMALL_DATASET_PATH,
  de: DE_SMALL_DATASET_PATH,
};

const DATASET_PRESETS = [
  { id: "en-small", lang: "en", size: "small", path: SMALL_DATASET_PATH },
  { id: "en-medium", lang: "en", size: "medium", path: MEDIUM_DATASET_PATH },
  { id: "de-small", lang: "de", size: "small", path: DE_SMALL_DATASET_PATH },
  { id: "de-medium", lang: "de", size: "medium", path: DE_MEDIUM_DATASET_PATH },
];

const I18N = {
  en: {
    title: "Vector Code Words",
    subtitle: "Pick a word that is \"nearer\" to \"your words\" than to the \"enemy words\"!",
    setupSummary: "Setup",
    languageLabel: "Language",
    datasetPathLabel: "Dataset path",
    datasetPresetLabel: "Dataset preset",
    datasetPresetEnSmall: "English small (14k)",
    datasetPresetEnMedium: "English medium (50k)",
    datasetPresetDeSmall: "German small (14k)",
    datasetPresetDeMedium: "German medium (30k)",
    datasetPresetCustom: "Custom path",
    wordsPerSideLabel: "Words per side (n)",
    autoIncrementLabel: "Auto-increment n per round",
    reloadEmbeddingsBtn: "Reload embeddings",
    loadBigDatasetBtn: "Load big dataset (medium)",
    statusLoadingDefault: "Loading default small dataset...",
    yourWordsTitle: "Your words",
    enemyWordsTitle: "Enemy words",
    pickWordTitle: "Pick a word",
    pickWordHint: "Start typing and tap a suggestion from the list. Not every word is in the dataset. Pick a word that is \"nearer\" to \"your words\" than to the \"enemy words\"!",
    yourWordLabel: "Your word",
    guessPlaceholder: "Type a known word",
    wordSuggestionsAria: "Word suggestions",
    submitGuessBtn: "Submit guess",
    nextRoundBtn: "Next round",
    resultTitle: "Result",
    noGuessYet: "No guess yet.",
    roundHistoryTitle: "Round history",
    historyRound: "Round",
    historyGuess: "Guess",
    historyPoints: "Points",
    historyYourWords: "Your words",
    historyEnemyWords: "Enemy words",
    aboutEmbeddingsTitle: "About word embeddings",
    aboutEmbeddingsP1: "Word embeddings represent each word as a fixed-size vector of numbers.",
    aboutEmbeddingsP2: "These vectors are learned from very large text corpora by counting how often words appear with other words in many contexts, then fitting vectors so their dot products capture global co-occurrence patterns.",
    aboutEmbeddingsP3: "Words used in similar contexts end up near each other in vector space, which is why cosine distance can be used here to score guesses against your words and enemy words.",
    learnMore: "Learn more",
    score: ({ points, rounds }) => `Score: ${points} / ${rounds}`,
    statusDatasetEmpty: "Dataset path is empty.",
    statusLoadingEmbeddings: "Loading embeddings...",
    statusLoadedWords: ({ count }) => `Loaded ${count} words.`,
    statusFailedToLoad: ({ message }) => `Failed to load embeddings: ${message}`,
    statusRoundReady: "Round ready. Enter your guess.",
    statusCannotStartRound: ({ message }) => `Cannot start round: ${message}`,
    statusUnknownWord: "Unknown word. Pick a word from autocomplete.",
    roundPoints: ({ points, total }) => `Round points: ${points} / ${total}`,
    nearestEnemyDistance: ({ distance }) => `Nearest enemy distance: ${distance.toFixed(2)}`,
    nearestEnemyDistanceEmpty: "Nearest enemy distance: -",
    statusRoundScored: "Round scored. You can submit another guess or click 'Next round'.",
    missingVector: "Missing vector for selected word.",
  },
  de: {
    title: "Vektor-Codewörter",
    subtitle: "Finde ein Wort, das näher an deinen Wörtern als an den Gegnerwörtern ist!",
    setupSummary: "Einstellungen",
    languageLabel: "Sprache",
    datasetPathLabel: "Datensatz-Pfad",
    datasetPresetLabel: "Datensatz-Vorgabe",
    datasetPresetEnSmall: "Englisch klein (14k)",
    datasetPresetEnMedium: "Englisch mittel (50k)",
    datasetPresetDeSmall: "Deutsch klein (14k)",
    datasetPresetDeMedium: "Deutsch mittel (30k)",
    datasetPresetCustom: "Eigener Pfad",
    wordsPerSideLabel: "Wörter pro Seite (n)",
    autoIncrementLabel: "n pro Runde automatisch erhöhen",
    reloadEmbeddingsBtn: "Embeddings neu laden",
    loadBigDatasetBtn: "Großen Datensatz laden (mittel)",
    statusLoadingDefault: "Standard-Datensatz wird geladen...",
    yourWordsTitle: "Deine Wörter",
    enemyWordsTitle: "Gegnerwörter",
    pickWordTitle: "Wort wählen",
    pickWordHint: "Tippe und wähle einen Vorschlag aus der Liste. Nicht jedes Wort ist im Datensatz. Dein Wort sollte näher an deinen Wörtern als an den Gegnerwörtern sein.",
    yourWordLabel: "Dein Wort",
    guessPlaceholder: "Bekanntes Wort eingeben",
    wordSuggestionsAria: "Wortvorschläge",
    submitGuessBtn: "Tipp abgeben",
    nextRoundBtn: "Nächste Runde",
    resultTitle: "Ergebnis",
    noGuessYet: "Noch kein Tipp.",
    roundHistoryTitle: "Rundenverlauf",
    historyRound: "Runde",
    historyGuess: "Tipp",
    historyPoints: "Punkte",
    historyYourWords: "Deine Wörter",
    historyEnemyWords: "Gegnerwörter",
    aboutEmbeddingsTitle: "Über Wort-Embeddings",
    aboutEmbeddingsP1: "Wort-Embeddings repräsentieren jedes Wort als Vektor fester Länge.",
    aboutEmbeddingsP2: "Diese Vektoren werden aus sehr großen Textkorpora gelernt, indem gezählt wird, wie oft Wörter in vielen Kontexten zusammen auftreten, und anschließend Vektoren angepasst werden, deren Skalarprodukte diese globalen Muster abbilden.",
    aboutEmbeddingsP3: "Wörter mit ähnlichen Kontexten liegen im Vektorraum nahe beieinander. Deshalb kann hier die Kosinusdistanz zur Bewertung genutzt werden.",
    learnMore: "Mehr dazu",
    score: ({ points, rounds }) => `Punktestand: ${points} / ${rounds}`,
    statusDatasetEmpty: "Datensatz-Pfad ist leer.",
    statusLoadingEmbeddings: "Embeddings werden geladen...",
    statusLoadedWords: ({ count }) => `${count} Wörter geladen.`,
    statusFailedToLoad: ({ message }) => `Embeddings konnten nicht geladen werden: ${message}`,
    statusRoundReady: "Runde bereit. Gib deinen Tipp ein.",
    statusCannotStartRound: ({ message }) => `Runde kann nicht gestartet werden: ${message}`,
    statusUnknownWord: "Unbekanntes Wort. Bitte aus der Autovervollständigung wählen.",
    roundPoints: ({ points, total }) => `Rundenpunkte: ${points} / ${total}`,
    nearestEnemyDistance: ({ distance }) => `Nächste Gegner-Distanz: ${distance.toFixed(2)}`,
    nearestEnemyDistanceEmpty: "Nächste Gegner-Distanz: -",
    statusRoundScored: "Runde gewertet. Du kannst erneut tippen oder auf 'Nächste Runde' klicken.",
    missingVector: "Vektor für ausgewähltes Wort fehlt.",
  },
};

const datasetPathInput = document.getElementById("datasetPath");
const datasetPresetSelect = document.getElementById("datasetPreset");
const languageSelect = document.getElementById("languageSelect");
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
let currentLanguage = "en";
let lastSubmittedGuess = "";

function t(key, values = {}) {
  const langPack = I18N[currentLanguage] || I18N.en;
  const template = langPack[key] ?? I18N.en[key] ?? key;
  if (typeof template === "function") {
    return template(values);
  }
  return template;
}

function applyStaticTranslations() {
  const i18nNodes = document.querySelectorAll("[data-i18n]");
  for (const node of i18nNodes) {
    const key = node.getAttribute("data-i18n");
    node.textContent = t(key);
  }

  const placeholderNodes = document.querySelectorAll("[data-i18n-placeholder]");
  for (const node of placeholderNodes) {
    const key = node.getAttribute("data-i18n-placeholder");
    node.setAttribute("placeholder", t(key));
  }

  const ariaNodes = document.querySelectorAll("[data-i18n-aria-label]");
  for (const node of ariaNodes) {
    const key = node.getAttribute("data-i18n-aria-label");
    node.setAttribute("aria-label", t(key));
  }
}

function getPresetLabelKey(presetId) {
  if (presetId === "en-small") return "datasetPresetEnSmall";
  if (presetId === "en-medium") return "datasetPresetEnMedium";
  if (presetId === "de-small") return "datasetPresetDeSmall";
  if (presetId === "de-medium") return "datasetPresetDeMedium";
  return "datasetPresetCustom";
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
  option.textContent = t("datasetPresetCustom");
  datasetPresetSelect.appendChild(option);
  datasetPresetSelect.value = "__custom__";
}

function rebuildDatasetPresetOptions() {
  const currentPath = datasetPathInput.value.trim();
  datasetPresetSelect.innerHTML = "";

  for (const preset of DATASET_PRESETS) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = t(getPresetLabelKey(preset.id));
    datasetPresetSelect.appendChild(option);
  }

  if (!currentPath) {
    datasetPathInput.value = DEFAULT_SMALL_DATASET_BY_LANG[currentLanguage];
  }

  syncDatasetPresetWithPath();
}

function setLanguage(nextLanguage) {
  const previousLanguage = currentLanguage;
  currentLanguage = I18N[nextLanguage] ? nextLanguage : "en";

  const previousDefaultPath = DEFAULT_SMALL_DATASET_BY_LANG[previousLanguage];
  const nextDefaultPath = DEFAULT_SMALL_DATASET_BY_LANG[currentLanguage];
  const datasetPath = datasetPathInput.value.trim();
  if (!datasetPath || datasetPath === previousDefaultPath) {
    datasetPathInput.value = nextDefaultPath;
  }

  applyStaticTranslations();
  rebuildDatasetPresetOptions();
  updateScore();

  if (!state.history.length) {
    resultEl.className = "";
    resultEl.textContent = t("noGuessYet");
    nearestEnemyEl.textContent = t("nearestEnemyDistanceEmpty");
  }
}

function updateScore() {
  scoreEl.textContent = t("score", { points: state.points, rounds: state.rounds });
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
    setStatus(t("statusDatasetEmpty"));
    return;
  }

  loadBtn.disabled = true;
  setStatus(t("statusLoadingEmbeddings"));

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

    setStatus(t("statusLoadedWords", { count: state.words.length }));
    startRound();
  } catch (error) {
    setStatus(t("statusFailedToLoad", { message: error.message }));
  } finally {
    loadBtn.disabled = false;
  }
}

function loadMediumEmbeddings() {
  datasetPathInput.value = currentLanguage === "de" ? DE_MEDIUM_DATASET_PATH : MEDIUM_DATASET_PATH;
  syncDatasetPresetWithPath();
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
    resultEl.textContent = t("noGuessYet");
    nearestEnemyEl.textContent = t("nearestEnemyDistanceEmpty");
    guessInput.value = "";
    lastSubmittedGuess = "";
    state.pendingIncrement = false;
    submitBtn.disabled = false;
    newRoundBtn.disabled = false;
    setStatus(t("statusRoundReady"));
  } catch (error) {
    setStatus(t("statusCannotStartRound", { message: error.message }));
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
    throw new Error(t("missingVector"));
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
    setStatus(t("statusUnknownWord"));
    return;
  }

  if (state.pendingIncrement && canonicalGuess === lastSubmittedGuess) {
    startRound();
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
  resultEl.textContent = t("roundPoints", {
    points: nearerYourWords,
    total: state.leftWords.length,
  });
  nearestEnemyEl.textContent = t("nearestEnemyDistance", { distance: minEnemyDistance });

  renderBoard({
    leftDistancesByWord,
    rightDistancesByWord,
    minEnemyDistance,
    farthestYourDistance,
    rankByWord,
  });

  state.pendingIncrement = true;
  lastSubmittedGuess = canonicalGuess;
  setStatus(t("statusRoundScored"));
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
