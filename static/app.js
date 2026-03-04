const shapeEl = document.getElementById("shape");
const toggleBtn = document.getElementById("toggleListen");
const statusEl = document.getElementById("status");
const lastCommandEl = document.getElementById("lastCommand");
const recognizedIntentsEl = document.getElementById("recognizedIntents");
const stageEl = document.getElementById("stage");

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;
let listening = false;
let shouldKeepListening = false;

const state = {
  x: 180,
  y: 150,
  size: 90,
  shape: "circle",
  color: "red",
};

const COLORS = ["red", "blue", "green", "yellow", "purple"];
const SHAPES = ["circle", "square"];
const MOVE_WORDS = ["move", "go", "shift", "slide"];

const DIRECTION_ALIASES = {
  left: ["left"],
  right: ["right", "write", "rite"],
  up: ["up", "top"],
  down: ["down", "bottom"],
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

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

function updateRecognizedIntents(tags) {
  if (!recognizedIntentsEl) return;
  recognizedIntentsEl.textContent = tags.length ? tags.join(" | ") : "none";
}

function normalizeCommand(rawCommand) {
  return rawCommand
    .toLowerCase()
    .replace(/[.,!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAnyWord(command, words) {
  return words.some((word) => command.includes(word));
}

function containsAlias(command, aliases) {
  const escapedAliases = aliases
    .map((alias) => alias.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"))
    .join("|");
  const pattern = new RegExp(`\\b(?:${escapedAliases})\\b`);
  return pattern.test(command);
}

function getDirections(command) {
  const directions = [];
  for (const [direction, aliases] of Object.entries(DIRECTION_ALIASES)) {
    if (containsAlias(command, aliases)) {
      directions.push(direction);
    }
  }
  return directions;
}

function shouldMove(command, directions) {
  if (directions.length === 0) return false;
  return (
    hasAnyWord(command, MOVE_WORDS) ||
    command.includes(" to ") ||
    directions.length > 0
  );
}

function shouldJumpToEdge(command) {
  return hasAnyWord(command, ["far", "edge", "all the way", "max"]);
}

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

function movementStep(command) {
  if (hasAnyWord(command, ["far", "lot", "more"])) {
    return 80;
  }

  if (hasAnyWord(command, ["slight", "little", "tiny", "bit"])) {
    return 20;
  }

  return 40;
}

function moveBy(dx, dy) {
  state.x += dx;
  state.y += dy;
}

function resetState() {
  state.x = 180;
  state.y = 150;
  state.size = 90;
  state.shape = "circle";
  state.color = "red";
}

function processCommand(rawCommand) {
  const command = normalizeCommand(rawCommand);
  if (!command) return;

  lastCommandEl.textContent = command;
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

function startListening() {
  if (!recognition || listening) return;
  shouldKeepListening = true;
  recognition.start();
}

function stopListening() {
  shouldKeepListening = false;
  if (!recognition || !listening) return;
  recognition.stop();
}

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

function initRecognition() {
  if (!SpeechRecognition) {
    setStatus("Web Speech API not supported");
    toggleBtn.disabled = true;
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onstart = () => {
    listening = true;
    setStatus("Listening...");
    toggleBtn.textContent = "Stop Listening";
  };

  recognition.onend = () => {
    listening = false;
    setStatus("Idle");
    toggleBtn.textContent = "Start Listening";

    if (shouldKeepListening) {
      setStatus("Reconnecting...");
      setTimeout(() => {
        if (!listening && shouldKeepListening) {
          recognition.start();
        }
      }, 250);
    }
  };

  recognition.onerror = (event) => {
    if (
      event.error === "not-allowed" ||
      event.error === "service-not-allowed"
    ) {
      shouldKeepListening = false;
    }
    setStatus(`Error: ${event.error}`);
  };

  recognition.onresult = (event) => {
    const result = event.results[event.resultIndex];

    let bestTranscript = result[0].transcript;
    let bestScore = scoreCommand(bestTranscript);

    for (let i = 1; i < result.length; i += 1) {
      const altTranscript = result[i].transcript;
      const altScore = scoreCommand(altTranscript);
      if (altScore > bestScore) {
        bestTranscript = altTranscript;
        bestScore = altScore;
      }
    }

    processCommand(bestTranscript);
  };
}

window.addEventListener("resize", render);
toggleBtn.addEventListener("click", toggleListening);

initRecognition();
render();
