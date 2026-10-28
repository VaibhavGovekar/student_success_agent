import type { Task } from "./api";

const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

// Demo data only. Edit these values freely, the design lives in app/tasks/page.tsx
export const demoTasks: Task[] = [
  { id: "1", course_name: "Python", task_title: "Complete Python assignment", deadline: daysFromNow(-1), estimated_hours: 2, status: "pending" },
  { id: "2", course_name: "Java", task_title: "Study for Java exam", deadline: daysFromNow(2), estimated_hours: 3, status: "pending" },
  { id: "3", course_name: "Maths", task_title: "Finish mathematics notes", deadline: daysFromNow(0), estimated_hours: 1, status: "completed" },
  { id: "4", course_name: "DBMS", task_title: "Submit lab record", deadline: daysFromNow(1), estimated_hours: 2, status: "pending" },
];

import type { WeeklyPlan } from "./api";

export const demoPlan: WeeklyPlan = {
  Mon: [
    { start: "09:00", end: "10:00", title: "Study Data Structures", type: "academic" },
    { start: "10:30", end: "11:30", title: "Practice C++", type: "skill" },
    { start: "16:00", end: "16:30", title: "Take a break", type: "break" },
  ],
  Tue: [
    { start: "09:00", end: "10:30", title: "Study Mathematics", type: "academic" },
    { start: "14:00", end: "15:00", title: "Practice DSA", type: "skill" },
  ],
  Wed: [
    { start: "10:00", end: "11:00", title: "Revise OOP", type: "academic" },
    { start: "15:00", end: "16:00", title: "Build a project", type: "career" },
  ],
  Thu: [
    { start: "09:00", end: "10:00", title: "Study Computer Architecture", type: "academic" },
    { start: "14:00", end: "15:00", title: "Practice programming", type: "skill" },
  ],
  Fri: [
    { start: "09:00", end: "10:00", title: "Revise course notes", type: "academic" },
    { start: "15:00", end: "16:00", title: "Work on portfolio", type: "career" },
  ],
  Sat: [
    { start: "10:00", end: "11:30", title: "Solve DSA problems", type: "skill" },
    { start: "16:00", end: "16:30", title: "Rest", type: "break" },
  ],
  Sun: [
    { start: "10:00", end: "11:00", title: "Review the week", type: "academic" },
  ],
};