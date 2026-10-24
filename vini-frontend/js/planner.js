const API_BASE_URL = "http://127.0.0.1:8000";
// Replace with the active student UUID or load dynamically from session/auth
const CURRENT_USER_ID = "00000000-0000-0000-0000-000000000000";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

let tasks = [];
let today = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1; // Real day index (Mon=0..Sun=6)
let logs = ["Connecting to API..."];

const todaySelect = document.getElementById("today");
if (todaySelect) {
  days.forEach((d, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = d;
    if (i === today) opt.selected = true;
    todaySelect.appendChild(opt);
  });

  todaySelect.onchange = () => {
    today = Number(todaySelect.value);
    logs = [`Today changed to ${days[today]}.`];
    render();
  };
}

// Map database ISO deadlines or created_at to a day index 0..6
function mapDeadlineToDay(deadlineStr) {
  if (!deadlineStr) return 0;
  const d = new Date(deadlineStr);
  const day = d.getDay();
  return day === 0 ? 6 : day - 1; // Mon=0, Tue=1, ..., Sun=6
}

// --- Fetch live tasks from FastAPI -> Supabase ---
async function loadTasksFromAPI() {
  try {
    const response = await fetch(`${API_BASE_URL}/tasks/${CURRENT_USER_ID}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    
    if (data.tasks && data.tasks.length > 0) {
      tasks = data.tasks.map(t => ({
        id: t.id,
        title: t.task_title || t.course_name,
        type: t.priority === "high" ? "academic" : "skill",
        day: mapDeadlineToDay(t.deadline),
        status: t.status === "completed" ? "done" : "pending",
        moved: false
      }));
      logs = [`Loaded ${tasks.length} live tasks from Supabase.`];
    } else {
      tasks = [];
      logs = ["No tasks found in database for this user."];
    }
  } catch (err) {
    console.error("Failed to load tasks from API:", err);
    logs = ["API offline or user not found. Check FastAPI connection."];
  }
  render();
}

function render() {
  const total = tasks.length;
  const done = tasks.filter(t => t.status === "done").length;
  const missed = tasks.filter(t => t.status === "missed").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const statsEl = document.getElementById("stats");
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat"><div class="num">${total}</div><div class="label">Total tasks</div></div>
      <div class="stat"><div class="num">${done}</div><div class="label">Completed</div></div>
      <div class="stat"><div class="num">${missed}</div><div class="label">Missed</div></div>
      <div class="stat"><div class="num">${pct}%</div><div class="label">Week progress</div></div>`;
  }

  const board = document.getElementById("board");
  if (board) {
    board.innerHTML = "";
    days.forEach((d, i) => {
      const col = document.createElement("div");
      col.className = "day" + (i === today ? " today" : "") + (i < today ? " past" : "");
      const dayTasks = tasks.filter(t => t.day === i);
      col.innerHTML = `<h4><span>${d}</span><span>${i === today ? "Today" : dayTasks.length}</span></h4>`;
      
      dayTasks.forEach(t => {
        const el = document.createElement("div");
        el.className = `ptask ${t.type} ${t.status === "done" ? "done" : ""} ${t.status === "missed" ? "missed" : ""} ${t.moved ? "moved" : ""}`;
        el.dataset.id = t.id;
        el.innerHTML = `${t.title}${t.status === "missed" ? "<small>❌ Missed</small>" : t.moved ? "<small>↪ Re-planned</small>" : ""}`;
        col.appendChild(el);
      });
      board.appendChild(col);
    });
  }

  const logEl = document.getElementById("log");
  if (logEl) {
    logEl.innerHTML = logs.map(l => `<li><span>${l}</span></li>`).join("");
  }
}

// Click a task to toggle completion and sync with API
const boardEl = document.getElementById("board");
if (boardEl) {
  boardEl.addEventListener("click", async e => {
    const el = e.target.closest(".ptask");
    if (!el) return;
    const taskId = el.dataset.id;
    const t = tasks.find(x => String(x.id) === String(taskId));
    if (!t) return;

    const nextStatus = t.status === "done" ? "pending" : "done";
    t.status = nextStatus;
    t.moved = false;
    render();

    // Sync status change to backend
    try {
      await fetch(`${API_BASE_URL}/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus === "done" ? "completed" : "pending" })
      });
    } catch (err) {
      console.error("Failed to update status on server:", err);
    }
  });
}

// ---------- The agent: Observe -> Reason -> Act -> Evaluate ----------
async function runAgent() {
  logs = [];

  // 1. OBSERVE
  const overdue = tasks.filter(t => t.status !== "done" && t.day < today);
  logs.push(`👀 Observe: checked the week. ${overdue.length} task(s) missed before ${days[today]}.`);

  if (overdue.length === 0) {
    logs.push("✅ Evaluate: everything is on track. No re-planning needed.");
    render();
    return;
  }

  overdue.forEach(t => (t.status = "missed"));

  // 2. REASON
  const order = { academic: 0, skill: 1, career: 2 };
  overdue.sort((a, b) => (order[a.type] || 0) - (order[b.type] || 0));
  logs.push("🧠 Reason: academic work first, then skills, then career tasks.");

  // 3. ACT
  overdue.forEach(t => {
    let best = today;
    let bestLoad = Infinity;
    for (let d = today; d < 7; d++) {
      const load = tasks.filter(x => x.day === d && x.status !== "done").length;
      if (load < bestLoad) {
        bestLoad = load;
        best = d;
      }
    }
    const from = days[t.day];
    t.day = best;
    t.status = "pending";
    t.moved = true;
    logs.push(`🔧 Act: moved "${t.title}" from ${from} to ${days[best]}.`);
  });

  // 4. EVALUATE & PERSIST
  const left = tasks.filter(t => t.status !== "done").length;
  logs.push(`📊 Evaluate: ${left} task(s) left, spread over ${days[today]}–${days[6]}.`);
  render();

  // Save the re-planned schedule to Supabase agent_schedules table
  try {
    await fetch(`${API_BASE_URL}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: CURRENT_USER_ID,
        weekly_plan: {
          generated_at: new Date().toISOString(),
          tasks: tasks
        }
      })
    });
    logs.push("💾 Plan automatically saved to agent_schedules.");
    render();
  } catch (err) {
    console.error("Could not persist schedule to Supabase:", err);
  }
}

const runBtn = document.getElementById("runBtn");
if (runBtn) runBtn.onclick = runAgent;

const resetBtn = document.getElementById("resetBtn");
if (resetBtn) resetBtn.onclick = () => loadTasksFromAPI();

// Initial load
loadTasksFromAPI();