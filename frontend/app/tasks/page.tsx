
"use client";

import { useState } from "react";

type Status = "pending" | "completed" | "overdue";

type Task = {
  id: string;
  course_name: string;
  task_title: string;
  deadline: string;
  estimated_hours: number;
  status: Status;
};

const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const initialTasks: Task[] = [
  { id: "1", course_name: "Python", task_title: "Complete Python assignment", deadline: daysFromNow(-1), estimated_hours: 2, status: "pending" },
  { id: "2", course_name: "Java", task_title: "Study for Java exam", deadline: daysFromNow(2), estimated_hours: 3, status: "pending" },
  { id: "3", course_name: "Maths", task_title: "Finish mathematics notes", deadline: daysFromNow(0), estimated_hours: 1, status: "completed" },
];

function getStatus(t: Task): Status {
  if (t.status === "completed") return "completed";
  return new Date(t.deadline + "T23:59:59") < new Date() ? "overdue" : "pending";
}

const statusStyles: Record<Status, string> = {
  pending: "border-amber-300/15 bg-amber-300/10 text-amber-200",
  completed: "border-emerald-300/15 bg-emerald-300/10 text-emerald-200",
  overdue: "border-rose-300/15 bg-rose-300/10 text-rose-200",
};

const courseStyles: Record<string, string> = {
  Python: "bg-sky-400/10 text-sky-200 border-sky-300/15",
  Java: "bg-orange-400/10 text-orange-200 border-orange-300/15",
  Maths: "bg-violet-400/10 text-violet-200 border-violet-300/15",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [course, setCourse] = useState("");
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [hours, setHours] = useState(2);

  const shown = tasks
    .filter((t) => filter === "all" || getStatus(t) === filter)
    .sort((a, b) => a.deadline.localeCompare(b.deadline));

  const count = (s: Status) => tasks.filter((t) => getStatus(t) === s).length;
  const completed = count("completed");
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  function addTask() {
    if (!course.trim() || !title.trim() || !deadline) return;
    setTasks((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        course_name: course.trim(),
        task_title: title.trim(),
        deadline,
        estimated_hours: Math.max(1, hours),
        status: "pending",
      },
    ]);
    setCourse("");
    setTitle("");
    setDeadline("");
    setHours(2);
  }

  function toggle(id: string) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: t.status === "completed" ? "pending" : "completed" }
          : t
      )
    );
  }

  const field =
    "min-w-0 w-full rounded-xl border border-white/10 bg-[#0b0c16] px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/10";

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090a12] text-white">
      <div className="pointer-events-none absolute -top-40 left-[12%] h-96 w-96 rounded-full bg-violet-600/15 blur-[130px]" />
      <div className="pointer-events-none absolute right-0 top-[420px] h-80 w-80 rounded-full bg-blue-500/10 blur-[120px]" />

      <div className="relative mx-auto w-full max-w-7xl px-5 pb-16 pt-9 sm:px-8 sm:pt-12">
        <section className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-300/15 bg-violet-300/[0.07] px-3 py-1.5 text-xs text-violet-200">
              <i className="bi bi-stars" />
              YOUR PERSONAL STUDY SPACE
            </div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Your semester,
              <span className="block bg-gradient-to-r from-violet-300 via-fuchsia-200 to-sky-300 bg-clip-text text-transparent">
                under control.
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/50 sm:text-base">
              Every assignment, every deadline, one clear plan. Make progress
              without losing track of what matters.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:min-w-56">
            <p className="text-xs text-white/40">TODAY</p>
            <p className="mt-2 text-lg font-medium">{today}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-white/50">
              <span className="h-2 w-2 rounded-full bg-violet-300" />
              {count("pending")} tasks to focus on
            </div>
          </div>
        </section>

        <section className="mt-9 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "All tasks", value: tasks.length, icon: "bi-layers", color: "text-violet-200", glow: "bg-violet-300/10" },
            { label: "In progress", value: count("pending"), icon: "bi-hourglass-split", color: "text-amber-200", glow: "bg-amber-300/10" },
            { label: "Completed", value: completed, icon: "bi-check2-circle", color: "text-emerald-200", glow: "bg-emerald-300/10" },
            { label: "Overdue", value: count("overdue"), icon: "bi-alarm", color: "text-rose-200", glow: "bg-rose-300/10" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/[0.09] bg-[#141522]/90 p-4 transition duration-300 hover:-translate-y-1 hover:border-violet-300/25 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-white/50">{s.label}</span>
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.glow} ${s.color}`}>
                  <i className={`bi ${s.icon}`} />
                </span>
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight">{s.value}</p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div className={`h-full rounded-full ${s.glow}`} style={{ width: `${tasks.length ? Math.max(8, (s.value / tasks.length) * 100) : 0}%` }} />
              </div>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-2xl border border-white/10 bg-[#11121d]/90 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-400/10 text-violet-200">
                <i className="bi bi-plus-lg text-lg" />
              </div>
              <div>
                <h2 className="font-semibold">Create a task</h2>
                <p className="mt-1 text-xs text-white/40">Add your next academic goal.</p>
              </div>
            </div>

            <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); addTask(); }}>
              <label className="text-xs text-white/50">
                Course
                <input className={`${field} mt-2`} placeholder="e.g. Computer Science" value={course} onChange={(e) => setCourse(e.target.value)} required />
              </label>
              <label className="text-xs text-white/50">
                Task name
                <input className={`${field} mt-2`} placeholder="What needs to be done?" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </label>
              <label className="text-xs text-white/50">
                Due date
                <input className={`${field} mt-2`} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
              </label>
              <label className="text-xs text-white/50">
                Estimated hours
                <input className={`${field} mt-2`} type="number" min={1} max={99} value={hours} onChange={(e) => setHours(Number(e.target.value))} required />
              </label>
              <button className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 px-5 py-3 text-sm font-semibold shadow-lg shadow-violet-950/20 transition hover:brightness-110 sm:col-span-2">
                <i className="bi bi-plus-circle" />
                Add to my tasks
              </button>
            </form>
          </div>

          <aside className="rounded-2xl border border-violet-300/15 bg-gradient-to-br from-violet-500/[0.12] via-[#151321] to-sky-500/[0.06] p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Your progress</span>
              <i className="bi bi-graph-up-arrow text-violet-200" />
            </div>
            <div className="mt-7 flex items-end gap-2">
              <span className="text-5xl font-semibold tracking-tight">{progress}%</span>
              <span className="pb-1 text-xs text-white/40">completed</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-sky-300 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-4 text-sm leading-6 text-white/50">
              {completed === tasks.length && tasks.length > 0
                ? "Everything is complete. Great work!"
                : "Small steps add up. Complete a task to move your progress forward."}
            </p>
            <div className="mt-6 border-t border-white/10 pt-4">
              <p className="text-xs text-white/40">TOTAL ESTIMATED WORK</p>
              <p className="mt-2 text-2xl font-semibold">
                {tasks.filter((t) => getStatus(t) !== "completed").reduce((sum, t) => sum + t.estimated_hours, 0)}
                <span className="ml-2 text-sm font-normal text-white/40">hours remaining</span>
              </p>
            </div>
          </aside>
        </section>

        <section className="mt-10">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/70">STAY ON TRACK</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Your task list</h2>
              <p className="mt-1 text-sm text-white/40">Select a task to mark it complete or reopen it.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "pending", "completed", "overdue"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`rounded-full border px-4 py-2 text-xs font-medium capitalize transition ${filter === f ? "border-violet-300/30 bg-violet-400/15 text-violet-100" : "border-white/[0.07] bg-white/[0.025] text-white/45 hover:bg-white/[0.06] hover:text-white"}`}>
                  {f === "all" ? "All tasks" : f}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {shown.map((t) => {
              const s = getStatus(t);
              const isDone = s === "completed";
              const due = new Date(t.deadline + "T00:00:00");
              const todayDate = new Date();
              todayDate.setHours(0, 0, 0, 0);
              const daysLeft = Math.round((due.getTime() - todayDate.getTime()) / 86400000);
              const dueText = isDone ? "Completed" : daysLeft < 0 ? `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} overdue` : daysLeft === 0 ? "Due today" : `Due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;

              return (
                <article key={t.id} className={`group relative overflow-hidden rounded-2xl border bg-[#141522]/90 transition duration-200 hover:border-violet-300/25 ${isDone ? "border-white/[0.06] opacity-75" : s === "overdue" ? "border-rose-300/15" : "border-white/[0.09]"}`}>
                  <div className={`absolute bottom-0 left-0 top-0 w-1 ${isDone ? "bg-emerald-300/60" : s === "overdue" ? "bg-rose-300/80" : "bg-violet-300/70"}`} />
                  <div className="flex flex-col gap-4 p-4 pl-6 sm:flex-row sm:items-center sm:justify-between sm:p-5 sm:pl-7">
                    <div className="flex min-w-0 items-start gap-3">
                      <button onClick={() => toggle(t.id)} aria-label={isDone ? "Reopen task" : "Complete task"} className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition ${isDone ? "border-emerald-300/30 bg-emerald-300/15 text-emerald-200" : "border-white/20 bg-white/[0.025] text-transparent hover:border-violet-300/50 hover:text-violet-200"}`}>
                        <i className="bi bi-check2" />
                      </button>
                      <div className="min-w-0">
                        <h3 className={`break-words font-medium ${isDone ? "text-white/40 line-through" : "text-white"}`}>{t.task_title}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/40">
                          <span className={`rounded-md border px-2 py-1 ${courseStyles[t.course_name] ?? "border-white/10 bg-white/[0.04] text-white/60"}`}>{t.course_name}</span>
                          <span className="text-white/20">•</span>
                          <span><i className="bi bi-clock mr-1" />{t.estimated_hours}h estimated</span>
                          <span className="text-white/20">•</span>
                          <span>{new Date(t.deadline + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-3 pl-9 sm:justify-end sm:pl-0">
                      <span className={`text-xs ${isDone ? "text-emerald-200/70" : s === "overdue" ? "text-rose-200" : "text-white/40"}`}>{dueText}</span>
                      <span className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize ${statusStyles[s]}`}>{s}</span>
                    </div>
                  </div>
                </article>
              );
            })}

            {shown.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/15 px-5 py-14 text-center">
                <i className="bi bi-check2-circle text-3xl text-white/25" />
                <p className="mt-3 font-medium">Nothing to show here</p>
                <p className="mt-1 text-sm text-white/40">Choose another filter or add a new task.</p>
              </div>
            )}
          </div>
        </section>

        <p className="mt-10 text-center text-xs text-white/25">Student Success Agent · One step at a time.</p>
      </div>
    </main>
  );
}
