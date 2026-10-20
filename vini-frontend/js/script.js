
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

function renderList(id, items, type = "task") {
  const el = document.getElementById(id);
  if (!el) return;

  if (!items.length) {
    el.innerHTML = "<li>Nothing to display yet.</li>";
    return;
  }

  el.innerHTML = items.map(item => {
    const done = item.completed === 1 ||
                 item.completed === true ||
                 item.done === true;

    const title = item.title || item.text || "Untitled";
    const tag = item.category || item.tag || "";
    const level = item.priority || item.level || "";

    return `
      <li class="${done ? "done" : ""}">
        <span>${escapeHTML(title)}</span>
        <span class="tag ${escapeHTML(level)}">
          ${escapeHTML(tag)}
        </span>
      </li>
    `;
  }).join("");
}

function daysUntil(dateString) {
  if (!dateString) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadline = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(deadline.getTime())) return null;

  return Math.round((deadline - today) / 86400000);
}

async function loadDashboard() {
  try {
    renderStats([
      { num: "…", label: "Tasks today" },
      { num: "…", label: "Deadlines this week" },
      { num: "…", label: "Weekly progress" },
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
        { num: "0%", label: "Weekly progress" },
        { num: "—", label: "Internship matches" }
      ]);

      showMessage("tasks", "No student found. Create a student using Swagger first.");
      showMessage("deadlines", "Create a student and add tasks to see deadlines.");
      showMessage("agent", "Your dashboard is connected. Add tasks to receive recommendations.");
      return;
    }

    // Use the first existing student for this initial integration.
    const student = students[0];

    const [tasksResponse, recommendationsResponse] = await Promise.all([
      fetch(`${API_BASE}/students/${student.id}/tasks`),
      fetch(`${API_BASE}/students/${student.id}/recommendations`)
    ]);

    if (!tasksResponse.ok || !recommendationsResponse.ok) {
      throw new Error("Could not load tasks or recommendations.");
    }

    const tasks = await tasksResponse.json();
    const recommendations = await recommendationsResponse.json();

    const pending = tasks.filter(task =>
      task.completed !== 1 && task.completed !== true
    );

    const todayString = new Date().toLocaleDateString("en-CA");
    const tasksToday = pending.filter(task => task.deadline === todayString);

    const deadlinesThisWeek = pending.filter(task => {
      const days = daysUntil(task.deadline);
      return days !== null && days >= 0 && days <= 7;
    });

    const completedCount = tasks.length - pending.length;
    const progress = tasks.length
      ? Math.round((completedCount / tasks.length) * 100)
      : 0;

    renderStats([
      { num: String(tasksToday.length), label: "Tasks today" },
      { num: String(deadlinesThisWeek.length), label: "Deadlines this week" },
      { num: `${progress}%`, label: "Task completion" },
      { num: "—", label: "Internship matches" }
    ]);

    renderList("tasks", pending.slice(0, 5));

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

    const recommended = recommendations.all_recommendations || [];

    renderList("agent", recommended.slice(0, 5).map(task => ({
      text: `${task.title}: ${task.recommendation_reason}`,
      tag: task.priority || "Recommended",
      level: task.priority || ""
    })), "agent");

  } catch (error) {
    console.error("Dashboard loading error:", error);

    showMessage(
      "tasks",
      "Unable to load live tasks. Check that the backend is running."
    );
    showMessage("deadlines", "Unable to load deadlines.");
    showMessage("agent", error.message);
  }
}

loadDashboard();
