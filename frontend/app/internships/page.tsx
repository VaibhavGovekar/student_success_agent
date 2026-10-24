"use client";

import { useEffect, useState } from "react";
import { matchInternships, USER_ID, type Match } from "../../lib/api";

// Demo data. It shows when the backend is not connected.
const demoMatches: Match[] = [
  { id: "1", title: "Frontend Developer Intern", company: "PixelWorks", role_description: "Build responsive UI with React and Next.js. Work with designers on new features.", min_cgpa: 7.0, similarity: 0.91 },
  { id: "2", title: "Python Backend Intern", company: "DataLeaf", role_description: "Build APIs with FastAPI and Postgres. Basic knowledge of SQL needed.", min_cgpa: 7.5, similarity: 0.84 },
  { id: "3", title: "AI/ML Intern", company: "InsightLabs", role_description: "Work on embeddings and vector search. Python and basic ML required.", min_cgpa: 8.0, similarity: 0.76 },
  { id: "4", title: "Web Developer Intern", company: "CodeNest", role_description: "Maintain HTML, CSS and JavaScript websites for clients.", min_cgpa: 6.5, similarity: 0.68 },
  { id: "5", title: "Data Analyst Intern", company: "ServerSide", role_description: "Clean datasets and build dashboards. SQL and Python helpful.", min_cgpa: 7.0, similarity: 0.52 },
  { id: "6", title: "Cloud Engineering Intern", company: "NimbusTech", role_description: "Assist with deployments on AWS. Linux and networking basics.", min_cgpa: 8.5, similarity: 0.47 },
];

function levelOf(pct: number) {
  if (pct >= 80) return { badge: "bg-emerald-400/15 text-emerald-300", bar: "bg-emerald-400" };
  if (pct >= 60) return { badge: "bg-yellow-400/15 text-yellow-300", bar: "bg-yellow-400" };
  return { badge: "bg-red-400/15 text-red-300", bar: "bg-red-400" };
}

export default function InternshipsPage() {
  const [matches, setMatches] = useState<Match[]>(demoMatches);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cgpa, setCgpa] = useState(8.0);
  const [minMatch, setMinMatch] = useState(0);
  const [search, setSearch] = useState("");

  // Ask the backend for matches
  async function findMatches() {
    if (!USER_ID) return; // no user id yet, so stay on demo data
    setLoading(true);
    try {
      const data = await matchInternships(USER_ID, cgpa);
      setMatches(data);
      setLive(true);
    } catch {
      setLive(false);
    }
    setLoading(false);
  }

  // Run once when the page opens
  useEffect(() => {
    findMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown = matches
    .filter((m) => m.min_cgpa <= cgpa) // the database function does this too
    .filter((m) => Math.round(m.similarity * 100) >= minMatch)
    .filter((m) => (m.title + " " + m.company).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.similarity - a.similarity);

  const field = "rounded-xl border border-[#262b45] bg-[#181c30] px-3 py-2 text-sm text-[#e8eaf6] outline-none focus:border-[#6c7bff]";

  return (
    <main className="min-h-screen bg-[#0f1220] p-8 text-[#e8eaf6]">
      <h1 className="text-3xl font-bold">Internship Matches 🔎</h1>
      <p className="mt-1 text-[#8b90b0]">Roles matched to your skills by the agent.</p>
      <span
        className={`mt-2 inline-block rounded-full px-3 py-1 text-xs ${
          live ? "bg-emerald-400/15 text-emerald-300" : "bg-[#262b45] text-[#8b90b0]"
        }`}
      >
        {live ? "● Live data" : "○ Demo data"}
      </span>

      <div className="my-6 flex flex-wrap items-center gap-3">
        <input className={`${field} min-w-[220px] flex-1`} placeholder="Search role or company..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-[#8b90b0]">
          Your CGPA
          <input className={`${field} w-24`} type="number" step="0.1" min={0} max={10} value={cgpa} onChange={(e) => setCgpa(Number(e.target.value))} />
        </label>
        <select className={field} value={minMatch} onChange={(e) => setMinMatch(Number(e.target.value))}>
          <option value={0}>Any match</option>
          <option value={60}>60%+ match</option>
          <option value={80}>80%+ match</option>
        </select>
        <button
          onClick={findMatches}
          disabled={loading}
          className="rounded-xl bg-[#6c7bff] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Finding..." : "Find matches"}
        </button>
      </div>

      <p className="mb-4 text-sm text-[#8b90b0]">{shown.length} internship(s) found</p>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((m) => {
          const pct = Math.round(m.similarity * 100);
          const lv = levelOf(pct);
          return (
            <div key={m.id} className="flex flex-col gap-3 rounded-2xl border border-[#262b45] bg-[#181c30] p-5 hover:border-[#6c7bff]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{m.title}</h3>
                  <p className="text-sm text-[#8b90b0]">{m.company}</p>
                </div>
                <span className={`whitespace-nowrap rounded-full px-3 py-1 text-sm font-bold ${lv.badge}`}>{pct}% match</span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-[#262b45]">
                <div className={`h-full ${lv.bar}`} style={{ width: `${pct}%` }} />
              </div>

              <p className="text-sm text-[#c5c9e6]">{m.role_description}</p>

              <div className="mt-auto flex flex-wrap gap-2">
                <span className="rounded-full bg-[#262b45] px-3 py-1 text-xs text-[#8b90b0]">Min CGPA {Number(m.min_cgpa).toFixed(1)}</span>
              </div>
            </div>
          );
        })}
        {shown.length === 0 && <p className="text-[#8b90b0]">No internships match your filters.</p>}
      </div>
    </main>
  );
}