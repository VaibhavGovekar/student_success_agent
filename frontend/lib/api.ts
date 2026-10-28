
const BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export const USER_ID =
  process.env.NEXT_PUBLIC_DEMO_USER_ID || "";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`API ${res.status} on ${path}: ${detail}`);
  }

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

export type Block = {
  start: string;
  end: string;
  title: string;
  type: BlockType;
};

export type WeeklyPlan = Record<string, Block[]>;

export type AgentRecommendation = {
  task_id?: string;
  task_title: string;
  priority: "high" | "medium" | "low";
  priority_reason: string;
  recommended_study_hours: number;
};

export type RankedAgentTask = {
  id?: string;
  title: string;
  due_date: string;
  duration_hours: number;
  status: string;
  priority_score: number;
  ai_recommendation: AgentRecommendation | null;
};

export type AgentScheduleBlock = {
  title: string;
  scheduled_date: string;
  start_hour: number;
  end_hour: number;
  due_date: string;
  status: string;
  recovery_mode?: boolean;
};

export type AgentPlanResult = {
  weekly_plan: WeeklyPlan;
  available_hours_per_day: number;
  recommendations: AgentRecommendation[];
  ranked_tasks: RankedAgentTask[];
  schedule: AgentScheduleBlock[];
  missed_deadline_warnings: string[];
  initial_validation_errors: string[];
  validation_errors: string[];
  replanning_attempted: boolean;
  success: boolean;
  schedule_status: "valid" | "invalid";
  recovery_schedule: boolean;
  schedule_type: "regular" | "recovery";
  recommendation_source: "gemini" | "mock_rules";
  recommendation_fallback_reason: string | null;
};

export const emptyPlan = (): WeeklyPlan => ({
  Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [],
});

export const getTasks = async (userId: string): Promise<Task[]> => {
  const response = await request<{ tasks: Task[] }>(
    `/tasks/${encodeURIComponent(userId)}`
  );
  return response.tasks;
};

export const createTask = async (t: {
  user_id: string;
  course_name: string;
  task_title: string;
  deadline: string;
  estimated_hours: number;
}): Promise<Task> => {
  const response = await request<{ task: Task }>("/tasks", {
    method: "POST",
    body: JSON.stringify(t),
  });
  return response.task;
};

export const updateTaskStatus = async (
  taskId: string,
  status: "pending" | "completed"
): Promise<Task> => {
  const response = await request<{ task: Task }>(
    `/tasks/${encodeURIComponent(taskId)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );
  return response.task;
};

export const matchInternships = (
  userId: string,
  cgpa: number,
  count = 6
) =>
  request<{ matches: Match[] }>("/internships/match", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      student_cgpa: cgpa,
      match_count: count,
    }),
  }).then((response) => response.matches);

export const getSchedule = (userId: string) =>
  request<{ weekly_plan: WeeklyPlan; saved?: boolean }>(
    `/schedule/${encodeURIComponent(userId)}`
  );

export const saveSchedule = (userId: string, weeklyPlan: WeeklyPlan) => {
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const weekStartDate = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
  return request<{ schedule: { weekly_plan: WeeklyPlan } }>("/schedule", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, week_start_date: weekStartDate, weekly_plan: weeklyPlan }),
  });
};

export const generateAgentPlan = (userId: string) =>
  request<AgentPlanResult>(
    `/students/${encodeURIComponent(userId)}/agent/plan`,
    { method: "POST" }
  );
