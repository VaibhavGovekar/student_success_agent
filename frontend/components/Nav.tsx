"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/tasks", label: "Tasks" },
  { href: "/internships", label: "Internships" },
  { href: "/timetable", label: "Timetable" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="flex items-center gap-2 border-b border-[#262b45] bg-[#181c30] px-8 py-3">
      <span className="mr-4 font-bold text-[#e8eaf6]">🎓 Success Agent</span>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`rounded-xl px-4 py-2 text-sm font-medium ${
            path === l.href ? "bg-[#6c7bff] text-white" : "text-[#8b90b0] hover:bg-[#262b45]"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}