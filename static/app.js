// -----------------------------------------------------------------------------
// AudioViz Client App
// -----------------------------------------------------------------------------
// Responsibilities:
// 1) Listen to voice commands through the browser's Web Speech API
// 2) Parse transcripts into shape/color/movement/utility intents
// 3) Update the on-screen shape and debug intent output

// ----- DOM references ---------------------------------------------------------
const shapeEl = document.getElementById("shape");
const toggleBtn = document.getElementById("toggleListen");
const statusEl = document.getElementById("status");
const lastCommandEl = document.getElementById("lastCommand");
const recognizedIntentsEl = document.getElementById("recognizedIntents");
const stageEl = document.getElementById("stage");

// Use vendor-prefixed SpeechRecognition on browsers that still require it.
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

// ----- runtime state ----------------------------------------------------------
// Speech engine/lifecycle flags.
let recognition = null;
let listening = false;
let shouldKeepListening = false;
let restartTimerId = null;

const RESTART_DELAY_MS = 400;

// Visual state for the single shape in the stage.
const state = {
  x: 180,
  y: 150,
  size: 90,
  shape: "circle",
  color: "red",
};

// ----- command dictionaries ---------------------------------------------------
const COLORS = ["red", "blue", "green", "yellow", "purple"];
const SHAPES = ["circle", "square"];
const MOVE_WORDS = ["move", "go", "shift", "slide"];

// Direction aliases include common speech-to-text substitutions.
const DIRECTION_ALIASES = {
  left: ["left"],
  right: ["right", "write", "rite"],
  up: ["up", "top"],
  down: ["down", "bottom"],
};

/**
 * Constrain a numeric value to a [min, max] range.
 *
 * @param {number} value - Value to constrain.
 * @param {number} min - Lower bound.
 * @param {number} max - Upper bound.
 * @returns {number} Constrained value.
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Render the shape based on current state and stage dimensions.
 * Also clamps position so shape stays inside the stage.
 */
function render() {
  const maxX = stageEl.clientWidth - state.size;
  const maxY = stageEl.clientHeight - state.size;

  state.x = clamp(state.x, 0, maxX);
  state.y = clamp(state.y, 0, maxY);

  shapeEl.style.left = `${state.x}px`;
  shapeEl.style.top = `${state.y}px`;
  shapeEl.style.width = `${state.size}px`;
  shapeEl.style.height = `${state.size}px`;

  shapeEl.className = `shape ${state.shape} ${state.color}`;
}

function setStatus(text) {
  statusEl.textContent = text;
}

/**
 * Cancel any queued recognition restart attempt.
 */
function clearPendingRestart() {
  if (restartTimerId !== null) {
    clearTimeout(restartTimerId);
    restartTimerId = null;
  }
}

/**
 * Attempt to start recognition safely and recover from transient start errors.
 */
function safeStartRecognition() {
  if (!recognition || listening || !shouldKeepListening) return;

  try {
    recognition.start();
  } catch (error) {
    setStatus(`Retrying mic... (${error.name || "start_error"})`);
    queueRecognitionRestart();
  }
}

/**
 * Queue a delayed restart when the app should remain in listening mode.
 */
function queueRecognitionRestart() {
  if (!shouldKeepListening || listening) return;

  clearPendingRestart();
  setStatus("Reconnecting...");
  restartTimerId = setTimeout(() => {
    restartTimerId = null;
    safeStartRecognition();
  }, RESTART_DELAY_MS);
}

// Small on-screen parser debug line.
/**
 * Display parsed intents for command-debugging visibility.
 *
 * @param {string[]} tags - Parsed intent tags (e.g., "move:right").
 */
function updateRecognizedIntents(tags) {
  if (!recognizedIntentsEl) return;
  recognizedIntentsEl.textContent = tags.length ? tags.join(" | ") : "none";
}

// Normalize transcript text before intent parsing.
/**
 * Normalize transcript text to improve matching reliability.
 *
 * @param {string} rawCommand - Raw speech transcript.
 * @returns {string} Lowercased, punctuation-trimmed, whitespace-normalized text.
 */
function normalizeCommand(rawCommand) {
  return rawCommand
    .toLowerCase()
    .replace(/[.,!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check if command contains at least one candidate keyword.
 *
 * @param {string} command - Normalized command.
 * @param {string[]} words - Candidate tokens/phrases.
 * @returns {boolean} True when any candidate is present.
 */
function hasAnyWord(command, words) {
  return words.some((word) => command.includes(word));
}

/**
 * Match direction aliases with word boundaries (prevents partial token matches).
 *
 * @param {string} command - Normalized command.
 * @param {string[]} aliases - Alias list for one direction.
 * @returns {boolean} True when any alias is found.
 */
function containsAlias(command, aliases) {
  const escapedAliases = aliases
    .map((alias) => alias.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"))
    .join("|");
  const pattern = new RegExp(`\\b(?:${escapedAliases})\\b`);
  return pattern.test(command);
}

/**
 * Extract all directions found in the command.
 *
 * @param {string} command - Normalized command.
 * @returns {string[]} Zero or more canonical directions (left/right/up/down).
 */
function getDirections(command) {
  const directions = [];
  for (const [direction, aliases] of Object.entries(DIRECTION_ALIASES)) {
    if (containsAlias(command, aliases)) {
      directions.push(direction);
    }
  }
  return directions;
}

/**
 * Determine whether command should trigger movement logic.
 *
 * @param {string} command - Normalized command.
 * @param {string[]} directions - Extracted directions.
 * @returns {boolean} True when movement should be applied.
 */
function shouldMove(command, directions) {
  if (directions.length === 0) return false;
  return (
    hasAnyWord(command, MOVE_WORDS) ||
    command.includes(" to ") ||
    directions.length > 0
  );
}

/**
 * Determine whether movement should jump directly to an edge.
 *
 * @param {string} command - Normalized command.
 * @returns {boolean} True when edge-jump modifiers are detected.
 */
function shouldJumpToEdge(command) {
  return hasAnyWord(command, ["far", "edge", "all the way", "max"]);
}

// Prefer the recognition alternative that looks most like a valid command.
/**
 * Score one recognition transcript alternative based on command signal strength.
 * Higher score means "more likely to be actionable".
 *
 * @param {string} transcript - Candidate transcript alternative.
 * @returns {number} Heuristic score.
 */
function scoreCommand(transcript) {
  const command = normalizeCommand(transcript);
  let score = 0;

  if (hasAnyWord(command, COLORS)) score += 1;
  if (hasAnyWord(command, SHAPES)) score += 1;
  if (hasAnyWord(command, MOVE_WORDS)) score += 2;
  if (getDirections(command).length > 0) score += 2;
  if (hasAnyWord(command, ["bigger", "larger", "increase", "grow"])) score += 1;
  if (hasAnyWord(command, ["smaller", "decrease", "shrink"])) score += 1;
  if (command.includes("reset")) score += 1;

  return score;
}

/**
 * Choose movement distance from natural-language modifiers.
 *
 * @param {string} command - Normalized command.
 * @returns {number} Pixel movement step.
 */
function movementStep(command) {
  // Natural-language speed/size hints for movement distance.
  if (hasAnyWord(command, ["far", "lot", "more"])) {
    return 80;
  }

  if (hasAnyWord(command, ["slight", "little", "tiny", "bit"])) {
    return 20;
  }

  return 40;
}

/**
 * Incrementally move shape position in pixels.
 *
 * @param {number} dx - Horizontal delta.
 * @param {number} dy - Vertical delta.
 */
function moveBy(dx, dy) {
  state.x += dx;
  state.y += dy;
}

/**
 * Restore shape state to initial defaults.
 */
function resetState() {
  state.x = 180;
  state.y = 150;
  state.size = 90;
  state.shape = "circle";
  state.color = "red";
}

/**
 * Parse a single transcript and apply all supported intents.
 * This function is the main command router for shape/color/movement/utility.
 *
 * @param {string} rawCommand - Raw transcript from speech recognition.
 */
function processCommand(rawCommand) {
  const command = normalizeCommand(rawCommand);
  if (!command) return;

  lastCommandEl.textContent = command;
  // Collect parsed intents so users can see what the app understood.
  const intents = [];

  for (const color of COLORS) {
    if (command.includes(color)) {
      state.color = color;
      intents.push(`color:${color}`);
      break;
    }
  }

  for (const shape of SHAPES) {
    if (command.includes(shape)) {
      state.shape = shape;
      intents.push(`shape:${shape}`);
      break;
    }
  }

  const step = movementStep(command);
  const directions = getDirections(command);

  if (shouldMove(command, directions)) {
    const jumpToEdge = shouldJumpToEdge(command);
    intents.push(`move:${directions.join("+") || "unknown"}`);
    if (jumpToEdge) intents.push("move_mode:edge");
    const maxX = stageEl.clientWidth - state.size;
    const maxY = stageEl.clientHeight - state.size;

    for (const direction of directions) {
      if (direction === "left") {
        if (jumpToEdge) state.x = 0;
        else moveBy(-step, 0);
      }
      if (direction === "right") {
        if (jumpToEdge) state.x = maxX;
        else moveBy(step, 0);
      }
      if (direction === "up") {
        if (jumpToEdge) state.y = 0;
        else moveBy(0, -step);
      }
      if (direction === "down") {
        if (jumpToEdge) state.y = maxY;
        else moveBy(0, step);
      }
    }
  }

  if (hasAnyWord(command, ["bigger", "larger", "increase", "grow"])) {
    state.size = clamp(state.size + 15, 30, 220);
    intents.push("size:up");
  }
  if (hasAnyWord(command, ["smaller", "decrease", "shrink"])) {
    state.size = clamp(state.size - 15, 30, 220);
    intents.push("size:down");
  }

  if (command.includes("reset")) {
    resetState();
    intents.push("utility:reset");
  }

  if (command.includes("stop listening")) {
    stopListening();
    intents.push("utility:stop_listening");
  }

  if (command.includes("start listening")) {
    startListening();
    intents.push("utility:start_listening");
  }

  updateRecognizedIntents(intents);
  render();
}

/**
 * Start speech recognition (continuous mode).
 * Sets desired listening state so reconnect logic can recover when needed.
 */
function startListening() {
  if (!recognition || listening) return;
  shouldKeepListening = true;
  clearPendingRestart();
  safeStartRecognition();
}

/**
 * Stop speech recognition and disable auto-reconnect.
 */
function stopListening() {
  shouldKeepListening = false;
  clearPendingRestart();
  if (!recognition || !listening) return;
  recognition.stop();
}

/**
 * UI button handler for start/stop listening.
 */
function toggleListening() {
  if (!recognition) {
    alert(
      "Speech Recognition is not supported in this browser. Try Chrome or Edge.",
    );
    return;
  }

  if (listening) {
    stopListening();
  } else {
    startListening();
  }
}

/**
 * Initialize browser speech recognition and bind lifecycle handlers.
 */
function initRecognition() {
  if (!SpeechRecognition) {
    setStatus("Web Speech API not supported");
    toggleBtn.disabled = true;
    return;
  }

  // Configure browser speech recognition for continuous command input.
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.maxAlternatives = 5;
  recognition.lang = "en-US";

  // Fired when recognition actively starts listening to microphone input.
  recognition.onstart = () => {
    listening = true;
    setStatus("Listening...");
    toggleBtn.textContent = "Stop Listening";
  };

  // Fired when recognition stops for any reason (normal stop, timeout, etc.).
  recognition.onend = () => {
    listening = false;
    setStatus("Idle");
    toggleBtn.textContent = "Start Listening";

    // Auto-restart if user still expects active listening.
    if (shouldKeepListening) {
      queueRecognitionRestart();
    }
  };

  // Fired on recognition failures (permissions, network/service, no-speech, etc.).
  recognition.onerror = (event) => {
    if (
      event.error === "not-allowed" ||
      event.error === "service-not-allowed"
    ) {
      shouldKeepListening = false;
      clearPendingRestart();
    } else if (shouldKeepListening) {
      queueRecognitionRestart();
    }
    setStatus(`Error: ${event.error}`);
  };

  // Fired when recognition returns one or more transcript alternatives.
  recognition.onresult = (event) => {
    let bestTranscript = "";
    let bestScore = -1;
    let hasFinalResult = false;

    // Scan all new results and choose the best transcript candidate.
    for (
      let resultIndex = event.resultIndex;
      resultIndex < event.results.length;
      resultIndex += 1
    ) {
      const result = event.results[resultIndex];
      if (!result) continue;

      if (result.isFinal) {
        hasFinalResult = true;
      }

      for (let altIndex = 0; altIndex < result.length; altIndex += 1) {
        const altTranscript = result[altIndex].transcript;
        const altScore = scoreCommand(altTranscript);
        if (altScore > bestScore) {
          bestTranscript = altTranscript;
          bestScore = altScore;
        }
      }
    }

    if (bestTranscript && hasFinalResult) {
      processCommand(bestTranscript);
    }
  };
}

// Keep shape within bounds when viewport changes.
window.addEventListener("resize", render);
// Bind UI controls.
toggleBtn.addEventListener("click", toggleListening);

// App bootstrap.
initRecognition();
render();
