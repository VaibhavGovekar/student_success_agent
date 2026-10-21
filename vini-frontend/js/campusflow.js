
const API_BASE = "http://127.0.0.1:8000";

let studentId = null;
let assignments = [];

// ---------- Timetable (kept as existing dummy data) ----------
const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const times = ["9:00", "10:00", "11:00", "12:00", "2:00", "3:00"];

const slots = {
  Mon: ["DSA", "Maths", "DBMS", "Free", "DBMS Lab", "DBMS Lab"],
  Tue: ["OS", "DSA", "Maths", "Free", "DSA Lab", "DSA Lab"],
  Wed: ["DBMS", "OS", "DSA", "Free", "Maths", "Free"],
  Thu: ["Maths", "DBMS", "OS", "Free", "OS Lab", "OS Lab"],
  Fri: ["DSA", "DBMS", "Maths", "Free", "Project", "Project"]
};

function renderTimetable() {
  let html =
    "<tr><th></th>" +
    days.map(day => `<th>${day}</th>`).join("") +
    "</tr>";

  times.forEach((time, index) => {
    html += `<tr><td class="time">${time}</td>`;

    days.forEach(day => {
      const subject = slots[day][index];
      const cls =
        subject === "Free"
          ? "free"
          : subject.includes("Lab") || subject === "Project"
            ? "lab"
            : "class";

      html += `<td class="${cls}">${subject}</td>`;
    });

    html += "</tr>";
  });

  document.getElementById("timetable").innerHTML = html;
}

// ---------- Deadline helpers ----------
function daysLeft(dateStr) {
  if (!dateStr) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dateStr + "T00:00:00");
  return Math.round((due - today) / 86400000);
}

function levelFor(days) {
  if (days === null) return "success";
  return days <= 1 ? "danger" : days <= 3 ? "warning" : "success";
}

function labelFor(days) {
  if (days === null) return "No deadline";
  if (days < 0) return "Overdue";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days} days`;
}

// ---------- API helper ----------
async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;

    try {
      const error = await response.json();
      detail = error.detail || detail;
    } catch {}

    throw new Error(detail);
  }

  if (response.status === 204) return null;
  return response.json();
}

// ---------- Messages ----------
function showMessage(message, isError = false) {
  let element = document.getElementById("campusflowMessage");

  if (!element) {
    element = document.createElement("p");
    element.id = "campusflowMessage";
    element.setAttribute("role", "status");

    document.querySelector(".add-form").after(element);
  }

  element.textContent = message;
  element.style.color = isError ? "#ff7777" : "#65d6a6";
}

// ---------- Load student ----------
async function loadStudent() {
  const students = await apiRequest("/students");

  if (!Array.isArray(students) || students.length === 0) {
    throw new Error(
      "No student found. Create a student first using POST /students in Swagger."
    );
  }

  // Use the same first-student approach as the dashboard.
  studentId = students[0].id;
}

// ---------- Assignments from database ----------
async function loadAssignments() {
  const tasks = await apiRequest(`/students/${studentId}/tasks`);

  // CampusFlow displays academic assignments only.
  assignments = tasks.filter(task => task.category === "academic");

  renderAssignments();
}

function renderAssignments() {
  const ul = document.getElementById("assignments");
  ul.replaceChildren();

  if (assignments.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No academic assignments yet. Add one above.";
    ul.appendChild(li);
    return;
  }

  assignments.sort((a, b) => {
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return a.deadline.localeCompare(b.deadline);
  });

  assignments.forEach(task => {
    const li = document.createElement("li");
    li.className = "clickable" + (task.completed ? " done" : "");

    const name = document.createElement("span");
    name.textContent =
      `${task.completed ? "✅ " : "⬜ "}${task.title}`;

    const tag = document.createElement("span");
    const remaining = daysLeft(task.deadline);

    tag.className =
      "tag " + (task.completed ? "success" : levelFor(remaining));
    tag.textContent = task.completed
      ? "Done"
      : labelFor(remaining);

    const deleteBtn = document.createElement("button");
deleteBtn.textContent = "Delete";
deleteBtn.className = "btn";
deleteBtn.style.marginLeft = "8px";

deleteBtn.addEventListener("click", async (event) => {
  event.stopPropagation();

  if (!confirm(`Delete "${task.title}"?`)) return;

  try {
    await apiRequest(`/tasks/${task.id}`, {
      method: "DELETE"
    });

    await loadAssignments();
    showMessage("Assignment deleted successfully.");
  } catch (error) {
    showMessage(`Could not delete assignment: ${error.message}`, true);
  }
});

li.append(name, tag, deleteBtn);
    li.title = "Click to toggle completion";

    li.addEventListener("click", async () => {
      try {
        li.style.pointerEvents = "none";

        const action = task.completed ? "reopen" : "complete";

        await apiRequest(`/tasks/${task.id}/${action}`, {
          method: "PATCH"
        });

        await loadAssignments();
        showMessage(
          task.completed
            ? "Assignment reopened."
            : "Assignment marked complete."
        );
      } catch (error) {
        showMessage(`Could not update assignment: ${error.message}`, true);
      } finally {
        li.style.pointerEvents = "";
      }
    });

    ul.appendChild(li);
  });
}

// ---------- Add assignment to database ----------
document.getElementById("addBtn").addEventListener("click", async () => {
  const nameInput = document.getElementById("taskName");
  const dateInput = document.getElementById("taskDate");

  const title = nameInput.value.trim();
  const deadline = dateInput.value;

  if (!title || !deadline) {
    showMessage("Enter an assignment name and deadline.", true);
    return;
  }

  if (!studentId) {
    showMessage("Student data is not loaded yet.", true);
    return;
  }

  const button = document.getElementById("addBtn");
  button.disabled = true;

  try {
    await apiRequest(`/students/${studentId}/tasks`, {
      method: "POST",
      body: JSON.stringify({
        title,
        category: "academic",
        deadline,
        priority: "medium"
      })
    });

    nameInput.value = "";
    dateInput.value = "";

    await loadAssignments();
    showMessage("Assignment saved to the database!");
  } catch (error) {
    showMessage(`Could not add assignment: ${error.message}`, true);
  } finally {
    button.disabled = false;
  }
});

// ---------- Upcoming exams (still sample data) ----------
function renderExams() {
  const exams = [
    { text: "Maths Internal Test", due: 3 },
    { text: "DSA Internal Test", due: 9 },
    { text: "DBMS Internal Test", due: 12 }
  ];

  const ul = document.getElementById("exams");
  ul.replaceChildren();

  exams.forEach(exam => {
    const li = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = exam.text;

    const tag = document.createElement("span");
    tag.className = `tag ${levelFor(exam.due)}`;
    tag.textContent = labelFor(exam.due);

    li.append(name, tag);
    ul.appendChild(li);
  });
}

// ---------- Start CampusFlow ----------
async function initCampusFlow() {
  renderTimetable();
  renderExams();

  try {
    await loadStudent();
    await loadAssignments();
  } catch (error) {
    showMessage(`CampusFlow error: ${error.message}`, true);
    console.error("CampusFlow initialization failed:", error);
  }
}

initCampusFlow();
