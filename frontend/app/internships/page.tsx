
"use client";

import { useEffect, useState } from "react";
import { matchInternships, USER_ID, type Match } from "../../lib/api";

const demoMatches: Match[] = [
  { id: "1", title: "Frontend Developer Intern", company: "PixelWorks", role_description: "Build responsive UI with React and Next.js. Work with designers on new features.", min_cgpa: 7.0, similarity: 0.91 },
  { id: "2", title: "Python Backend Intern", company: "DataLeaf", role_description: "Build APIs with FastAPI and Postgres. Basic knowledge of SQL needed.", min_cgpa: 7.5, similarity: 0.84 },
  { id: "3", title: "AI/ML Intern", company: "InsightLabs", role_description: "Work on embeddings and vector search. Python and basic ML required.", min_cgpa: 8.0, similarity: 0.76 },
  { id: "4", title: "Web Developer Intern", company: "CodeNest", role_description: "Maintain HTML, CSS and JavaScript websites for clients.", min_cgpa: 6.5, similarity: 0.68 },
  { id: "5", title: "Data Analyst Intern", company: "ServerSide", role_description: "Clean datasets and build dashboards. SQL and Python helpful.", min_cgpa: 7.0, similarity: 0.52 },
  { id: "6", title: "Cloud Engineering Intern", company: "NimbusTech", role_description: "Assist with deployments on AWS. Linux and networking basics.", min_cgpa: 8.5, similarity: 0.47 },
];

function levelOf(pct: number) {
  if (pct >= 80)
    return {
      badge: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
      bar: "from-emerald-400 to-teal-300",
      dot: "bg-emerald-300",
    };
  if (pct >= 60)
    return {
      badge: "border-amber-400/20 bg-amber-400/10 text-amber-300",
      bar: "from-amber-400 to-yellow-300",
      dot: "bg-amber-300",
    };
  return {
    badge: "border-rose-400/20 bg-rose-400/10 text-rose-300",
    bar: "from-rose-400 to-pink-300",
    dot: "bg-rose-300",
  };
}

export default function InternshipsPage() {
  const [matches, setMatches] = useState<Match[]>(demoMatches);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cgpa, setCgpa] = useState(8.0);
  const [minMatch, setMinMatch] = useState(0);
  const [search, setSearch] = useState("");

  async function findMatches() {
    if (!USER_ID) return;

    setLoading(true);
    try {
      const data = await matchInternships(USER_ID, cgpa);
      setMatches(data);
      setLive(true);
    } catch {
      setLive(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    findMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown = matches
    .filter((m) => m.min_cgpa <= cgpa)
    .filter((m) => Math.round(m.similarity * 100) >= minMatch)
    .filter((m) =>
      `${m.title} ${m.company} ${m.role_description}`
        .toLowerCase()
        .includes(search.toLowerCase())
    )
    .sort((a, b) => b.similarity - a.similarity);

  const highMatches = shown.filter((m) => m.similarity >= 0.8).length;

  const field =
    "w-full rounded-xl border border-white/[0.09] bg-[#0c0d16] px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/10";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090a12] text-white">
      <div className="pointer-events-none absolute -top-48 left-[15%] h-[440px] w-[440px] rounded-full bg-violet-600/[0.12] blur-[140px]" />
      <div className="pointer-events-none absolute right-[-160px] top-[360px] h-[360px] w-[360px] rounded-full bg-indigo-500/[0.07] blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-8 sm:pt-12">
        {/* Header */}
        <section className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/[0.07] px-3 py-1.5 text-xs font-medium text-violet-200">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-300" />
              CAREER DISCOVERY
            </div>

            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Find your next{" "}
              <span className="bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent">
                opportunity.
              </span>
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-white/45 sm:text-base">
              Explore internships ranked by how closely they match your
              academic eligibility and career interests.
            </p>

            <span
              className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
                live
                  ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300"
                  : "border-white/[0.09] bg-white/[0.035] text-white/50"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  live ? "bg-emerald-300" : "bg-white/35"
                }`}
              />
              {live ? "Live backend data" : "Demo opportunities"}
            </span>
          </div>

          <div className="flex items-center gap-3 self-start rounded-2xl border border-white/[0.09] bg-[#11121d]/90 p-4 md:self-auto">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-400/10 text-xl text-violet-300">
              <i className="bi bi-stars" />
            </div>
            <div>
              <p className="text-xs text-white/40">Strong matches</p>
              <p className="mt-1 text-xl font-semibold">{highMatches}</p>
            </div>
          </div>
        </section>

        {/* Summary cards */}
        <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: "Matching roles",
              value: shown.length,
              icon: "bi-briefcase",
              color: "text-violet-300",
              tone: "bg-violet-400/10 border-violet-400/15",
            },
            {
              label: "80%+ compatibility",
              value: highMatches,
              icon: "bi-bullseye",
              color: "text-emerald-300",
              tone: "bg-emerald-400/10 border-emerald-400/15",
            },
            {
              label: "Your CGPA",
              value: cgpa.toFixed(1),
              icon: "bi-mortarboard",
              color: "text-sky-300",
              tone: "bg-sky-400/10 border-sky-400/15",
            },
            {
              label: "Minimum match",
              value: `${minMatch}%`,
              icon: "bi-sliders",
              color: "text-amber-300",
              tone: "bg-amber-400/10 border-amber-400/15",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="group rounded-2xl border border-white/[0.09] bg-[#11121d]/90 p-5 transition duration-300 hover:-translate-y-1 hover:border-violet-400/25"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-white/45 sm:text-sm">
                  {item.label}
                </span>
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${item.tone} ${item.color}`}
                >
                  <i className={`bi ${item.icon}`} />
                </span>
              </div>
              <p className="mt-4 text-2xl font-semibold tracking-tight">
                {item.value}
              </p>
            </div>
          ))}
        </section>

        {/* Search and filters */}
        <section className="mt-8 rounded-2xl border border-white/[0.09] bg-[#11121d]/90 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300">
              <i className="bi bi-funnel" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Refine your search</h2>
              <p className="mt-1 text-xs text-white/40">
                Adjust your eligibility and find relevant roles.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_minmax(150px,0.7fr)_minmax(150px,0.7fr)_auto] xl:items-end">
            <label className="block min-w-0">
              <span className="mb-2 block text-xs font-medium text-white/55">
                Search roles
              </span>
              <div className="relative">
                <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-white/30" />
                <input
                  className={`${field} pl-10`}
                  placeholder="Title, company, or skill..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-medium text-white/55">
                Your CGPA (out of 10)
              </span>
              <input
                className={field}
                type="number"
                step="0.1"
                min={0}
                max={10}
                value={cgpa}
                onChange={(e) =>
                  setCgpa(Math.min(10, Math.max(0, Number(e.target.value))))
                }
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-medium text-white/55">
                Match threshold
              </span>
              <select
                className={field}
                value={minMatch}
                onChange={(e) => setMinMatch(Number(e.target.value))}
              >
                <option value={0}>Any match</option>
                <option value={60}>60% and above</option>
                <option value={80}>80% and above</option>
              </select>
            </label>

            <button
              onClick={findMatches}
              disabled={loading || !USER_ID}
              title={!USER_ID ? "Showing demo opportunities" : "Refresh matches"}
              className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <i className={`bi ${loading ? "bi-arrow-repeat" : "bi-stars"}`} />
              {loading ? "Finding..." : "Refresh matches"}
            </button>
          </div>
        </section>

        {/* Results */}
        <section className="mt-9">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-300/70">
                Recommended for you
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">
                Internship opportunities
              </h2>
            </div>
            <p className="text-sm text-white/40">
              Showing{" "}
              <span className="font-medium text-white/75">{shown.length}</span>{" "}
              {shown.length === 1 ? "opportunity" : "opportunities"}
            </p>
          </div>

          <div className="mt-5 grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((m) => {
              const pct = Math.round(m.similarity * 100);
              const lv = levelOf(pct);

              return (
                <article
                  key={m.id}
                  className="group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-[#11121d]/90 p-5 transition duration-300 hover:-translate-y-1 hover:border-violet-400/30 hover:shadow-[0_16px_45px_rgba(0,0,0,0.2)] sm:p-6"
                >
                  <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-violet-500/[0.06] blur-3xl transition group-hover:bg-violet-500/[0.12]" />

                  <div className="relative flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-lg text-violet-300">
                      <i className="bi bi-building" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-base font-semibold leading-6 text-white/90">
                        {m.title}
                      </h3>
                      <p className="mt-1 text-sm text-white/45">{m.company}</p>
                    </div>
                  </div>

                  <div className="relative mt-6 rounded-xl border border-white/[0.06] bg-black/15 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-white/45">
                        Compatibility score
                      </span>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${lv.badge}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${lv.dot}`} />
                        {pct}%
                      </span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${lv.bar} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <p className="mt-5 flex-1 text-sm leading-6 text-white/55">
                    {m.role_description}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
                    <span className="inline-flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-xs text-white/50">
                      <i className="bi bi-mortarboard text-violet-300" />
                      Min. CGPA {Number(m.min_cgpa).toFixed(1)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-white/35">
                      <i className="bi bi-check-circle" />
                      {cgpa >= m.min_cgpa ? "CGPA eligible" : "CGPA required"}
                    </span>
                  </div>
                </article>
              );
            })}

            {shown.length === 0 && (
              <div className="col-span-full flex flex-col items-center rounded-2xl border border-dashed border-white/[0.12] bg-[#11121d]/50 px-5 py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-xl text-white/35">
                  <i className="bi bi-search" />
                </div>
                <p className="mt-4 text-sm font-medium text-white/75">
                  No matching opportunities
                </p>
                <p className="mt-1 max-w-sm text-xs leading-5 text-white/40">
                  Try a different search, lower the match threshold, or adjust
                  your CGPA.
                </p>
                <button
                  onClick={() => {
                    setSearch("");
                    setMinMatch(0);
                  }}
                  className="mt-4 rounded-lg border border-white/[0.1] px-4 py-2 text-xs font-medium text-violet-200 transition hover:bg-white/[0.05]"
                >
                  Clear search filters
                </button>
              </div>
            )}
          </div>
        </section>

        <p className="mt-8 text-center text-xs text-white/25">
          Student Success Agent · Career discovery workspace
        </p>
      </div>
    </main>
  );
}
