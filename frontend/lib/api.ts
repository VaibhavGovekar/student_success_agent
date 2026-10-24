const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export const USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID ?? "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${res.status} on ${path}`);
  return res.json();
}

export type Status = "pending" | "completed" | "overdue";

export type Task = {
  id: string;
  course_name: string;
  task_title: string;
  deadline: string;
  estimated_hours: number;
  status: Status;
};

export type Match = {
  id: string;
  title: string;
  company: string;
  role_description: string;
  min_cgpa: number;
  similarity: number;
};

export type BlockType = "academic" | "skill" | "career" | "break";
export type Block = { start: string; end: string; title: string; type: BlockType };
export type WeeklyPlan = Record<string, Block[]>;

export const getTasks = (userId: string) => request<Task[]>(`/tasks/${userId}`);

export const createTask = (t: {
  user_id: string;
  course_name: string;
  task_title: string;
  deadline: string;
  estimated_hours: number;
}) => request<Task>("/tasks", { method: "POST", body: JSON.stringify(t) });

export const matchInternships = (userId: string, cgpa: number, count = 6) =>
  request<Match[]>("/match-internships", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, student_cgpa: cgpa, match_count: count }),
  });

export const getSchedule = (userId: string) =>
  request<{ weekly_plan: WeeklyPlan }>(`/schedule/${userId}`);