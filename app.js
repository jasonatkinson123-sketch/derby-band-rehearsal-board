const STORAGE_KEY = "derby-band-rehearsals-v1";
const grades = ["6", "7", "8"];

const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const blankState = () => ({
  date: todayKey(),
  lists: { "6": [], "7": [], "8": [] }
});

function loadBoardState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !saved.lists) return blankState();
    return {
      date: saved.date || todayKey(),
      lists: Object.fromEntries(grades.map(grade => [grade, Array.isArray(saved.lists[grade]) ? saved.lists[grade] : []]))
    };
  } catch {
    return blankState();
  }
}

function saveBoardState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadBoardState();

function formatDate() {
  const now = new Date();
  document.querySelector("#weekday").textContent = now.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
  document.querySelector("#full-date").textContent = now.toLocaleDateString("en-US", { month: "long", day: "numeric" }).toUpperCase();
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

function populateEditor() {
  grades.forEach(grade => {
    document.querySelector(`#edit-${grade}`).value = state.lists[grade].join("\n");
  });
}

function parseLines(value) {
  return value.split("\n").map(line => line.trim()).filter(Boolean);
}

const editor = document.querySelector("#editor");
const editButton = document.querySelector("#edit-button");

editButton.addEventListener("click", () => {
  populateEditor();
  editor.showModal();
  editButton.setAttribute("aria-expanded", "true");
});

editor.addEventListener("close", () => editButton.setAttribute("aria-expanded", "false"));

document.querySelector("#editor-form").addEventListener("submit", event => {
  if (event.submitter?.value !== "save") return;
  event.preventDefault();
  state = {
    date: todayKey(),
    lists: Object.fromEntries(grades.map(grade => [grade, parseLines(document.querySelector(`#edit-${grade}`).value)]))
  };
  saveBoardState(state);
  render();
  editor.close("save");
});

document.querySelector("#clear-button").addEventListener("click", () => {
  grades.forEach(grade => { document.querySelector(`#edit-${grade}`).value = ""; });
});

editor.addEventListener("click", event => {
  if (event.target === editor) editor.close("cancel");
});

formatDate();
render();
