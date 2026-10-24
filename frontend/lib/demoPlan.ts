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