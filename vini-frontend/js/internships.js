const API_BASE = "http://127.0.0.1:8000";
const CURRENT_USER_ID = "00000000-0000-0000-0000-000000000000";

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

function calcMatch(item) {
  const skills = Array.isArray(item.skills) 
    ? item.skills 
    : (Array.isArray(item.required_skills) ? item.required_skills : []);

  if (!skills.length) return 70; // Baseline match when skill tags aren't specified

  const matched = skills.filter(
    skill => (mySkills[skill] || 0) >= HAVE_LEVEL
  ).length;

  return Math.round((matched / skills.length) * 100);
}

async function loadInternships() {
  const grid = document.getElementById("internships");
  const count = document.getElementById("count");

  grid.innerHTML = '<p class="muted">Loading internships...</p>';

  try {
    const response = await fetch(`${API_BASE}/internships?limit=50`);

    if (!response.ok) {
      throw new Error(`API request failed (${response.status})`);
    }

    const data = await response.json();

    // Support both { internships: [...] } and raw array responses
    internships = Array.isArray(data) ? data : (data.internships || []);

    if (!Array.isArray(internships)) {
      throw new Error("Unexpected response structure from internship API.");
    }

    render();
  } catch (error) {
    console.error("Internship loading error:", error);
    count.textContent = "Unable to load internships";
    grid.innerHTML = `
      <p class="muted">
        Could not load internships. Check that the backend is running at ${API_BASE}
        and GET /internships works in Swagger.
      </p>`;
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
      match: item.similarity ? Math.round(item.similarity * 100) : calcMatch(item)
    }))
    .filter(item =>
      (`${item.displayTitle} ${item.company || ""}`).toLowerCase().includes(q) &&
      (mode === "All" || item.mode === mode) &&
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