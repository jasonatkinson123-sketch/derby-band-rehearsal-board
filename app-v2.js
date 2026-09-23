const DATA_URL = "rehearsals.json";
const REFRESH_INTERVAL = 30000;
const grades = ["6", "7", "8"];

let state = {
  date: "",
  lists: { "6": [], "7": [], "8": [] }
};

function formatDate() {
  const now = new Date();
  document.querySelector("#weekday").textContent = now.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
  document.querySelector("#full-date").textContent = now.toLocaleDateString("en-US", { month: "long", day: "numeric" }).toUpperCase();
}

function normalizedLists(data) {
  return Object.fromEntries(grades.map(grade => [
    grade,
    Array.isArray(data?.lists?.[grade]) ? data.lists[grade].filter(item => typeof item === "string" && item.trim()) : []
  ]));
}

function render() {
  grades.forEach(grade => {
    const list = document.querySelector(`#list-${grade}`);
    const empty = document.querySelector(`#empty-${grade}`);
    const count = document.querySelector(`#count-${grade}`);
    const items = state.lists[grade];

    list.replaceChildren(...items.map(item => {
      const li = document.createElement("li");
      li.textContent = item;
      return li;
    }));

    list.hidden = items.length === 0;
    empty.hidden = items.length > 0;
    count.textContent = `${items.length} ${items.length === 1 ? "ITEM" : "ITEMS"}`;
  });
}

function setStatus(message, online) {
  const status = document.querySelector("#live-status");
  status.lastChild.textContent = ` ${message}`;
  status.classList.toggle("is-online", online);
}

async function refreshBoard() {
  try {
    const response = await fetch(`${DATA_URL}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Unable to load rehearsal data (${response.status})`);
    const data = await response.json();
    state = { date: data.date || "", lists: normalizedLists(data) };
    render();
    renderGradeOverlay();
    setStatus("LIVE • AUTO REFRESH", true);
  } catch (error) {
    console.error(error);
    setStatus("RETRYING CONNECTION", false);
  }
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
  gradeOverlayList.replaceChildren(...items.map(item => {
    const li = document.createElement("li");
    li.textContent = item;
    return li;
  }));

  gradeOverlayList.hidden = items.length === 0;
  gradeOverlayEmpty.hidden = items.length > 0;
}

function openGrade(grade) {
  activeGrade = grade;
  renderGradeOverlay();
  gradeOverlay.hidden = false;
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
const routineSteps = document.querySelectorAll(".routine-step, .action-step");

const routineAccents = {
  yellow: "var(--yellow)",
  red: "#e32f3f",
  pink: "var(--pink)",
  cyan: "var(--cyan)"
};

function openRoutine(stepButton) {
  const step = stepButton.dataset.step || "";
  routineOverlayNumber.textContent = step;
  routineOverlayNumber.classList.toggle("is-hidden", !step);
  routineOverlayLabel.textContent = stepButton.dataset.label || "";
  routineOverlay.style.setProperty("--routine-accent", routineAccents[stepButton.dataset.accent] || "var(--yellow)");
  routineOverlay.hidden = false;
  document.body.classList.add("routine-open");
  routineClose.focus();
}

function closeRoutine() {
  routineOverlay.hidden = true;
  document.body.classList.remove("routine-open");
}

routineSteps.forEach(step => step.addEventListener("click", () => openRoutine(step)));
routineClose.addEventListener("click", closeRoutine);
document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  if (!routineOverlay.hidden) closeRoutine();
  if (!gradeOverlay.hidden) closeGrade();
});

formatDate();
render();
refreshBoard();
setInterval(refreshBoard, REFRESH_INTERVAL);
