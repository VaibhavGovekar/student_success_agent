
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";

const links = [
  { href: "/tasks", label: "Tasks", icon: "bi-check2-square" },
  { href: "/internships", label: "Internships", icon: "bi-briefcase" },
  { href: "/timetable", label: "Timetable", icon: "bi-calendar-week" },
];

export default function Nav() {
  const path = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#090a12]/80 backdrop-blur-2xl">
      <nav className="mx-auto flex min-h-[68px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
        <Link
          href="/tasks"
          className="group flex shrink-0 items-center gap-3"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-300/20 bg-violet-500/15 text-lg text-violet-200 shadow-[0_0_24px_rgba(139,92,246,0.12)] transition duration-300 group-hover:border-violet-300/40 group-hover:bg-violet-500/25">
            ▲
          </span>
          <span className="hidden sm:block">
            <span className="block text-sm font-semibold tracking-tight text-white">
              Success Agent
            </span>
            <span className="block text-[10px] tracking-[0.16em] text-white/40">
              STUDENT WORKSPACE
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-1 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-1">
          {links.map((link) => {
            const active = path === link.href || path.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative rounded-xl px-3 py-2.5 text-xs font-medium transition-colors duration-200 sm:px-4 sm:text-sm ${
                  active
                    ? "text-white"
                    : "text-white/50 hover:text-white/90"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-xl border border-violet-300/15 bg-violet-400/[0.12]"
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 30,
                    }}
                  />
                )}

                <span className="relative flex items-center gap-2">
                  <i className={`bi ${link.icon} text-sm`} />
                  {link.label}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="hidden items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 sm:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
          <span className="text-xs text-white/55">Workspace</span>
        </div>
      </nav>
    </header>
  );
}
