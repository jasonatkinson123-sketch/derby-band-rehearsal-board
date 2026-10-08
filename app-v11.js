const DATA_URL = "rehearsals.json";
const REFRESH_INTERVAL = 30000;
const grades = ["6", "7", "8"];

const FULL_78_LIBRARY = [
  "Power",
  "Dragon Slayer",
  "Alpha Squadron",
  "Jester Dance",
  "Midnight Madness",
  "The Might of Hercules",
  "Rise of the Bladesmith",
  "Star Wars",
  "The Tenth Planet",
  "Shine",
  "Falcon's Flight March",
  "Mechanical Monsters",
  "Wrath of the Mechanical Monsters",
  "The Tempest",
  "Valiance",
  "Engines of Resistance",
  "To Conquer the Kraken",
  "Snakebite"
];

const WEEKDAY_THEMES = [
  // Monday — original arcade palette
  { ink: "#11172f", paper: "#f7f1d5", yellow: "#ffd447", pink: "#ff5d8f", cyan: "#48d9d2", blue: "#5067ff", shadow: "#080b19" },
  // Tuesday — slightly warmer / softer
  { ink: "#17202b", paper: "#f5eddc", yellow: "#f6c945", pink: "#ef6f88", cyan: "#65c7c4", blue: "#6177c9", shadow: "#091018" },
  // Wednesday — subtle green cast
  { ink: "#18251f", paper: "#f3efd9", yellow: "#e9c94b", pink: "#e8747e", cyan: "#65c9ad", blue: "#5d77bd", shadow: "#0b1310" },
  // Thursday — subtle plum cast
  { ink: "#241a2b", paper: "#f7efdc", yellow: "#f4c84f", pink: "#ed6f9b", cyan: "#68c8cf", blue: "#6a70d6", shadow: "#100b14" },
  // Friday — charcoal / end-of-week palette
  { ink: "#202028", paper: "#f2ead7", yellow: "#eac94d", pink: "#e66f7e", cyan: "#70c6bf", blue: "#6876bd", shadow: "#0e0e13" }
];

function localDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seedText) {
  let seed = hashString(seedText);
  return () => {
    seed += 0x6D2B79F5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffledForDay(items, seedText) {
  const copy = [...items];
  const random = seededRandom(seedText);
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickForDay(items, seedText) {
  if (!items.length) return "";
  const random = seededRandom(seedText);
  return items[Math.floor(random() * items.length)];
}

function masteredPool(activePieces) {
  const excluded = new Set(activePieces.map(normalizePieceName));
  return FULL_78_LIBRARY.filter(piece => !excluded.has(normalizePieceName(piece)));
}

function buildDailyLists(dayKey) {
  // Keep the familiar opening routine, rotate the music daily.
  const sixth = [
    "Master Note",
    "Beginner Pack",
    ...shuffledForDay(
      ["Power", "Dragon Slayer", "Alpha Squadron", "Jester Dance", "Mechanical Monsters", "Spooky Packet"],
      `${dayKey}|6|music|oct8`
    )
  ];

  const seventhFocus = [
    "Engines of Resistance", "Snakebite", "Valiance",
    "Blinding Lights", "Harrowgate Festival", "The Tempest", "Spooky Packet"
  ];
  const seventhRandom = pickForDay(
    masteredPool([...seventhFocus, "Band Warm-Ups"]),
    `${dayKey}|7|mastered|oct8`
  );
  const seventh = [
    "Master Note", "Beginner", "Band Warm-Ups",
    ...shuffledForDay([...seventhFocus, seventhRandom].filter(Boolean), `${dayKey}|7|order|oct8`),
    "Song Randomizer"
  ];

  const eighth = [
    "Master Note", "Beginner Pack",
    ...shuffledForDay(
      ["Jester Dance", "Alpha Squadron", "Mechanical Monsters",
       "To Conquer the Kraken", "Snakebite", "The Tempest", "Spooky Packet"],
      `${dayKey}|8|order|oct8`
    ),
    "Song Randomizer"
  ];

  return { "6": sixth, "7": seventh, "8": eighth };
}

function applyDailyTheme() {
  const weekday = new Date().toLocaleDateString("en-US", {
    timeZone: CLOCK_TIME_ZONE,
    weekday: "short"
  });
  const weekdayIndex = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4
  }[weekday] ?? 0;

  const theme = WEEKDAY_THEMES[weekdayIndex];
  const root = document.documentElement;
  Object.entries(theme).forEach(([name, value]) => {
    root.style.setProperty(`--${name}`, value);
  });
}

let state = {
  date: "",
  lists: { "6": [], "7": [], "8": [] }
};

const CLOCK_TIME_ZONE = "America/New_York";

function formatDate() {
  const now = new Date();
  document.querySelector("#weekday").textContent = now.toLocaleDateString("en-US", {
    timeZone: CLOCK_TIME_ZONE,
    weekday: "long"
  }).toUpperCase();
  document.querySelector("#full-date").textContent = now.toLocaleDateString("en-US", {
    timeZone: CLOCK_TIME_ZONE,
    month: "long",
    day: "numeric"
  }).toUpperCase();
}

function updateLiveTime() {
  const target = document.querySelector("#live-time");
  if (!target) return;
  target.textContent = new Date().toLocaleTimeString("en-US", {
    timeZone: CLOCK_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).replace(/\s?[AP]M$/, "");
}

function normalizedLists(data) {
  return Object.fromEntries(grades.map(grade => [
    grade,
    Array.isArray(data?.lists?.[grade]) ? data.lists[grade].filter(item => typeof item === "string" && item.trim()) : []
  ]));
}

function normalizePieceName(item) {
  return item.trim().toLowerCase().replace(/\s+/g, " ");
}

function isMasterNote(item) {
  return normalizePieceName(item) === "master note";
}

function isBeginner(item) {
  return normalizePieceName(item).startsWith("beginner");
}

function pieceNoteStorageKey(grade, item) {
  return `derby-piece-note-${grade}-${encodeURIComponent(normalizePieceName(item))}`;
}

function getPieceNote(grade, item) {
  const key = pieceNoteStorageKey(grade, item);
  let value = localStorage.getItem(key) || "";

  // Carry forward the earlier Beginner rehearsal-number field.
  if (!value && normalizePieceName(item) === "beginner") {
    const legacy = localStorage.getItem(`derby-beginner-rehearsal-${grade}`) || "";
    if (legacy) {
      value = legacy;
      localStorage.setItem(key, legacy);
    }
  }

  return value;
}

function setPieceNote(grade, item, value) {
  localStorage.setItem(pieceNoteStorageKey(grade, item), value.trim());
}

const DRONE_DURATION_MS = 4 * 60 * 1000;
const DRONE_FADE_IN_SECONDS = 4;
const DRONE_FADE_OUT_SECONDS = 3;
let currentDrone = null;

function updateDroneButtons() {
  document.querySelectorAll(".master-drone-button").forEach(button => {
    const playing = Boolean(currentDrone);
    button.classList.toggle("is-playing", playing);
    button.setAttribute("aria-pressed", String(playing));
    button.setAttribute(
      "aria-label",
      playing
        ? "Stop Home drone, concert B-flat"
        : "Play Home drone, concert B-flat"
    );
    button.title = playing
      ? "HOME • B♭ DRONE • PRESS TO STOP"
      : "HOME • B♭ DRONE • PRESS TO PLAY";
  });
}

function createMasterDroneButton(extraClass = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `master-drone-button ${extraClass}`.trim();
  button.textContent = "家";
  button.setAttribute("aria-pressed", String(Boolean(currentDrone)));

  button.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    toggleMasterDrone();
  });

  return button;
}

async function startMasterDrone() {
  if (currentDrone) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  if (context.state === "suspended") {
    await context.resume();
  }

  const now = context.currentTime;
  const master = context.createGain();
  const filter = context.createBiquadFilter();
  const compressor = context.createDynamicsCompressor();

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(650, now);
  filter.Q.setValueAtTime(0.7, now);

  compressor.threshold.setValueAtTime(-22, now);
  compressor.knee.setValueAtTime(18, now);
  compressor.ratio.setValueAtTime(3, now);
  compressor.attack.setValueAtTime(0.08, now);
  compressor.release.setValueAtTime(0.8, now);

  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.18, now + DRONE_FADE_IN_SECONDS);

  const fadeStart = now + (DRONE_DURATION_MS / 1000) - 6;
  master.gain.setValueAtTime(0.18, fadeStart);
  master.gain.exponentialRampToValueAtTime(0.0001, now + (DRONE_DURATION_MS / 1000));

  filter.connect(master);
  master.connect(compressor);
  compressor.connect(context.destination);

  const voices = [
    { frequency: 58.2705, type: "sine", gain: 0.50, detune: 0 },
    { frequency: 116.541, type: "sine", gain: 0.38, detune: 0 },
    { frequency: 116.541, type: "triangle", gain: 0.08, detune: -3 },
    { frequency: 233.082, type: "sine", gain: 0.04, detune: 2 }
  ];

  const oscillators = voices.map(voice => {
    const oscillator = context.createOscillator();
    const voiceGain = context.createGain();
    oscillator.type = voice.type;
    oscillator.frequency.setValueAtTime(voice.frequency, now);
    oscillator.detune.setValueAtTime(voice.detune, now);
    voiceGain.gain.setValueAtTime(voice.gain, now);
    oscillator.connect(voiceGain);
    voiceGain.connect(filter);
    oscillator.start(now);
    oscillator.stop(now + (DRONE_DURATION_MS / 1000) + 0.25);
    return oscillator;
  });

  const drone = { context, master, oscillators, timeoutId: null };
  currentDrone = drone;

  drone.timeoutId = window.setTimeout(() => {
    if (currentDrone === drone) {
      currentDrone = null;
      updateDroneButtons();
    }
    window.setTimeout(() => context.close().catch(() => {}), 400);
  }, DRONE_DURATION_MS);

  updateDroneButtons();
}

function stopMasterDrone() {
  if (!currentDrone) return;

  const drone = currentDrone;
  currentDrone = null;
  window.clearTimeout(drone.timeoutId);

  const now = drone.context.currentTime;
  const gain = drone.master.gain;
  if (typeof gain.cancelAndHoldAtTime === "function") {
    gain.cancelAndHoldAtTime(now);
  } else {
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(Math.max(gain.value, 0.0001), now);
  }
  gain.exponentialRampToValueAtTime(0.0001, now + DRONE_FADE_OUT_SECONDS);

  drone.oscillators.forEach(oscillator => {
    try {
      oscillator.stop(now + DRONE_FADE_OUT_SECONDS + 0.15);
    } catch (error) {
      // Already scheduled to stop.
    }
  });

  window.setTimeout(() => {
    drone.context.close().catch(() => {});
  }, (DRONE_FADE_OUT_SECONDS + 0.4) * 1000);

  updateDroneButtons();
}

function toggleMasterDrone() {
  if (currentDrone) {
    stopMasterDrone();
  } else {
    startMasterDrone().catch(error => console.error("Unable to start B-flat drone:", error));
  }
}

function render() {
  const focused = document.activeElement?.classList?.contains("piece-note-input")
    ? {
        grade: document.activeElement.dataset.grade,
        piece: document.activeElement.dataset.piece,
        start: document.activeElement.selectionStart,
        end: document.activeElement.selectionEnd
      }
    : null;

  grades.forEach(grade => {
    const list = document.querySelector(`#list-${grade}`);
    const empty = document.querySelector(`#empty-${grade}`);
    const count = document.querySelector(`#count-${grade}`);
    const items = state.lists[grade];

    list.replaceChildren(...items.map(item => {
      const li = document.createElement("li");

      const title = document.createElement("span");
      title.className = "set-list-title";
      title.textContent = item;

      li.append(title);

      if (isMasterNote(item)) {
        li.classList.add("master-note-row");
        li.append(createMasterDroneButton());
      } else {
        const control = document.createElement("label");
        control.className = "piece-note-control";

        const controlLabel = document.createElement("span");
        controlLabel.textContent = isBeginner(item) ? "NUMBER" : "MEAS.";

        const input = document.createElement("input");
        input.className = "piece-note-input";
        input.type = "text";
        input.maxLength = 28;
        input.placeholder = "";
        input.value = getPieceNote(grade, item);
        input.dataset.grade = grade;
        input.dataset.piece = item;
        input.setAttribute("aria-label", `${grade}th grade ${item} measure numbers`);

        input.addEventListener("input", () => {
          setPieceNote(grade, item, input.value);
        });

        control.append(controlLabel, input);
        li.append(control);
      }
      return li;
    }));

    list.hidden = items.length === 0;
    empty.hidden = items.length > 0;
    count.textContent = `${items.length} ${items.length === 1 ? "ITEM" : "ITEMS"}`;
  });

  updateDroneButtons();

  if (focused) {
    const inputs = [...document.querySelectorAll(".piece-note-input")];
    const restored = inputs.find(input =>
      input.dataset.grade === focused.grade &&
      input.dataset.piece === focused.piece
    );
    if (restored) {
      restored.focus();
      if (typeof focused.start === "number" && typeof focused.end === "number") {
        restored.setSelectionRange(focused.start, focused.end);
      }
    }
  }
}
function setStatus(message, online) {
  const status = document.querySelector("#live-status");
  status.lastChild.textContent = ` ${message}`;
  status.classList.toggle("is-online", online);
}

async function refreshBoard() {
  const dayKey = localDayKey();
  applyDailyTheme();
  state = { date: dayKey, lists: buildDailyLists(dayKey) };
  render();
  renderGradeOverlay();
  setStatus("AUTO • DAILY MIX", true);
}


let activeGrade = null;

const gradeOverlay = document.querySelector("#grade-overlay");
const gradeOverlayNumber = document.querySelector("#grade-overlay-number");
const gradeOverlayList = document.querySelector("#grade-overlay-list");
const gradeOverlayEmpty = document.querySelector("#grade-overlay-empty");
const gradeClose = document.querySelector("#grade-close");
const gradeOpenButtons = document.querySelectorAll(".grade-open-button");

const gradeAccents = {
  "6": "var(--yellow)",
  "7": "var(--pink)",
  "8": "var(--cyan)"
};

function renderGradeOverlay() {
  if (!activeGrade) return;
  const items = state.lists[activeGrade] || [];

  gradeOverlayNumber.textContent = activeGrade;
  gradeOverlay.style.setProperty("--grade-accent", gradeAccents[activeGrade] || "var(--yellow)");

  const readySlide = document.createElement("li");
  readySlide.className = "grade-ready-slide";

  const star = document.createElement("span");
  star.className = "grade-ready-star";
  star.textContent = "★";

  const readyText = document.createElement("span");
  readyText.className = "grade-ready-text";
  readyText.textContent = "READY FOR TODAY'S MUSIC";

  const hint = document.createElement("span");
  hint.className = "grade-scroll-hint";
  hint.textContent = items.length ? "SCROLL FOR REHEARSAL" : "READY";

  readySlide.append(star, readyText, hint);

  const pieceSlides = items.map(item => {
    const li = document.createElement("li");
    const title = document.createElement("span");
    title.className = "grade-piece-title";
    title.textContent = item;
    li.append(title);

    if (isMasterNote(item)) {
      li.classList.add("grade-master-note-slide");
      li.append(createMasterDroneButton("master-drone-button-large"));
    }

    const note = isMasterNote(item) ? "" : getPieceNote(activeGrade, item);
    if (note) {
      const subtitle = document.createElement("span");
      subtitle.className = "grade-piece-subtitle";
      subtitle.textContent = isBeginner(item) ? `NUMBER ${note}` : `MEASURES ${note}`;
      li.append(subtitle);
    }

    return li;
  });

  gradeOverlayList.replaceChildren(readySlide, ...pieceSlides);
  gradeOverlayList.hidden = false;
  gradeOverlayEmpty.hidden = true;
  updateDroneButtons();
}
function openGrade(grade) {
  activeGrade = grade;
  renderGradeOverlay();
  gradeOverlay.hidden = false;
  gradeOverlayList.scrollTop = 0;
  document.body.classList.add("routine-open");
  gradeClose.focus();
}

function closeGrade() {
  gradeOverlay.hidden = true;
  activeGrade = null;
  document.body.classList.remove("routine-open");
}

gradeOpenButtons.forEach(button => {
  button.addEventListener("click", () => openGrade(button.dataset.grade));
});

gradeClose.addEventListener("click", closeGrade);

const routineOverlay = document.querySelector("#routine-overlay");
const routineOverlayNumber = document.querySelector("#routine-overlay-number");
const routineOverlayLabel = document.querySelector("#routine-overlay-label");
const routineClose = document.querySelector("#routine-close");
const routinePrev = document.querySelector("#routine-prev");
const routineNext = document.querySelector("#routine-next");
const routineSteps = [...document.querySelectorAll(".routine-step, .action-step")];
let activeRoutineIndex = -1;

const routineAccents = {
  yellow: "var(--yellow)",
  red: "#e32f3f",
  pink: "var(--pink)",
  cyan: "var(--cyan)"
};

function showRoutineAt(index, focusClose = false) {
  if (!routineSteps.length) return;
  activeRoutineIndex = (index + routineSteps.length) % routineSteps.length;
  const stepButton = routineSteps[activeRoutineIndex];
  const step = stepButton.dataset.step || "";
  routineOverlayNumber.textContent = step;
  routineOverlayNumber.classList.toggle("is-hidden", !step);
  routineOverlayLabel.textContent = stepButton.dataset.label || "";
  routineOverlay.style.setProperty("--routine-accent", routineAccents[stepButton.dataset.accent] || "var(--yellow)");
  routineOverlay.hidden = false;
  document.body.classList.add("routine-open");
  if (focusClose) routineClose.focus();
}

function openRoutine(stepButton) {
  const index = routineSteps.indexOf(stepButton);
  showRoutineAt(index >= 0 ? index : 0, true);
}

function pageRoutine(direction) {
  if (routineOverlay.hidden || !routineSteps.length) return;
  showRoutineAt(activeRoutineIndex + direction, false);
}

function closeRoutine() {
  routineOverlay.hidden = true;
  activeRoutineIndex = -1;
  document.body.classList.remove("routine-open");
}

routineSteps.forEach(step => step.addEventListener("click", () => openRoutine(step)));
routineClose.addEventListener("click", closeRoutine);
routinePrev?.addEventListener("click", () => pageRoutine(-1));
routineNext?.addEventListener("click", () => pageRoutine(1));
document.addEventListener("keydown", event => {
  if (!routineOverlay.hidden && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
    event.preventDefault();
    pageRoutine(event.key === "ArrowLeft" ? -1 : 1);
    return;
  }
  if (event.key !== "Escape") return;
  if (!routineOverlay.hidden) closeRoutine();
  if (!gradeOverlay.hidden) closeGrade();
});

formatDate();
updateLiveTime();
render();
refreshBoard();
setInterval(updateLiveTime, 1000);
setInterval(refreshBoard, REFRESH_INTERVAL);
