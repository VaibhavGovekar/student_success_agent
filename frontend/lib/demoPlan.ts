import type { WeeklyPlan } from "./api";

// Demo data only. Edit these values freely, the design lives in app/timetable/page.tsx
export const demoPlan: WeeklyPlan = {
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