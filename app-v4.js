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

function beginnerStorageKey(grade) {
  return `derby-beginner-rehearsal-${grade}`;
}

function getBeginnerNumber(grade) {
  return localStorage.getItem(beginnerStorageKey(grade)) || "";
}

function isBeginner(item) {
  return item.trim().toLowerCase() === "beginner";
}

function render() {
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

      if (isBeginner(item)) {
        const control = document.createElement("label");
        control.className = "beginner-number-control";

        const controlLabel = document.createElement("span");
        controlLabel.textContent = "REH #";

        const input = document.createElement("input");
        input.className = "beginner-number-input";
        input.type = "text";
        input.inputMode = "numeric";
        input.maxLength = 8;
        input.placeholder = "—";
        input.value = getBeginnerNumber(grade);
        input.setAttribute("aria-label", `${grade}th grade Beginner rehearsal number`);

        input.addEventListener("input", () => {
          localStorage.setItem(beginnerStorageKey(grade), input.value.trim());
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

    if (isBeginner(item)) {
      const rehearsalNumber = getBeginnerNumber(activeGrade);
      if (rehearsalNumber) {
        const subtitle = document.createElement("span");
        subtitle.className = "grade-piece-subtitle";
        subtitle.textContent = `REHEARSAL ${rehearsalNumber}`;
        li.append(subtitle);
      }
    }

    return li;
  });

  gradeOverlayList.replaceChildren(readySlide, ...pieceSlides);
  gradeOverlayList.hidden = false;
  gradeOverlayEmpty.hidden = true;
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
