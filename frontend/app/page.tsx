"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import "bootstrap-icons/font/bootstrap-icons.css";

import {
  getSchedule,
  USER_ID,
  type Block,
  type BlockType,
  type WeeklyPlan,
} from "../lib/api";

import { demoPlan } from "../lib/demoPlan";
import Aurora from "../components/Aurora";
import GlowCard from "../components/GlowCard";
import CountUp from "../components/CountUp";
import FadeIn from "../components/FadeIn";

type Item = Block & { id: string; day: string; missed?: boolean; movedFrom?: string };
type Step = { icon: string; title: string; detail: string };
type Move = { id: string; title: string; from: string; to: string; oldStart: string; oldEnd: string; start: string; end: string };

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const types: BlockType[] = ["academic", "skill", "career"];
const DAY_START = 8 * 60;
const DAY_END = 21 * 60;
const HEAVY = 4; // hours per day that count as a heavy day

const PRIORITY: Record<BlockType, number> = { academic: 0, skill: 1, career: 2, break: 3 };

const meta: Record<BlockType, { label: string; icon: string; bar: string; edge: string; text: string }> = {
  academic: { label: "Academics", icon: "bi-book", bar: "from-violet-500 to-indigo-400", edge: "border-l-violet-400", text: "text-violet-300" },
  skill: { label: "Skills", icon: "bi-code-slash", bar: "from-emerald-400 to-teal-300", edge: "border-l-emerald-400", text: "text-emerald-300" },
  career: { label: "Career", icon: "bi-briefcase", bar: "from-amber-400 to-orange-300", edge: "border-l-amber-400", text: "text-amber-300" },
  break: { label: "Break", icon: "bi-cup-hot", bar: "from-slate-400 to-slate-300", edge: "border-l-slate-400", text: "text-slate-300" },
};

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const hoursOf = (b: Block) => (toMin(b.end) - toMin(b.start)) / 60;
const fmt = (h: number) => String(Number(h.toFixed(1)));
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function flatten(plan: WeeklyPlan): Item[] {
  return days.flatMap((d) =>
    (Array.isArray(plan[d]) ? plan[d] : []).map((b, i) => ({ ...b, id: `${d}-${i}`, day: d }))
  );
}

function loadOf(list: Item[], day: string, skipMissed = false) {
  return list
    .filter((i) => i.day === day && !(skipMissed && i.missed))
    .reduce((s, i) => s + hoursOf(i), 0);
}

// First free time window on a day (tries the original start time first)
function findSlot(list: Item[], day: string, dur: number, preferred: number): number | null {
  const busy = list.filter((i) => i.day === day && !i.missed).map((i) => [toMin(i.start), toMin(i.end)]);
  const free = (s: number) => busy.every(([a, b]) => s + dur <= a || s >= b);
  if (preferred >= DAY_START && preferred + dur <= DAY_END && free(preferred)) return preferred;
  for (let s = DAY_START; s + dur <= DAY_END; s += 30) if (free(s)) return s;
  return null;
}

// The agent's decision logic
function planMoves(list: Item[]) {
  const work: Item[] = list.map((i) => ({ ...i }));
  const queue = work
    .filter((i) => i.missed)
    .sort((a, b) => PRIORITY[a.type] - PRIORITY[b.type] || days.indexOf(a.day) - days.indexOf(b.day));
  const moves: Move[] = [];
  const failed: Item[] = [];

  for (const item of queue) {
    const dur = toMin(item.end) - toMin(item.start);
    const fromIdx = days.indexOf(item.day);
    let pool = days.filter((d) => days.indexOf(d) > fromIdx); // can't re-plan into the past
    if (pool.length === 0) pool = days.filter((d) => d !== item.day);

    const ranked = pool
      .map((d) => ({ d, load: loadOf(work, d, true) }))
      .sort((a, b) => a.load - b.load);

    let placed = false;
    for (const c of ranked) {
      const slot = findSlot(work, c.d, dur, toMin(item.start));
      if (slot !== null) {
        moves.push({
          id: item.id, title: item.title, from: item.day, to: c.d,
          oldStart: item.start, oldEnd: item.end, start: toTime(slot), end: toTime(slot + dur),
        });
        item.movedFrom = item.day;
        item.day = c.d;
        item.start = toTime(slot);
        item.end = toTime(slot + dur);
        item.missed = false;
        placed = true;
        break;
      }
    }
    if (!placed) failed.push(item);
  }
  return { result: work, moves, failed };
}

export default function TimetablePage() {
  const [source, setSource] = useState<WeeklyPlan>(demoPlan);
  const [items, setItems] = useState<Item[]>(() => flatten(demoPlan));
  const [live, setLive] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [running, setRunning] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // Read the clock after load (avoids server/browser time mismatch)
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  // Ask the backend for the weekly plan
  useEffect(() => {
    if (!USER_ID) return;
    getSchedule(USER_ID)
      .then((d) => {
        if (d && typeof d.weekly_plan === "object" && d.weekly_plan !== null) {
          setSource(d.weekly_plan);
          setItems(flatten(d.weekly_plan));
          setLive(true);
        }
      })
      .catch(() => setLive(false));
  }, []);

  const itemsOf = (d: string) =>
    items.filter((i) => i.day === d).sort((a, b) => toMin(a.start) - toMin(b.start));

  const todayIndex = now ? (now.getDay() + 6) % 7 : -1; // Monday = 0
  const nowMin = now ? now.getHours() * 60 + now.getMinutes() : -1;

  const total = items.reduce((s, b) => s + hoursOf(b), 0);
  const by = (t: BlockType) => items.filter((b) => b.type === t).reduce((s, b) => s + hoursOf(b), 0);
  const pct = (h: number) => (total ? Math.round((h / total) * 100) : 0);
  const missedCount = items.filter((i) => i.missed).length;

  const todayBlocks = todayIndex >= 0 ? itemsOf(days[todayIndex]).filter((b) => !b.missed) : [];
  const doneToday = todayBlocks.filter((b) => toMin(b.end) <= nowMin).length;
  const nextBlock = todayBlocks.find((b) => toMin(b.start) > nowMin);

  const stats = [
    { label: "Total hours", value: total, icon: "bi-clock-history", color: "text-white/50" },
    { label: "Academics", value: by("academic"), icon: meta.academic.icon, color: meta.academic.text },
    { label: "Skills", value: by("skill"), icon: meta.skill.icon, color: meta.skill.text },
    { label: "Career", value: by("career"), icon: meta.career.icon, color: meta.career.text },
  ];

  function toggleMissed(id: string) {
    if (running) return;
    setItems(items.map((i) => (i.id === id ? { ...i, missed: !i.missed, movedFrom: undefined } : i)));
  }

  // Demo helper: pretend a whole day was missed
  function simulate() {
    if (running) return;
    const day = days.find((d) => items.some((i) => i.day === d && !i.missed));
    if (!day) return;
    setSteps([]);
    setItems(items.map((i) => (i.day === day ? { ...i, missed: true, movedFrom: undefined } : i)));
  }

  function reset() {
    if (running) return;
    setItems(flatten(source));
    setSteps([]);
  }

  async function run() {
    if (running) return;
    const missed = items.filter((i) => i.missed);
    setSteps([]);

    if (missed.length === 0) {
      setSteps([
        {
          icon: "bi-check2-circle",
          title: "Nothing to fix",
          detail: "No missed blocks. Click a block to mark it missed, or press “Simulate missed day”, then re-plan.",
        },
      ]);
      return;
    }

    setRunning(true);
    const push = (s: Step) => {
      if (alive.current) setSteps((p) => [...p, s]);
    };

    const { result, moves, failed } = planMoves(items);
    const before = Math.max(...days.map((d) => loadOf(items, d)));
    const after = Math.max(...days.map((d) => loadOf(result, d)));
    const missedHours = missed.reduce((s, i) => s + hoursOf(i), 0);

    push({
      icon: "bi-eye",
      title: "Observe",
      detail: `${missed.length} missed block${missed.length > 1 ? "s" : ""} (${fmt(missedHours)}h): ${missed.map((m) => m.title).join(", ")}.`,
    });
    await sleep(900);
    if (!alive.current) return;

    push({
      icon: "bi-cpu",
      title: "Reason",
      detail: `Checking free time on the days after each miss. Load now: ${days.map((d) => `${d} ${fmt(loadOf(items, d, true))}h`).join(" · ")}.`,
    });
    await sleep(1100);
    if (!alive.current) return;

    push({
      icon: "bi-list-ol",
      title: "Plan",
      detail: "Academics first, then skills, then career. Each block goes to the lightest day that has a free slot.",
    });
    await sleep(1000);

    for (const m of moves) {
      if (!alive.current) return;
      push({
        icon: "bi-arrow-left-right",
        title: `Moved “${m.title}”`,
        detail: `${m.from} ${m.oldStart}–${m.oldEnd}  →  ${m.to} ${m.start}–${m.end}`,
      });
      setItems((prev) =>
        prev.map((x) =>
          x.id === m.id ? { ...x, day: m.to, start: m.start, end: m.end, missed: false, movedFrom: m.from } : x
        )
      );
      await sleep(900);
    }

    for (const f of failed) {
      push({ icon: "bi-exclamation-triangle", title: `No free slot for “${f.title}”`, detail: "It stays marked as missed. Free some time and try again." });
    }

    await sleep(500);
    push({
      icon: "bi-graph-up-arrow",
      title: "Evaluate",
      detail: `${moves.length} block${moves.length === 1 ? "" : "s"} re-planned. Busiest day: ${fmt(before)}h → ${fmt(after)}h. Plan updated.`,
    });
    if (alive.current) setRunning(false);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-8">
      <Aurora />

      {/* Header */}
      <FadeIn>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/70">
          <span className="relative flex h-2 w-2">
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${live ? "bg-emerald-400" : "bg-white/40"}`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${live ? "bg-emerald-400" : "bg-white/40"}`} />
          </span>
          {live ? "Agent online · live plan" : "Agent online · demo plan"}
        </div>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Your <span className="text-gradient">weekly plan</span>
        </h1>
        <p className="mt-2 max-w-xl text-white/55">A balanced week of classes, skills and career prep, built and re-planned by the agent.</p>
      </FadeIn>

      {/* Stat cards */}
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s, i) => (
          <FadeIn key={s.label} delay={0.05 + i * 0.07}>
            <GlowCard className="p-4">
              <i className={`bi ${s.icon} text-lg ${s.color}`} />
              <div className="mt-2 text-3xl font-semibold">
                <CountUp value={s.value} decimals={1} />h
              </div>
              <div className="text-sm text-white/50">{s.label}</div>
            </GlowCard>
          </FadeIn>
        ))}
      </div>

      {/* Balance + Today's focus */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <FadeIn delay={0.3} className="lg:col-span-2">
          <GlowCard className="h-full p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-medium">Time balance</h3>
              <span className="text-xs text-white/45">{fmt(total)}h planned this week</span>
            </div>
            <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-white/10">
              {types.map((t) => (
                <motion.div
                  key={t}
                  className={`h-full bg-linear-to-r ${meta[t].bar}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct(by(t))}%` }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                />
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {types.map((t) => (
                <div key={t}>
                  <div className={`flex items-center gap-1.5 text-sm ${meta[t].text}`}>
                    <i className={`bi ${meta[t].icon}`} /> {meta[t].label}
                  </div>
                  <div className="mt-1 text-lg font-semibold">
                    {fmt(by(t))}h <span className="text-sm font-normal text-white/40">· {pct(by(t))}%</span>
                  </div>
                </div>
              ))}
            </div>
          </GlowCard>
        </FadeIn>

        <FadeIn delay={0.38}>
          <GlowCard className="h-full p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-violet-300">
              <i className="bi bi-bullseye" /> Today&apos;s focus
            </div>
            {todayIndex < 0 ? (
              <p className="text-sm text-white/40">Loading your day...</p>
            ) : todayBlocks.length === 0 ? (
              <p className="text-white/60">Nothing planned today. A good day to rest or catch up. ✨</p>
            ) : (
              <>
                <p className="text-lg leading-snug">
                  {nextBlock ? (
                    <>
                      Next up: <span className="font-semibold">{nextBlock.title}</span> at {nextBlock.start}
                    </>
                  ) : (
                    "All of today's blocks are done. Great work!"
                  )}
                </p>
                <p className="mt-1 text-sm text-white/45">
                  {doneToday} of {todayBlocks.length} blocks done
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-linear-to-r from-violet-400 to-cyan-300"
                    initial={{ width: 0 }}
                    animate={{ width: `${(doneToday / todayBlocks.length) * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </>
            )}
          </GlowCard>
        </FadeIn>
      </div>

      {/* Agent panel + workload */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <FadeIn delay={0.45} className="lg:col-span-2">
          <GlowCard className="h-full p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-violet-300">
                  <i className="bi bi-stars" /> Adaptive agent
                </div>
                <p className="mt-1 text-sm text-white/50">
                  {missedCount > 0
                    ? `${missedCount} block${missedCount > 1 ? "s" : ""} marked as missed. Ready to re-plan.`
                    : "Click a block below to mark it missed, or simulate a missed day."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={simulate}
                  disabled={running}
                  className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 disabled:opacity-40"
                >
                  <i className="bi bi-lightning-charge mr-1" /> Simulate missed day
                </button>
                <button
                  onClick={reset}
                  disabled={running}
                  className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 disabled:opacity-40"
                >
                  <i className="bi bi-arrow-counterclockwise mr-1" /> Reset
                </button>
                <motion.button
                  whileHover={{ scale: running ? 1 : 1.04 }}
                  whileTap={{ scale: running ? 1 : 0.95 }}
                  onClick={run}
                  disabled={running}
                  className="rounded-xl bg-linear-to-r from-violet-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 disabled:opacity-60"
                >
                  <i className={`bi ${running ? "bi-arrow-repeat" : "bi-magic"} mr-1`} />
                  {running ? "Agent working..." : "Re-plan my week"}
                </motion.button>
              </div>
            </div>

            {steps.length === 0 && !running && (
              <div className="mt-4 rounded-xl border border-dashed border-white/10 p-4 text-sm text-white/40">
                The agent is idle. Observe → Reason → Plan → Act → Evaluate will show up here.
              </div>
            )}

            <ul className="mt-4 flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {steps.map((s, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex gap-3 rounded-xl border border-white/10 bg-black/20 p-3"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-500/15 text-violet-300">
                      <i className={`bi ${s.icon}`} />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{s.title}</div>
                      <div className="text-sm text-white/50">{s.detail}</div>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            {running && <div className="mt-3 animate-pulse text-xs text-white/40">Agent is thinking...</div>}
          </GlowCard>
        </FadeIn>

        <FadeIn delay={0.52}>
          <GlowCard className="h-full p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-medium">Workload by day</h3>
              <span className="text-xs text-white/45">Heavy = {HEAVY}h+</span>
            </div>
            <div className="flex items-end gap-2">
              {days.map((d) => {
                const l = loadOf(items, d);
                const heavy = l >= HEAVY;
                return (
                  <div key={d} className="flex flex-1 flex-col items-center gap-1">
                    <span className="h-3 text-[10px] text-white/40">{l ? fmt(l) : ""}</span>
                    <div className="flex h-24 w-full items-end overflow-hidden rounded-md bg-white/5">
                      <motion.div
                        className={`w-full rounded-md bg-linear-to-t ${heavy ? "from-rose-500 to-orange-400" : "from-violet-500 to-cyan-400"}`}
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.min(100, (l / 6) * 100)}%` }}
                        transition={{ type: "spring", stiffness: 120, damping: 18 }}
                      />
                    </div>
                    <span className="text-[10px] text-white/50">{d}</span>
                  </div>
                );
              })}
            </div>
          </GlowCard>
        </FadeIn>
      </div>

      {/* Week grid */}
      <p className="mt-8 text-xs text-white/40">Tip: click a block to mark it as missed, then press “Re-plan my week”.</p>
      <div className="mt-2 overflow-x-auto pb-3">
        <div className="grid min-w-[980px] grid-cols-7 gap-3">
          {days.map((d, i) => {
            const blocks = itemsOf(d);
            const isToday = i === todayIndex;
            const dayHours = blocks.reduce((s, b) => s + hoursOf(b), 0);
            return (
              <FadeIn key={d} delay={0.55 + i * 0.05}>
                <GlowCard
                  className={`min-h-[280px] p-3 ${
                    isToday ? "border-violet-400/60 shadow-[0_0_40px_-12px_rgba(124,92,255,0.8)]" : ""
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className={`text-sm font-semibold ${isToday ? "text-violet-300" : "text-white/60"}`}>{d}</div>
                    {isToday ? (
                      <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-200">Today</span>
                    ) : (
                      <span className="text-[11px] text-white/35">{dayHours ? `${fmt(dayHours)}h` : ""}</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {blocks.map((b, idx) => {
                      const m = meta[b.type] ?? meta.break;
                      const finished = isToday && !b.missed && toMin(b.end) <= nowMin;
                      const active = isToday && !b.missed && toMin(b.start) <= nowMin && nowMin < toMin(b.end);
                      return (
                        <motion.div
                          key={b.id}
                          onClick={() => toggleMissed(b.id)}
                          initial={{ opacity: 0, x: -12, scale: b.movedFrom ? 0.7 : 1 }}
                          animate={{ opacity: finished ? 0.45 : 1, x: 0, scale: 1 }}
                          transition={{ delay: b.movedFrom ? 0 : 0.7 + i * 0.05 + idx * 0.07, duration: 0.35 }}
                          whileHover={{ scale: 1.03 }}
                          className={`cursor-pointer rounded-lg border-l-4 p-2.5 text-sm ${
                            b.missed
                              ? "border-l-rose-400 bg-rose-500/10 ring-1 ring-rose-400/40"
                              : `bg-black/30 ${m.edge}`
                          } ${b.movedFrom ? "ring-1 ring-emerald-400/60" : ""} ${active ? "ring-1 ring-violet-400/70" : ""}`}
                        >
                          <div className="flex items-start gap-2">
                            <i className={`bi ${b.missed ? "bi-x-circle" : m.icon} mt-0.5 text-xs ${b.missed ? "text-rose-300" : m.text}`} />
                            <div className="min-w-0">
                              <div className={`leading-snug ${finished ? "line-through" : ""}`}>{b.title}</div>
                              <div className="mt-1 text-xs text-white/45">
                                {b.start} – {b.end} · {fmt(hoursOf(b))}h
                              </div>
                              {b.missed && <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-rose-300">✕ Missed</div>}
                              {b.movedFrom && !b.missed && (
                                <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">↪ Re-planned from {b.movedFrom}</div>
                              )}
                              {active && <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-violet-300">● In progress</div>}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                    {blocks.length === 0 && <p className="pt-6 text-center text-xs text-white/30">Free day ✨</p>}
                  </div>
                </GlowCard>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </main>
  );
}