"use client";

import { useEffect, useState } from "react";
import {
  generateInternshipSearchIdeas,
  getStudentProfile,
  getStudentSkills,
  USER_ID,
  type InternshipSearchIdea,
} from "../../lib/api";

export default function InternshipsPage() {
  const [careerGoal, setCareerGoal] = useState("");
  const [degree, setDegree] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [location, setLocation] = useState("");
  const [search, setSearch] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(Boolean(USER_ID));
  const [profileNotice, setProfileNotice] = useState("");
  const [ideas, setIdeas] = useState<InternshipSearchIdea[]>([]);
  const [generatingIdeas, setGeneratingIdeas] = useState(false);
  const [ideaError, setIdeaError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!USER_ID) return;
      try {
        const [profile, skills] = await Promise.all([
          getStudentProfile(USER_ID),
          getStudentSkills(USER_ID),
        ]);
        if (cancelled) return;
        setCareerGoal(profile.career_goal ?? "");
        setDegree(profile.degree ?? "");
        setSkillsText(skills.map((skill) => skill.skill_name).filter(Boolean).join(", "));
      } catch {
        if (!cancelled) {
          setProfileNotice("Saved profile could not be loaded. Enter your search details manually.");
        }
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    }

    void loadProfile();
    return () => { cancelled = true; };
  }, []);

  const keywords = ["internship", search.trim(), careerGoal.trim(), skillsText.trim(), degree.trim()]
    .filter(Boolean)
    .join(" ");
  const linkedInSearch = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keywords)}${location.trim() ? `&location=${encodeURIComponent(location.trim())}` : ""}`;
  const linkedinUrlFor = (query: string) =>
    `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(`internship ${query}`)}${location.trim() ? `&location=${encodeURIComponent(location.trim())}` : ""}`;

  function openLinkedInInNewTab(url: string) {
    const tab = window.open(url, "_blank");
    if (!tab) {
      setIdeaError("Your browser blocked the LinkedIn tab. Allow pop-ups for localhost and try again.");
      return;
    }
    tab.opener = null;
  }

  async function suggestSearches() {
    if (!careerGoal.trim() && !skillsText.trim() && !search.trim()) {
      setIdeaError("Add a career goal, at least one skill, or a role/company first.");
      setIdeas([]);
      return;
    }

    setGeneratingIdeas(true);
    setIdeaError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await generateInternshipSearchIdeas({
        career_goal: careerGoal.trim(),
        degree: degree.trim(),
        skills: skillsText.split(",").map((skill) => skill.trim()).filter(Boolean),
        location: location.trim(),
        search_terms: search.trim(),
      }, controller.signal);
      setIdeas(response.suggestions);
    } catch (error) {
      setIdeas([]);
      setIdeaError(error instanceof DOMException && error.name === "AbortError"
        ? "AI suggestions took too long. You can still use the LinkedIn search above."
        : error instanceof Error ? error.message : "Could not generate AI search suggestions.");
    } finally {
      window.clearTimeout(timeout);
      setGeneratingIdeas(false);
    }
  }

  const field = "w-full rounded-xl border border-white/[0.09] bg-[#0c0d16] px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/10";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090a12] text-white">
      <div className="pointer-events-none absolute -top-48 left-[15%] h-[440px] w-[440px] rounded-full bg-violet-600/[0.12] blur-[140px]" />
      <div className="pointer-events-none absolute right-[-160px] top-[360px] h-[360px] w-[360px] rounded-full bg-indigo-500/[0.07] blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-8 sm:pt-12">
        <section className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/[0.07] px-3 py-1.5 text-xs font-medium text-violet-200">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-300" />
              LINKEDIN JOB SEARCH
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Find your next{" "}
              <span className="bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent">
                opportunity.
              </span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/45 sm:text-base">
              Get AI search ideas from your profile, then open LinkedIn Jobs to see live postings and companies.
            </p>
            <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1.5 text-xs text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              {loadingProfile ? "Loading saved profile" : "Ready to search LinkedIn"}
            </span>
          </div>

        </section>

        {profileNotice && (
          <p role="status" className="mt-5 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-4 py-3 text-sm text-amber-100/90">
            {profileNotice}
          </p>
        )}

        <section className="mt-8 rounded-2xl border border-white/[0.09] bg-[#11121d]/90 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300">
              <i className="bi bi-funnel" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Personalize your LinkedIn search</h2>
              <p className="mt-1 text-xs text-white/40">
                Add a company name in “Role or company” to look for openings at that employer.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4 xl:items-end">
            <label className="block min-w-0 xl:col-span-2">
              <span className="mb-2 block text-xs font-medium text-white/55">Career goal</span>
              <input className={field} placeholder="e.g. Software Engineering Intern" value={careerGoal} onChange={(event) => setCareerGoal(event.target.value)} />
            </label>
            <label className="block min-w-0">
              <span className="mb-2 block text-xs font-medium text-white/55">Degree (optional)</span>
              <input className={field} placeholder="e.g. Computer Science" value={degree} onChange={(event) => setDegree(event.target.value)} />
            </label>
            <label className="block min-w-0">
              <span className="mb-2 block text-xs font-medium text-white/55">Preferred location</span>
              <input className={field} placeholder="e.g. Bengaluru, India" value={location} onChange={(event) => setLocation(event.target.value)} />
            </label>
            <label className="block min-w-0 xl:col-span-2">
              <span className="mb-2 block text-xs font-medium text-white/55">Your skills</span>
              <input className={field} placeholder="e.g. Python, SQL, React" value={skillsText} onChange={(event) => setSkillsText(event.target.value)} />
            </label>
            <label className="block min-w-0 xl:col-span-2">
              <span className="mb-2 block text-xs font-medium text-white/55">Role or company</span>
              <input className={field} placeholder="e.g. backend intern or Google" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            <a
              href={linkedInSearch}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => {
                event.preventDefault();
                openLinkedInInNewTab(linkedInSearch);
              }}
              className="inline-flex min-h-12 items-center justify-center gap-2 self-end rounded-xl bg-violet-500 px-5 text-sm font-semibold text-white transition hover:bg-violet-400"
            >
              <i className="bi bi-linkedin" />
              Search internships on LinkedIn
            </a>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-violet-400/15 bg-violet-400/[0.04] p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <i className="bi bi-stars text-violet-300" />
                AI-powered search ideas
              </h2>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-white/45">
                Gemini suggests role and skill searches from your profile using text generation only. It does not search the web or invent job listings; LinkedIn provides the real companies and openings.
              </p>
            </div>
            <button
              type="button"
              onClick={suggestSearches}
              disabled={generatingIdeas}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-300/25 bg-violet-400/10 px-4 text-sm font-semibold text-violet-100 transition hover:bg-violet-400/20 disabled:cursor-wait disabled:opacity-60"
            >
              <i className={`bi ${generatingIdeas ? "bi-arrow-repeat" : "bi-stars"}`} />
              {generatingIdeas ? "Thinking..." : "Suggest searches with AI"}
            </button>
          </div>

          {ideaError && <p role="alert" className="mt-4 text-sm text-amber-200">{ideaError}</p>}

          {ideas.length > 0 && (
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {ideas.map((idea, index) => (
                <article key={`${idea.keywords}-${index}`} className="rounded-xl border border-white/[0.08] bg-[#0c0d16]/80 p-4">
                  <h3 className="text-sm font-semibold text-white/85">{idea.role}</h3>
                  <p className="mt-2 text-xs leading-5 text-white/45">{idea.reason}</p>
                  <p className="mt-3 break-words rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-violet-100/75">{idea.keywords}</p>
                  <a
                    href={linkedinUrlFor(idea.keywords)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => {
                      event.preventDefault();
                      openLinkedInInNewTab(linkedinUrlFor(idea.keywords));
                    }}
                    className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-violet-200 hover:text-violet-100"
                  >
                    <i className="bi bi-linkedin" />
                    Search this on LinkedIn
                  </a>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-9 rounded-2xl border border-white/[0.09] bg-[#11121d]/70 p-6 sm:p-8">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-xl text-violet-300">
              <i className="bi bi-linkedin" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">Live internship listings and companies</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/45">
              Search opens LinkedIn Jobs in a new tab with your filters. LinkedIn displays the matching companies, posting details, and application links. Sign in to LinkedIn to apply.
            </p>
          </div>
        </section>

        <p className="mt-8 text-center text-xs text-white/25">
          Student Success Agent · LinkedIn provides the live job results
        </p>
      </div>
    </main>
  );
}
