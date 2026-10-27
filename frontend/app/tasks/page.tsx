"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import "bootstrap-icons/font/bootstrap-icons.css";
import { getTasks, createTask, USER_ID, type Task, type Status } from "../../lib/api";
import { demoTasks } from "../../lib/demoPlan";
import Aurora from "../../components/Aurora";
import GlowCard from "../../components/GlowCard";
import CountUp from "../../components/CountUp";
import Ring from "../../components/Ring";
import FadeIn from "../../components/FadeIn";

const filters = ["all", "pending", "completed", "overdue"] as const;

// "now" is read after the page loads, so the server and browser never disagree
function getStatus(t: Task, now: Date | null): Status {
  if (t.status === "completed") return "completed";
  if (!now) return "pending";
  return new Date(t.deadline.slice(0, 10) + "T23:59:59") < now ? "overdue" : "pending";
}

function dueLabel(t: Task, now: Date | null) {
  if (!now) return t.deadline.slice(0, 10);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const d = Math.round((new Date(t.deadline.slice(0, 10) + "T00:00:00").getTime() - today.getTime()) / 86400000);
  if (d < 0) return `${-d}d overdue`;
  if (d === 0) return "Due today";
  if (d === 1) return "Due tomorrow";
  return `In ${d} days`;
}

const pill: Record<Status, string> = {
  pending: "bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/25",
  completed: "bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/25",
  overdue: "bg-rose-400/10 text-rose-300 ring-1 ring-rose-400/25",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(demoTasks);
  const [live, setLive] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [course, setCourse] = useState("");
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [hours, setHours] = useState(2);

  useEffect(() => {
    setNow(new Date());
  }, []);

  useEffect(() => {
    if (!USER_ID) return;
    getTasks(USER_ID)
      .then((data) => {
        setTasks(data);
        setLive(true);
      })
      .catch(() => setLive(false));
  }, []);

  const statusOf = (t: Task) => getStatus(t, now);
  const count = (s: Status) => tasks.filter((t) => statusOf(t) === s).length;
  const byDeadline = (a: Task, b: Task) => a.deadline.localeCompare(b.deadline);

  const shown = tasks.filter((t) => filter === "all" || statusOf(t) === filter).sort(byDeadline);
  const percent = tasks.length ? Math.round((count("completed") / tasks.length) * 100) : 0;
  const hoursLeft = tasks
    .filter((t) => statusOf(t) !== "completed")
    .reduce((s, t) => s + Number(t.estimated_hours || 0), 0);

  // The agent reads the tasks and decides what to do first
  const overdue = tasks.filter((t) => statusOf(t) === "overdue").sort(byDeadline);
  const upNext = tasks.filter((t) => statusOf(t) === "pending").sort(byDeadline)[0];
  const insight =
    overdue.length > 0
      ? `${overdue.length} task${overdue.length > 1 ? "s are" : " is"} overdue. Start with “${overdue[0].task_title}” today.`
      : upNext
        ? `You're on track. Next up: “${upNext.task_title}” (${dueLabel(upNext, now).toLowerCase()}).`
        : "All caught up. Time to work on a skill or apply to an internship.";

  async function addTask() {
    if (!course.trim() || !title.trim() || !deadline) return;
    const draft = { course_name: course, task_title: title, deadline, estimated_hours: hours };
    try {
      const saved = await createTask({ user_id: USER_ID, ...draft });
      setTasks([...tasks, saved]);
      setLive(true);
    } catch {
      // backend is down: keep it on screen only so the demo never breaks
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

  const input =
    "rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-violet-400/70 focus:ring-2 focus:ring-violet-400/20";

  const stats = [
    { label: "Total", value: tasks.length, icon: "bi-collection", color: "text-white/50" },
    { label: "Pending", value: count("pending"), icon: "bi-hourglass-split", color: "text-amber-300" },
    { label: "Completed", value: count("completed"), icon: "bi-check2-all", color: "text-emerald-300" },
    { label: "Overdue", value: count("overdue"), icon: "bi-exclamation-triangle", color: "text-rose-300" },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-8">
      <Aurora />

      <FadeIn>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/70">
          <span className="relative flex h-2 w-2">
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${live ? "bg-emerald-400" : "bg-white/40"}`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${live ? "bg-emerald-400" : "bg-white/40"}`} />
          </span>
          {live ? "Agent online · live tasks" : "Agent online · demo tasks"}
        </div>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Your <span className="text-gradient">task tracker</span>
        </h1>
        <p className="mt-2 max-w-xl text-white/55">Deadlines, priorities and what to tackle next, all in one place.</p>
      </FadeIn>

      {/* Ring + agent insight */}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <FadeIn delay={0.05}>
          <GlowCard className="flex h-full items-center gap-5 p-5">
            <Ring percent={percent} />
            <div>
              <div className="text-sm text-white/50">Hours left</div>
              <div className="text-3xl font-semibold">
                <CountUp value={hoursLeft} />h
              </div>
            </div>
          </GlowCard>
        </FadeIn>

        <FadeIn delay={0.12} className="md:col-span-2">
          <GlowCard className="h-full p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-violet-300">
              <i className="bi bi-stars" /> Agent insight
            </div>
            <p className="text-xl leading-snug sm:text-2xl">{insight}</p>
            {overdue.length > 0 && (
              <p className="mt-3 text-sm text-white/45">Tip: the Timetable page can re-plan your week around missed work.</p>
            )}
          </GlowCard>
        </FadeIn>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s, i) => (
          <FadeIn key={s.label} delay={0.18 + i * 0.06}>
            <GlowCard className="p-4">
              <i className={`bi ${s.icon} text-lg ${s.color}`} />
              <div className="mt-2 text-3xl font-semibold">
                <CountUp value={s.value} />
              </div>
              <div className="text-sm text-white/50">{s.label}</div>
            </GlowCard>
          </FadeIn>
        ))}
      </div>

      {/* Add task */}
      <FadeIn delay={0.3} className="mt-6">
        <GlowCard className="flex flex-wrap gap-2 p-4">
          <input className={input} placeholder="Course" value={course} onChange={(e) => setCourse(e.target.value)} />
          <input className={`${input} min-w-[200px] flex-1`} placeholder="What needs to be done?" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className={input} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          <input className={`${input} w-20`} type="number" min={1} value={hours} onChange={(e) => setHours(Number(e.target.value))} title="Estimated hours" />
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={addTask}
            className="rounded-xl bg-linear-to-r from-violet-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20"
          >
            <i className="bi bi-plus-lg mr-1" /> Add task
          </motion.button>
        </GlowCard>
      </FadeIn>

      {/* Filters */}
      <div className="mt-8 inline-flex rounded-full border border-white/10 bg-white/[0.05] p-1">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`relative rounded-full px-4 py-1.5 text-sm capitalize transition-colors ${filter === f ? "text-white" : "text-white/50 hover:text-white"}`}
          >
            {filter === f && (
              <motion.span
                layoutId="filter-pill"
                className="absolute inset-0 rounded-full bg-white/15"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative">{f}</span>
          </button>
        ))}
      </div>

      {/* Task list */}
      <ul className="mt-4 flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {shown.map((t) => {
            const s = statusOf(t);
            return (
              <motion.li
                key={t.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
              >
                <GlowCard className={s === "overdue" ? "!border-rose-400/30" : ""}>
                  <div className="flex items-center gap-4 p-4">
                    <motion.button
                      whileTap={{ scale: 0.8 }}
                      onClick={() => toggle(t.id)}
                      aria-label="Mark done or not done"
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-sm transition ${
                        s === "completed"
                          ? "border-transparent bg-linear-to-br from-emerald-400 to-cyan-400 text-black"
                          : "border-white/25 text-transparent hover:border-white/60"
                      }`}
                    >
                      <i className="bi bi-check-lg" />
                    </motion.button>

                    <div className="min-w-0 flex-1">
                      <div className={`truncate font-medium ${s === "completed" ? "text-white/40 line-through" : ""}`}>{t.task_title}</div>
                      <div className="mt-0.5 text-sm text-white/45">
                        {t.course_name} · {t.deadline.slice(0, 10)} · {t.estimated_hours}h
                      </div>
                    </div>

                    <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${pill[s]}`}>
                      {s === "completed" ? "Completed" : dueLabel(t, now)}
                    </span>
                  </div>
                </GlowCard>
              </motion.li>
            );
          })}
        </AnimatePresence>
        {shown.length === 0 && <p className="py-10 text-center text-white/40">Nothing here yet.</p>}
      </ul>
    </main>
  );
}