"use client";

import { useEffect, useState } from "react";
import { getSchedule, USER_ID, type Block, type BlockType, type WeeklyPlan } from "../../lib/api";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Demo plan. It shows when the backend is not connected.
const demoPlan: WeeklyPlan = {
  Mon: [
    { start: "09:00", end: "11:00", title: "Python assignment", type: "academic" },
    { start: "16:00", end: "17:00", title: "React basics", type: "skill" },
  ],
  Tue: [
    { start: "10:00", end: "13:00", title: "Study for Java exam", type: "academic" },
    { start: "17:00", end: "18:00", title: "Apply to 2 internships", type: "career" },
  ],
  Wed: [
    { start: "09:00", end: "10:00", title: "Maths notes", type: "academic" },
    { start: "15:00", end: "16:30", title: "SQL practice", type: "skill" },
  ],
  Thu: [
    { start: "10:00", end: "12:00", title: "Java revision", type: "academic" },
    { start: "16:00", end: "17:00", title: "Update resume", type: "career" },
  ],
  Fri: [
    { start: "09:00", end: "11:00", title: "Mini project", type: "academic" },
    { start: "15:00", end: "16:00", title: "Git practice", type: "skill" },
  ],
  Sat: [{ start: "11:00", end: "13:00", title: "Project work", type: "skill" }],
  Sun: [{ start: "18:00", end: "19:00", title: "Weekly review", type: "career" }],
};

const style: Record<BlockType, string> = {
  academic: "border-l-[#6c7bff]",
  skill: "border-l-emerald-400",
  career: "border-l-yellow-400",
  break: "border-l-[#8b90b0]",
};

const hours = (b: Block) => {
  const [sh, sm] = b.start.split(":").map(Number);
  const [eh, em] = b.end.split(":").map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
};

export default function TimetablePage() {
  const [plan, setPlan] = useState<WeeklyPlan>(demoPlan);
  const [live, setLive] = useState(false);

  // Ask the backend for the weekly plan when the page opens
  useEffect(() => {
    if (!USER_ID) return; // no user id yet, so stay on demo data
    getSchedule(USER_ID)
      .then((d) => {
        if (d && typeof d.weekly_plan === "object" && d.weekly_plan !== null) {
          setPlan(d.weekly_plan);
          setLive(true);
        }
      })
      .catch(() => setLive(false));
  }, []);

  // Safe lookup: if a day is missing or not a list, treat it as a free day
  const blocksOf = (d: string): Block[] => (Array.isArray(plan[d]) ? plan[d] : []);

  const todayIndex = (new Date().getDay() + 6) % 7; // Monday = 0
  const all = days.flatMap(blocksOf);
  const total = all.reduce((s, b) => s + hours(b), 0);
  const by = (t: BlockType) => all.filter((b) => b.type === t).reduce((s, b) => s + hours(b), 0);

  return (
    <main className="min-h-screen bg-[#0f1220] p-8 text-[#e8eaf6]">
      <h1 className="text-3xl font-bold">Weekly Timetable 🗓️</h1>
      <p className="mt-1 text-[#8b90b0]">Your study plan made by the agent.</p>
      <span
        className={`mt-2 inline-block rounded-full px-3 py-1 text-xs ${
          live ? "bg-emerald-400/15 text-emerald-300" : "bg-[#262b45] text-[#8b90b0]"
        }`}
      >
        {live ? "● Live data" : "○ Demo data"}
      </span>

      <div className="my-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ["Total hours", total],
          ["Academics", by("academic")],
          ["Skills", by("skill")],
          ["Career", by("career")],
        ].map(([label, n]) => (
          <div key={label} className="rounded-2xl border border-[#262b45] bg-[#181c30] p-4">
            <div className="text-2xl font-bold">{n}h</div>
            <div className="text-sm text-[#8b90b0]">{label}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex gap-4 text-sm text-[#8b90b0]">
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#6c7bff]" />Academics</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />Skills</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-yellow-400" />Career</span>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="grid grid-cols-7 gap-3" style={{ minWidth: 900 }}>
          {days.map((d, i) => (
            <div
              key={d}
              className={`min-h-[260px] rounded-2xl border bg-[#181c30] p-3 ${i === todayIndex ? "border-[#6c7bff]" : "border-[#262b45]"}`}
            >
              <h4 className={`mb-3 text-sm font-semibold ${i === todayIndex ? "text-[#6c7bff]" : "text-[#8b90b0]"}`}>
                {d} {i === todayIndex && "· Today"}
              </h4>
              <div className="flex flex-col gap-2">
                {blocksOf(d).map((b, idx) => (
                  <div key={idx} className={`rounded-lg border-l-4 bg-[#0f1220] p-2 text-sm ${style[b.type] ?? style.break}`}>
                    <div>{b.title}</div>
                    <div className="mt-1 text-xs text-[#8b90b0]">{b.start} – {b.end}</div>
                  </div>
                ))}
                {blocksOf(d).length === 0 && <p className="text-xs text-[#8b90b0]">Free day</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}