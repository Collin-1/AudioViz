const shapeEl = document.getElementById("shape");
const toggleBtn = document.getElementById("toggleListen");
const statusEl = document.getElementById("status");
const lastCommandEl = document.getElementById("lastCommand");
const stageEl = document.getElementById("stage");

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;
let listening = false;

const state = {
  x: 180,
  y: 150,
  size: 90,
  shape: "circle",
  color: "red",
};

const COLORS = ["red", "blue", "green", "yellow", "purple"];
const SHAPES = ["circle", "square"];

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
  const command = rawCommand.toLowerCase().trim();
  if (!command) return;

  lastCommandEl.textContent = command;

  for (const color of COLORS) {
    if (command.includes(color)) {
      state.color = color;
      break;
    }
  }

  for (const shape of SHAPES) {
    if (command.includes(shape)) {
      state.shape = shape;
      break;
    }
  }

  if (command.includes("move left")) moveBy(-35, 0);
  if (command.includes("move right")) moveBy(35, 0);
  if (command.includes("move up")) moveBy(0, -35);
  if (command.includes("move down")) moveBy(0, 35);

  if (command.includes("bigger")) state.size = clamp(state.size + 15, 30, 220);
  if (command.includes("smaller")) state.size = clamp(state.size - 15, 30, 220);

  if (command.includes("reset")) resetState();

  if (command.includes("stop listening")) {
    stopListening();
  }

  if (command.includes("start listening")) {
    startListening();
  }

  render();
}

function startListening() {
  if (!recognition || listening) return;
  recognition.start();
}

function stopListening() {
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
  };

  recognition.onerror = (event) => {
    setStatus(`Error: ${event.error}`);
  };

  recognition.onresult = (event) => {
    const result = event.results[event.results.length - 1];
    const transcript = result[0].transcript;
    processCommand(transcript);
  };
}

window.addEventListener("resize", render);
toggleBtn.addEventListener("click", toggleListening);

initRecognition();
render();
