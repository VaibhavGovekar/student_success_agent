const API_BASE_URL = "http://127.0.0.1:8000";
// Replace with the active student UUID or load dynamically from session/auth
let CURRENT_USER_ID = null;

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
    const studentsResponse = await fetch(`${API_BASE_URL}/students`);
    if (!studentsResponse.ok) throw new Error(`Could not load students (${studentsResponse.status})`);
    const students = await studentsResponse.json();
    if (!students.length) throw new Error("Create a student profile before using the planner.");
    CURRENT_USER_ID = students[0].id;
    const response = await fetch(`${API_BASE_URL}/tasks/${CURRENT_USER_ID}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    
    if (data.tasks && data.tasks.length > 0) {
      tasks = data.tasks.map(t => ({
        id: t.id,
        title: t.task_title || t.course_name,
        type: "academic",
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
    logEl.innerHTML = logs.map(l => `<li><span>${escapeHTML(l)}</span></li>`).join("");
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
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
  logs = ["👀 Observe: loading pending tasks from Supabase."];
  render();
  if (!CURRENT_USER_ID) {
    logs.push("Create a student profile first.");
    render();
    return;
  }

  try {
    logs.push("🧠 Reason: asking the backend planner to prioritize tasks and build a schedule.");
    render();
    const response = await fetch(`${API_BASE_URL}/students/${CURRENT_USER_ID}/agent/plan`, { method: "POST" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || `Planner failed (${response.status})`);

    const dayIndex = dateString => {
      const date = new Date(`${dateString}T00:00:00`);
      return (date.getDay() + 6) % 7;
    };
    for (const block of result.schedule || []) {
      const task = tasks.find(item => item.title === block.title);
      if (!task) continue;
      task.day = dayIndex(block.scheduled_date);
      task.status = "pending";
      task.moved = true;
    }
    const source = result.recommendation_source === "gemini" ? "Gemini AI" : "the built-in rules fallback";
    logs.push(`✨ Recommendations came from ${source}.`);
    if (result.recommendation_fallback_reason) logs.push(`Gemini status: ${result.recommendation_fallback_reason}`);
    (result.ranked_tasks || []).forEach((task, index) => {
      logs.push(`🏷️ Priority #${index + 1}: ${task.title} — score ${task.priority_score}.`);
    });
    for (const item of result.recommendations || []) {
      logs.push(`🧠 ${item.task_title}: ${item.priority} priority — ${item.priority_reason} Suggested study time: ${item.recommended_study_hours}h.`);
    }
    for (const warning of result.missed_deadline_warnings || []) logs.push(`⚠️ ${warning}`);
    for (const block of result.schedule || []) {
      const start = `${String(block.start_hour).padStart(2, "0")}:00`;
      const end = `${String(block.end_hour).padStart(2, "0")}:00`;
      logs.push(`📅 ${block.title}: ${block.scheduled_date}, ${start}–${end}${block.recovery_mode ? " (recovery)" : ""}.`);
    }
    if (result.initial_validation_errors?.length) {
      logs.push(`Initial schedule needed replanning: ${result.initial_validation_errors.join(" ")}`);
    }
    if (result.validation_errors?.length) {
      logs.push(`Validation issues remain: ${result.validation_errors.join(" ")}`);
    } else {
      logs.push("✅ SCHEDULE VALID: all scheduling checks passed.");
    }
    if (result.recovery_schedule) logs.push("🔁 Recovery schedule created for overdue work.");
    logs.push(`Saved ${result.schedule_type} plan to agent_schedules.`);
  } catch (error) {
    logs.push(`Could not generate a plan: ${error.message}`);
  }
  render();
}

const runBtn = document.getElementById("runBtn");
if (runBtn) runBtn.onclick = runAgent;

const resetBtn = document.getElementById("resetBtn");
if (resetBtn) resetBtn.onclick = () => loadTasksFromAPI();

// Initial load
loadTasksFromAPI();
