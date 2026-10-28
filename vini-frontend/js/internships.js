const API_BASE = "http://127.0.0.1:8000";
let CURRENT_USER_ID = null;
let currentStudent = null;

// Fallback skills if user hasn't synced with database yet
let mySkills = {
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

const HAVE_LEVEL = 40;
let internships = [];
let saved = {};

try {
  saved = JSON.parse(localStorage.getItem("savedInternships") || "{}");
} catch {
  saved = {};
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

async function loadInternships() {
  const grid = document.getElementById("internships");
  const count = document.getElementById("count");

  grid.innerHTML = '<p class="muted">Loading internships...</p>';

  try {
    const studentsResponse = await fetch(`${API_BASE}/students`);
    if (!studentsResponse.ok) throw new Error(`Could not load students (${studentsResponse.status})`);
    const students = await studentsResponse.json();
    currentStudent = students[0];
    if (!currentStudent) throw new Error("Create a student profile before requesting internship matches.");
    CURRENT_USER_ID = currentStudent.id;
    const skillsResponse = await fetch(`${API_BASE}/students/${CURRENT_USER_ID}/skills`);
    if (skillsResponse.ok) {
      const savedSkills = await skillsResponse.json();
      Object.keys(mySkills).forEach(skill => delete mySkills[skill]);
      savedSkills.forEach(skill => { mySkills[skill.skill_name] = skill.proficiency; });
    }

    const response = await fetch(`${API_BASE}/internships/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: CURRENT_USER_ID,
        student_cgpa: Number(currentStudent.cgpa ?? currentStudent.current_cgpa ?? 0),
        match_count: 50
      })
    });
    if (!response.ok) {
      const failure = await response.json().catch(() => ({}));
      throw new Error(failure.detail || `Semantic match request failed (${response.status})`);
    }
    const data = await response.json();
    internships = data.matches;
    if (!Array.isArray(internships)) throw new Error("Unexpected response from internship matching API.");

    render();
  } catch (error) {
    console.error("Internship loading error:", error);
    count.textContent = "Unable to load internships";
    grid.innerHTML = `
      <p class="muted">${escapeHTML(error.message)}. Check the backend, student profile, Gemini key, and internship embeddings.</p>`;
  }
}

function render() {
  const searchInput = document.getElementById("search");
  const modeSelect = document.getElementById("mode");
  const minMatchInput = document.getElementById("minMatch");
  const savedOnlyCheck = document.getElementById("savedOnly");

  const q = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const mode = modeSelect ? modeSelect.value : "All";
  const minMatch = minMatchInput ? Number(minMatchInput.value) : 0;
  const savedOnly = savedOnlyCheck ? savedOnlyCheck.checked : false;

  const list = internships
    .map(item => ({
      ...item,
      displayTitle: item.role || item.title || "Software Intern",
      match: Math.round(Number(item.similarity || 0) * 100)
    }))
    .filter(item =>
      (`${item.displayTitle} ${item.company || ""}`).toLowerCase().includes(q) &&
      (mode === "All" || !item.mode || item.mode === mode) &&
      item.match >= minMatch &&
      (!savedOnly || saved[item.id])
    )
    .sort((a, b) => b.match - a.match);

  const countEl = document.getElementById("count");
  if (countEl) {
    countEl.textContent = `${list.length} internship(s) found`;
  }

  const grid = document.getElementById("internships");
  grid.replaceChildren();

  if (!list.length) {
    grid.innerHTML = '<p class="muted">No internships match your filters.</p>';
    return;
  }

  list.forEach(item => {
    const level = item.match >= 75 ? "high" : item.match >= 50 ? "mid" : "low";
    const skills = Array.isArray(item.skills) 
      ? item.skills 
      : (Array.isArray(item.required_skills) ? item.required_skills : []);

    const chips = skills.map(skill => {
      const has = (mySkills[skill] || 0) >= HAVE_LEVEL;
      return `
        <span class="chip ${has ? "have" : "miss"}">
          ${has ? "✓" : "✗"} ${escapeHTML(skill)}
        </span>`;
    }).join("");

    const card = document.createElement("div");
    card.className = "intern-card";

    card.innerHTML = `
      <div class="intern-head">
        <div>
          <h4>${escapeHTML(item.displayTitle)}</h4>
          <div class="company">${escapeHTML(item.company || "Hiring Partner")}</div>
        </div>
        <span class="match ${level}">${item.match}% match</span>
      </div>

      <div class="meta">
        📍 ${escapeHTML(item.location || "Remote")}
        · ${escapeHTML(item.mode || "Internship")}
        · 💰 ${escapeHTML(item.stipend || "Competitive")}
      </div>

      <p>${escapeHTML(item.role_description || "")}</p>

      <div class="chips">${chips}</div>

      <div class="card-actions">
        <button class="btn" data-apply="${item.id}">Apply</button>
        <button class="btn ghost ${saved[item.id] ? "saved" : ""}"
                data-save="${item.id}">
          ${saved[item.id] ? "★ Saved" : "☆ Save"}
        </button>
      </div>`;

    grid.appendChild(card);
  });
}

// Handle Save and Apply buttons
document.getElementById("internships").addEventListener("click", event => {
  const saveButton = event.target.closest("[data-save]");
  const applyButton = event.target.closest("[data-apply]");

  if (saveButton) {
    const id = saveButton.dataset.save;
    saved[id] = !saved[id];
    if (!saved[id]) delete saved[id];
    localStorage.setItem("savedInternships", JSON.stringify(saved));
    render();
    return;
  }

  if (applyButton) {
    const id = applyButton.dataset.apply;
    const item = internships.find(internship => String(internship.id) === String(id));

    if (!item) return;

    if (item.application_url) {
      window.open(item.application_url, "_blank", "noopener,noreferrer");
    } else {
      alert("Application portal link will open once published by recruiter.");
    }
  }
});

// Search and filter listeners
["search", "mode", "minMatch", "savedOnly"].forEach(id => {
  const element = document.getElementById(id);
  if (element) {
    element.addEventListener("input", render);
    element.addEventListener("change", render);
  }
});

loadInternships();
