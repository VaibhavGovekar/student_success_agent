
const API_BASE = "http://127.0.0.1:8000";

const statsEl = document.getElementById("stats");

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function showMessage(id, message) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = `<li>${escapeHTML(message)}</li>`;
}

function renderStats(stats) {
  if (!statsEl) return;

  statsEl.innerHTML = stats.map(item => `
    <div class="stat">
      <div class="num">${escapeHTML(item.num)}</div>
      <div class="label">${escapeHTML(item.label)}</div>
    </div>
  `).join("");
}


function isCompleted(task) {
  const value = task.completed;

  return value === 1 ||
         value === true ||
         value === "1";
}

function renderList(id, items) {
  const el = document.getElementById(id);
  if (!el) return;

  console.log("renderList called:", id, "item count:", items.length);

  if (!items.length) {
    el.innerHTML = "<li>Nothing to display yet.</li>";
    return;
  }

  el.innerHTML = items.map(item => {
    const title = item.title || item.text || "Untitled";
    const tag = item.tag || item.category || "";
    const level = item.priority || item.level || "";

    return `
      <li>
        <span>${escapeHTML(title)}</span>
        <span class="tag ${escapeHTML(level)}">
          ${escapeHTML(tag)}
        </span>
      </li>
    `;
  }).join("");

  console.log("Rendered list", id, el.innerHTML);
}



function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function daysUntil(dateString) {
  if (!dateString) return null;

  const deadline = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(deadline.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.round((deadline - today) / 86400000);
}

async function loadDashboard() {
  try {
    renderStats([
      { num: "…", label: "Tasks today" },
      { num: "…", label: "Deadlines this week" },
      { num: "…", label: "Task completion" },
      { num: "—", label: "Internship matches" }
    ]);

    const response = await fetch(`${API_BASE}/students`);

    if (!response.ok) {
      throw new Error(`Could not load students (${response.status})`);
    }

    const students = await response.json();

    if (!students.length) {
      renderStats([
        { num: "0", label: "Tasks today" },
        { num: "0", label: "Deadlines this week" },
        { num: "0%", label: "Task completion" },
        { num: "—", label: "Internship matches" }
      ]);

      showMessage("tasks", "No student found. Create a student in Swagger.");
      showMessage("deadlines", "Add a student and tasks to see deadlines.");
      showMessage("agent", "Add tasks to receive recommendations.");
      return;
    }

    const student = students[0];

    const tasksResponse = await fetch(`${API_BASE}/tasks/${student.id}`);
    if (!tasksResponse.ok) throw new Error("Could not load student tasks.");
    const taskData = await tasksResponse.json();
    const tasks = (taskData.tasks || []).map(task => ({
      ...task,
      title: task.task_title,
      completed: task.status === "completed"
    }));
    const pending = tasks.filter(task => !isCompleted(task));


    const completedCount = tasks.length - pending.length;

    const progress = tasks.length
      ? Math.round((completedCount / tasks.length) * 100)
      : 0;

    const todayString = localDateString();

    const tasksToday = pending.filter(task =>
      task.deadline === todayString
    );

    const deadlinesThisWeek = pending.filter(task => {
      const days = daysUntil(task.deadline);
      return days !== null && days >= 0 && days <= 7;
    });

    renderStats([
      { num: String(tasksToday.length), label: "Tasks today" },
      { num: String(deadlinesThisWeek.length), label: "Deadlines this week" },
      { num: `${progress}%`, label: "Task completion" },
      { num: "—", label: "Internship matches" }
    ]);

    // Today's Tasks: pending tasks due today.
  console.log("Pending array before rendering:", pending);
console.log("Pending array length:", pending.length);

renderList("tasks", pending);

    console.log("Tasks passed to renderList:", pending.slice(0, 5));
console.log("Tasks element:", document.getElementById("tasks"));

    // Upcoming Deadlines: pending tasks due today or later.
   
const upcoming = pending
  .filter(task => task.deadline)
  .sort((a, b) => a.deadline.localeCompare(b.deadline))
  .slice(0, 5)
  .map(task => {
    const days = daysUntil(task.deadline);
    let when = task.deadline;

    if (days < 0) when += " (overdue)";
    else if (days === 0) when += " (today)";
    else if (days === 1) when += " (tomorrow)";
    else when += ` (${days} days)`;

    return { ...task, tag: when };
  });

renderList("deadlines", upcoming);


    const agentItems = pending.slice(0, 5).map(task => ({
      text: `${task.title}: ${task.deadline ? `due ${task.deadline.slice(0, 10)}` : "no deadline"}`,
      tag: task.priority || "medium",
      level: task.priority || ""
    }));

    renderList("agent", agentItems);

  } catch (error) {
    console.error("Dashboard loading error:", error);

    showMessage(
      "tasks",
      "Unable to load tasks. Check that the backend is running."
    );
    showMessage("deadlines", "Unable to load deadlines.");
    showMessage("agent", error.message);
  }
}

loadDashboard();
