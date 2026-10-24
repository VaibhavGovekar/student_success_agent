"use client";

import { useEffect, useState } from "react";
import { getTasks, createTask, USER_ID, type Task, type Status } from "../../lib/api";

const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

// Demo data. It shows when the backend is not connected.
const demoTasks: Task[] = [
  { id: "1", course_name: "Python", task_title: "Complete Python assignment", deadline: daysFromNow(-1), estimated_hours: 2, status: "pending" },
  { id: "2", course_name: "Java", task_title: "Study for Java exam", deadline: daysFromNow(2), estimated_hours: 3, status: "pending" },
  { id: "3", course_name: "Maths", task_title: "Finish mathematics notes", deadline: daysFromNow(0), estimated_hours: 1, status: "completed" },
];

function getStatus(t: Task): Status {
  if (t.status === "completed") return "completed";
  return new Date(t.deadline.slice(0, 10) + "T23:59:59") < new Date() ? "overdue" : "pending";
}

const badge: Record<Status, string> = {
  pending: "bg-yellow-400/15 text-yellow-300",
  completed: "bg-emerald-400/15 text-emerald-300",
  overdue: "bg-red-400/15 text-red-300",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(demoTasks);
  const [live, setLive] = useState(false);
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [course, setCourse] = useState("");
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [hours, setHours] = useState(2);

  // Ask the backend for tasks when the page opens
  useEffect(() => {
    if (!USER_ID) return; // no user id yet, so stay on demo data
    getTasks(USER_ID)
      .then((data) => {
        setTasks(data);
        setLive(true);
      })
      .catch(() => setLive(false));
  }, []);

  const shown = tasks
    .filter((t) => filter === "all" || getStatus(t) === filter)
    .sort((a, b) => a.deadline.localeCompare(b.deadline));

  const count = (s: Status) => tasks.filter((t) => getStatus(t) === s).length;

  async function addTask() {
    if (!course.trim() || !title.trim() || !deadline) return;
    const draft = { course_name: course, task_title: title, deadline, estimated_hours: hours };
    try {
      const saved = await createTask({ user_id: USER_ID, ...draft });
      setTasks([...tasks, saved]);
      setLive(true);
    } catch {
      // backend is down: keep it on screen only so the demo doesn't break
      setTasks([...tasks, { id: String(Date.now()), status: "pending", ...draft }]);
    }
    setCourse("");
    setTitle("");
    setDeadline("");
    setHours(2);
  }

  function toggle(id: string) {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, status: t.status === "completed" ? "pending" : "completed" } : t)));
  }

  const input = "rounded-xl border border-[#262b45] bg-[#0f1220] px-3 py-2 text-sm text-[#e8eaf6] outline-none focus:border-[#6c7bff]";

  return (
    <main className="min-h-screen bg-[#0f1220] p-8 text-[#e8eaf6]">
      <h1 className="text-3xl font-bold">Task Tracker 📅</h1>
      <p className="mt-1 text-[#8b90b0]">Your academic tasks and deadlines.</p>
      <span
        className={`mt-2 inline-block rounded-full px-3 py-1 text-xs ${
          live ? "bg-emerald-400/15 text-emerald-300" : "bg-[#262b45] text-[#8b90b0]"
        }`}
      >
        {live ? "● Live data" : "○ Demo data"}
      </span>

      <div className="my-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ["Total", tasks.length],
          ["Pending", count("pending")],
          ["Completed", count("completed")],
          ["Overdue", count("overdue")],
        ].map(([label, n]) => (
          <div key={label} className="rounded-2xl border border-[#262b45] bg-[#181c30] p-4">
            <div className="text-2xl font-bold">{n}</div>
            <div className="text-sm text-[#8b90b0]">{label}</div>
          </div>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-[#262b45] bg-[#181c30] p-4">
        <input className={input} placeholder="Course" value={course} onChange={(e) => setCourse(e.target.value)} />
        <input className={`${input} min-w-[200px] flex-1`} placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className={input} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        <input className={`${input} w-20`} type="number" min={1} value={hours} onChange={(e) => setHours(Number(e.target.value))} title="Estimated hours" />
        <button onClick={addTask} className="rounded-xl bg-[#6c7bff] px-5 py-2 text-sm font-semibold text-white hover:opacity-90">
          Add
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        {(["all", "pending", "completed", "overdue"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm capitalize ${filter === f ? "bg-[#6c7bff] text-white" : "bg-[#262b45] text-[#8b90b0]"}`}
          >
            {f}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-3">
        {shown.map((t) => {
          const s = getStatus(t);
          return (
            <li
              key={t.id}
              onClick={() => toggle(t.id)}
              className="flex cursor-pointer items-center justify-between rounded-2xl border border-[#262b45] bg-[#181c30] p-4 hover:border-[#6c7bff]"
            >
              <div>
                <div className={s === "completed" ? "text-[#8b90b0] line-through" : "font-medium"}>
                  {s === "completed" ? "✅" : "⬜"} {t.task_title}
                </div>
                <div className="mt-1 text-sm text-[#8b90b0]">
                  {t.course_name} · due {t.deadline.slice(0, 10)} · {t.estimated_hours}h
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${badge[s]}`}>{s}</span>
            </li>
          );
        })}
        {shown.length === 0 && <p className="text-[#8b90b0]">No tasks here.</p>}
      </ul>
    </main>
  );
}