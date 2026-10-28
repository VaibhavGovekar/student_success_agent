"use client";

import { useState, type FormEvent } from "react";
import { saveSchedule, type BlockType, type WeeklyPlan } from "../lib/api";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function PlanEditor({
  plan,
  userId,
  onSaved,
}: {
  plan: WeeklyPlan;
  userId: string;
  onSaved: (plan: WeeklyPlan) => void;
}) {
  const [day, setDay] = useState("Mon");
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [type, setType] = useState<BlockType>("academic");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function addBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!userId) {
      setMessage("Set NEXT_PUBLIC_DEMO_USER_ID to your student UUID before saving.");
      return;
    }
    if (end <= start) {
      setMessage("End time must be later than start time.");
      return;
    }

    const blocks = plan[day] ?? [];
    const overlaps = blocks.some((block) => start < block.end && end > block.start);
    if (overlaps) {
      setMessage(`That time overlaps another block on ${day}.`);
      return;
    }

    const nextPlan: WeeklyPlan = {
      ...plan,
      [day]: [...blocks, { title: title.trim(), start, end, type }]
        .sort((a, b) => a.start.localeCompare(b.start)),
    };

    setSaving(true);
    try {
      await saveSchedule(userId, nextPlan);
      onSaved(nextPlan);
      setTitle("");
      setMessage("Your block was added and saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save your block.");
    } finally {
      setSaving(false);
    }
  }

  async function removeBlock(dayName: string, blockIndex: number) {
    setMessage("");
    const nextPlan = {
      ...plan,
      [dayName]: (plan[dayName] ?? []).filter((_, index) => index !== blockIndex),
    };
    setSaving(true);
    try {
      await saveSchedule(userId, nextPlan);
      onSaved(nextPlan);
      setMessage("Block removed from your saved plan.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update your plan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-lg font-semibold">Build your own week</h2>
      <p className="mt-1 text-sm text-white/50">Add a block with your preferred day, time, and focus. It saves to your account.</p>
      <form onSubmit={addBlock} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <label className="text-xs text-white/55">
          Day
          <select value={day} onChange={(event) => setDay(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#11121d] p-2.5 text-sm text-white">
            {days.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-xs text-white/55 sm:col-span-2">
          What are you planning?
          <input required maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Revise database systems" className="mt-1 w-full rounded-lg border border-white/10 bg-[#11121d] p-2.5 text-sm text-white placeholder:text-white/25" />
        </label>
        <label className="text-xs text-white/55">
          Start
          <input required type="time" value={start} onChange={(event) => setStart(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#11121d] p-2.5 text-sm text-white" />
        </label>
        <label className="text-xs text-white/55">
          End
          <input required type="time" value={end} onChange={(event) => setEnd(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#11121d] p-2.5 text-sm text-white" />
        </label>
        <label className="text-xs text-white/55">
          Focus
          <select value={type} onChange={(event) => setType(event.target.value as BlockType)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#11121d] p-2.5 text-sm text-white">
            <option value="academic">Academics</option>
            <option value="skill">Skills</option>
            <option value="career">Career</option>
            <option value="break">Break</option>
          </select>
        </label>
        <div className="sm:col-span-2 lg:col-span-6 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={saving} className="rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50">
            {saving ? "Saving..." : "Add block to my week"}
          </button>
          {message && <p role="status" className="text-sm text-white/60">{message}</p>}
        </div>
      </form>
      {days.some((item) => (plan[item] ?? []).length > 0) && (
        <div className="mt-5 space-y-2">
          <h3 className="text-sm font-medium text-white/70">Your blocks</h3>
          {days.flatMap((dayName) => (plan[dayName] ?? []).map((block, index) => (
            <div key={`${dayName}-${block.start}-${block.title}`} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-black/15 px-3 py-2 text-sm">
              <span className="min-w-0 truncate text-white/75">{dayName} · {block.start}–{block.end} · {block.title}</span>
              <button type="button" disabled={saving} onClick={() => removeBlock(dayName, index)} className="shrink-0 text-xs text-rose-300 hover:text-rose-200 disabled:opacity-50">Remove</button>
            </div>
          )))}
        </div>
      )}
    </section>
  );
}
