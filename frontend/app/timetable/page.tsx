"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import "bootstrap-icons/font/bootstrap-icons.css";
import { getSchedule, generateAgentPlan, emptyPlan, USER_ID, type AgentPlanResult, type Block, type BlockType, type WeeklyPlan } from "../../lib/api";
import PlanEditor from "../../components/PlanEditor";
import AgentResults from "../../components/AgentResults";
import Aurora from "../../components/Aurora";
import GlowCard from "../../components/GlowCard";
import CountUp from "../../components/CountUp";
import FadeIn from "../../components/FadeIn";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const types: BlockType[] = ["academic", "skill", "career"];

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
const hoursOf = (b: Block) => (toMin(b.end) - toMin(b.start)) / 60;
const fmt = (h: number) => String(Number(h.toFixed(1)));

export default function TimetablePage() {
  const [plan, setPlan] = useState<WeeklyPlan>(emptyPlan);
  const [live, setLive] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [agentResult, setAgentResult] = useState<AgentPlanResult | null>(null);

  // Read the clock after the page loads (avoids server/browser time mismatch)
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
          setPlan(d.weekly_plan);
          setLive(d.saved === true);
        }
      })
      .catch(() => setLive(false));
  }, []);

  const blocksOf = (d: string): Block[] =>
    Array.isArray(plan[d]) ? [...plan[d]].sort((a, b) => toMin(a.start) - toMin(b.start)) : [];

  const todayIndex = now ? (now.getDay() + 6) % 7 : -1; // Monday = 0
  const nowMin = now ? now.getHours() * 60 + now.getMinutes() : -1;

  const all = days.flatMap(blocksOf);
  const total = all.reduce((s, b) => s + hoursOf(b), 0);
  const by = (t: BlockType) => all.filter((b) => b.type === t).reduce((s, b) => s + hoursOf(b), 0);
  const pct = (h: number) => (total ? Math.round((h / total) * 100) : 0);

  const todayBlocks = todayIndex >= 0 ? blocksOf(days[todayIndex]) : [];
  const doneToday = todayBlocks.filter((b) => toMin(b.end) <= nowMin).length;
  const nextBlock = todayBlocks.find((b) => toMin(b.start) > nowMin);

  const stats = [
    { label: "Total hours", value: total, icon: "bi-clock-history", color: "text-white/50" },
    { label: "Academics", value: by("academic"), icon: meta.academic.icon, color: meta.academic.text },
    { label: "Skills", value: by("skill"), icon: meta.skill.icon, color: meta.skill.text },
    { label: "Career", value: by("career"), icon: meta.career.icon, color: meta.career.text },
  ];

  async function askAgentToPlan() {
    if (!USER_ID || generating) return;
    setGenerating(true);
    setError("");
    try {
      const result = await generateAgentPlan(USER_ID);
      setPlan(result.weekly_plan);
      setLive(true);
      setAgentResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The AI planner could not create a plan.");
    } finally {
      setGenerating(false);
    }
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
          {live ? "Your saved plan" : "No saved plan yet"}
        </div>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Your <span className="text-gradient">weekly plan</span>
        </h1>
        <p className="mt-2 max-w-xl text-white/55">Add your own blocks or generate a plan from your tasks.</p>
      </FadeIn>

      <PlanEditor plan={plan} userId={USER_ID} onSaved={(savedPlan) => { setPlan(savedPlan); setLive(true); setAgentResult(null); }} />

      <section className="mt-4 rounded-2xl border border-violet-300/20 bg-violet-400/[0.04] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-violet-200">AI study planner</h2>
            <p className="mt-1 text-sm text-white/50">Prioritizes your pending tasks, explains its recommendations, and saves a weekly plan.</p>
          </div>
          <button onClick={askAgentToPlan} disabled={!USER_ID || generating} className="rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50">
            <i className={`bi ${generating ? "bi-arrow-repeat" : "bi-stars"} mr-1`} />
            {generating ? "AI is planning..." : "Ask AI to plan my week"}
          </button>
        </div>
        {!USER_ID && <p className="mt-3 text-sm text-amber-200">Set NEXT_PUBLIC_DEMO_USER_ID to your student UUID to enable the planner.</p>}
        {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
      </section>
      {agentResult && <AgentResults result={agentResult} />}

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

      {/* Week grid */}
      <div className="mt-8 overflow-x-auto pb-3">
        <div className="grid min-w-[980px] grid-cols-7 gap-3">
          {days.map((d, i) => {
            const blocks = blocksOf(d);
            const isToday = i === todayIndex;
            const dayHours = blocks.reduce((s, b) => s + hoursOf(b), 0);
            return (
              <FadeIn key={d} delay={0.45 + i * 0.05}>
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
                      const finished = isToday && toMin(b.end) <= nowMin;
                      const active = isToday && toMin(b.start) <= nowMin && nowMin < toMin(b.end);
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: finished ? 0.45 : 1, x: 0 }}
                          transition={{ delay: 0.6 + i * 0.05 + idx * 0.07, duration: 0.35 }}
                          whileHover={{ scale: 1.03 }}
                          className={`rounded-lg border-l-4 bg-black/30 p-2.5 text-sm ${m.edge} ${
                            active ? "ring-1 ring-violet-400/70" : ""
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <i className={`bi ${m.icon} mt-0.5 text-xs ${m.text}`} />
                            <div className="min-w-0">
                              <div className={`leading-snug ${finished ? "line-through" : ""}`}>{b.title}</div>
                              <div className="mt-1 text-xs text-white/45">
                                {b.start} – {b.end} · {fmt(hoursOf(b))}h
                              </div>
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
