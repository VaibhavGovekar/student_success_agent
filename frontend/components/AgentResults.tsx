"use client";

import type { AgentPlanResult } from "../lib/api";

export default function AgentResults({ result }: { result: AgentPlanResult }) {
  const priorities = { high: "text-rose-300", medium: "text-amber-200", low: "text-emerald-300" };

  return (
    <section className="mt-4 rounded-2xl border border-violet-300/20 bg-violet-400/[0.04] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-violet-200">Agent run results</h2>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs ${result.recommendation_source === "gemini" ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-200"}`}>
            {result.recommendation_source === "gemini" ? "Gemini AI" : "Rules fallback"}
          </span>
          <span className={`rounded-full px-2.5 py-1 text-xs ${result.recovery_schedule ? "bg-orange-400/10 text-orange-200" : "bg-white/10 text-white/65"}`}>
            {result.recovery_schedule ? "Overdue recovery plan" : "Regular plan"}
          </span>
        </div>
      </div>
      <p className="mt-1 text-xs text-white/50">
        Available study time: {result.available_hours_per_day}h/day · Replanning {result.replanning_attempted ? "was needed" : "was not needed"}.
      </p>
      {result.recommendation_fallback_reason && (
        <p className="mt-2 text-sm text-amber-200/80">Gemini note: {result.recommendation_fallback_reason}</p>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/[0.08] bg-black/15 p-4">
          <h3 className="text-sm font-semibold text-white/85">1 · Task priority scores</h3>
          {!result.ranked_tasks.length ? (
            <p className="mt-3 text-sm text-white/50">No tasks to prioritize.</p>
          ) : (
            <ol className="mt-3 space-y-2">
              {result.ranked_tasks.map((task, index) => (
                <li key={task.id ?? `${task.title}-${index}`} className="rounded-lg border border-white/[0.07] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-white/85">{index + 1}. {task.title}</span>
                    <span className="text-xs text-violet-200">Score {task.priority_score}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/45">Due {task.due_date} · {task.duration_hours}h estimated</p>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-white/[0.08] bg-black/15 p-4">
            <h3 className="text-sm font-semibold text-white/85">2 · AI recommendations</h3>
            {!result.recommendations.length ? (
              <p className="mt-3 text-sm text-white/50">No task recommendations returned.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {result.recommendations.map((item, index) => (
                  <li key={item.task_id ?? `${item.task_title}-${index}`} className="rounded-lg border border-white/[0.07] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-white/85">{item.task_title}</span>
                      <span className={`text-xs font-semibold uppercase ${priorities[item.priority]}`}>{item.priority}</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-white/55">{item.priority_reason}</p>
                    <p className="mt-1 text-xs text-white/70">Suggested study: {item.recommended_study_hours}h</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-black/15 p-4">
            <h3 className="text-sm font-semibold text-white/85">3 · Proposed schedule</h3>
            {!result.schedule.length ? (
              <p className="mt-3 text-sm text-white/50">No blocks could be scheduled. Check the validation details below.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {result.schedule.map((block, index) => (
                  <li key={`${block.title}-${block.scheduled_date}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.07] px-3 py-2 text-xs">
                    <span className="font-medium text-white/80">{block.title}</span>
                    <span className="text-white/50">{block.scheduled_date} · {String(block.start_hour).padStart(2, "0")}:00–{String(block.end_hour).padStart(2, "0")}:00</span>
                    {block.recovery_mode && <span className="text-orange-200">Recovery</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-black/15 p-4">
            <h3 className="text-sm font-semibold text-white/85">4 · Validation and overdue recovery</h3>
            <p className={`mt-2 text-sm font-bold ${result.success ? "text-emerald-300" : "text-rose-300"}`}>
              {result.success ? "SCHEDULE VALID" : "SCHEDULE INVALID"}
            </p>
            {result.replanning_attempted && result.initial_validation_errors.length > 0 && (
              <p className="mt-1 text-xs text-amber-200/80">Initial plan needed replanning: {result.initial_validation_errors.join(" ")}</p>
            )}
            {result.validation_errors.length > 0 && (
              <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-rose-200/80">
                {result.validation_errors.map((error, index) => <li key={index}>{error}</li>)}
              </ul>
            )}
            {result.missed_deadline_warnings.length > 0 ? (
              <div className="mt-3 rounded-lg border border-orange-300/15 bg-orange-300/[0.05] p-3">
                <p className="text-xs font-semibold text-orange-200">Overdue tasks · recovery schedule</p>
                <ul className="mt-1 space-y-1 text-xs text-white/60">
                  {result.missed_deadline_warnings.map((warning, index) => <li key={index}>{warning}</li>)}
                </ul>
              </div>
            ) : (
              <p className="mt-2 text-xs text-white/45">No overdue tasks detected.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
