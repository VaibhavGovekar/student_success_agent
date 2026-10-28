
const API_BASE = "http://127.0.0.1:8000";
let STUDENT_ID = null;
const STORAGE_KEY = "studentSuccessSkillPathProgress";

// Fallback values for skills not saved in the database yet
const mySkills = {
  HTML: 80,
  CSS: 70,
  JavaScript: 45,
  Python: 60,
  React: 15,
  Git: 50,
  SQL: 30,
  "Node.js": 10,
  DSA: 40
};

const roles = {
  "Frontend Developer": {
    HTML: 90, CSS: 85, JavaScript: 80, React: 70, Git: 60
  },
  "Backend Developer": {
    Python: 75, "Node.js": 70, SQL: 70, Git: 60, DSA: 60
  },
  "Data Analyst": {
    Python: 80, SQL: 80, DSA: 50, Git: 40
  }
};

// Preserve roadmap progress across refreshes
let done = {};

try {
  done = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
} catch {
  done = {};
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(done));
}

const roleSelect = document.getElementById("role");

Object.keys(roles).forEach(role => {
  const option = document.createElement("option");
  option.value = role;
  option.textContent = role;
  roleSelect.appendChild(option);
});

// ---------- API ----------
async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;

    try {
      const error = await response.json();
      message = error.detail || message;
    } catch {}

    throw new Error(message);
  }

  return response.json();
}

function showMessage(message, isError = false) {
  let element = document.getElementById("skillMessage");

  if (!element) {
    element = document.createElement("p");
    element.id = "skillMessage";
    element.setAttribute("role", "status");
    document.querySelector(".role-pick").after(element);
  }

  element.textContent = message;
  element.style.color = isError ? "#ff7777" : "#65d6a6";
}

// ---------- Load saved skills ----------
async function loadSkillsFromAPI() {
  try {
    const students = await apiRequest("/students");
    if (!students.length) throw new Error("Create a student profile before syncing skills.");
    STUDENT_ID = students[0].id;
    const savedSkills = await apiRequest(
      `/students/${STUDENT_ID}/skills`
    );

    savedSkills.forEach(item => {
      mySkills[item.skill_name] = item.proficiency;
    });

    render();
    showMessage("Skills loaded from the database.");
  } catch (error) {
    console.error("Could not load skills:", error);
    showMessage(
      `Could not load saved skills: ${error.message}`,
      true
    );
  }
}

// ---------- Render skill comparisons ----------
function render() {
  const role = roleSelect.value;
  const required = roles[role];

  document.getElementById("skills").innerHTML =
    Object.entries(required).map(([skill, need]) => {
      const have = mySkills[skill] ?? 0;

      return `
        <div class="skill-row">
          <div class="top">
            <span>${skill}</span>
            <span class="muted">${have}% / ${need}% required</span>
          </div>

          <div class="bar">
            <div class="bar-fill ${have >= need ? "ok" : ""}"
                 style="width:${have}%"></div>
            <div class="bar-target" style="left:${need}%"></div>
          </div>

          <div class="skill-edit" style="display:flex; gap:8px; margin-top:8px;">
            <label for="${skillInputId(skill)}">Your level (0–100):</label>
            <input
              id="${skillInputId(skill)}"
              type="number"
              min="0"
              max="100"
              step="1"
              value="${have}"
              style="width:75px;"
            >
            <button class="btn" data-save-skill="${skill}">Save</button>
          </div>
        </div>
      `;
    }).join("");

  // Skill gaps: biggest first
  const gaps = Object.entries(required)
    .map(([skill, need]) => ({
      skill,
      have: mySkills[skill] ?? 0,
      need,
      gap: need - (mySkills[skill] ?? 0)
    }))
    .filter(item => item.gap > 0)
    .sort((a, b) => b.gap - a.gap);

  document.getElementById("gaps").innerHTML = gaps.length
    ? gaps.map(item => {
        const level =
          item.gap >= 40 ? "danger" :
          item.gap >= 20 ? "warning" : "success";

        return `
          <li>
            <span>${item.skill}</span>
            <span class="tag ${level}">-${item.gap}%</span>
          </li>
        `;
      }).join("")
    : `<li><span>No gaps. You're ready for this role!</span></li>`;

  // Learning roadmap
  const roadmap = document.getElementById("roadmap");
  roadmap.replaceChildren();

  gaps.forEach(item => {
    const key = `${role}|${item.skill}`;
    const weeks = Math.ceil(item.gap / 15);
    const li = document.createElement("li");

    li.className = "clickable" + (done[key] ? " done" : "");
    li.innerHTML = `
      <span>${done[key] ? "✅" : "⬜"}
        Learn ${item.skill}: ${item.have}% → ${item.need}%
      </span>
      <span class="tag">~${weeks} wk</span>
    `;

    li.addEventListener("click", () => {
      done[key] = !done[key];
      saveProgress();
      render();
    });

    roadmap.appendChild(li);
  });

  const total = gaps.length;
  const finished = gaps.filter(
    item => done[`${role}|${item.skill}`]
  ).length;

  const percent = total
    ? Math.round(finished / total * 100)
    : 100;

  document.getElementById("roadmapBar").style.width =
    `${percent}%`;

  document.getElementById("roadmapText").textContent =
    `${finished}/${total} steps done`;
}

// Make an input ID safe and consistent
function skillInputId(skill) {
  return "skill-level-" + skill.replace(/[^a-zA-Z0-9]/g, "-");
}

// ---------- Save proficiency to SQLite via FastAPI ----------
document.getElementById("skills").addEventListener("click", async event => {
  const button = event.target.closest("[data-save-skill]");
  if (!button) return;

  const skill = button.dataset.saveSkill;
  const input = document.getElementById(skillInputId(skill));
  const proficiency = Number(input.value);

  if (
    input.value.trim() === "" ||
    !Number.isInteger(proficiency) ||
    proficiency < 0 ||
    proficiency > 100
  ) {
    showMessage("Enter a whole number from 0 to 100.", true);
    return;
  }

  button.disabled = true;

  try {
    if (!STUDENT_ID) throw new Error("Student profile is not loaded yet.");
    await apiRequest(`/students/${STUDENT_ID}/skills`, {
      method: "POST",
      body: JSON.stringify({ skill_name: skill, proficiency })
    });

    mySkills[skill] = proficiency;
    render();
    showMessage(`${skill} proficiency saved to the database.`);
  } catch (error) {
    console.error("Could not save skill:", error);
    showMessage(`Could not save ${skill}: ${error.message}`, true);
  } finally {
    button.disabled = false;
  }
});

roleSelect.addEventListener("change", render);

render();
loadSkillsFromAPI();
