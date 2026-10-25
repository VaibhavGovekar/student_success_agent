import json
from datetime import date
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import sys
from pathlib import Path

from app.database import get_supabase_client
# Import the existing Agentic AI workflow.
AGENTIC_AI_DIR = Path(__file__).resolve().parents[2] / "sbs-agentic_ai"

if str(AGENTIC_AI_DIR) not in sys.path:
    sys.path.insert(0, str(AGENTIC_AI_DIR))

from agent_cycle import run_agent_cycle

app = FastAPI(
    title="Student Success Agent API",
    version="1.0.0"
)

# -------------------- CORS MIDDLEWARE --------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust with specific origins if needed in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------- PYDANTIC MODELS --------------------

class StudentCreate(BaseModel):
    name: str
    degree: str
    semester: int
    cgpa: float
    career_goal: Optional[str] = None
    available_hours: Optional[int] = 10

class TaskCreateRequest(BaseModel):
    user_id: str
    course_name: str
    task_title: str
    deadline: str  # ISO-formatted e.g. "2026-11-01T23:59:59"
    priority: Optional[str] = "medium"
    estimated_hours: Optional[int] = 2

class TaskStatusUpdate(BaseModel):
    status: str  # "pending", "in_progress", "completed"

class TaskUpdate(BaseModel):
    course_name: Optional[str] = None
    task_title: Optional[str] = None
    deadline: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    estimated_hours: Optional[int] = None

class SkillCreate(BaseModel):
    skill_name: str = Field(..., min_length=1, max_length=100)
    proficiency: int = Field(..., ge=0, le=100)

class MatchInternshipsRequest(BaseModel):
    query_embedding: List[float] = Field(..., description="1536-dimensional embedding vector")
    student_cgpa: float
    match_count: Optional[int] = 5

class ScheduleCreateRequest(BaseModel):
    user_id: str
    week_start_date: str  # e.g. "2026-10-19"
    weekly_plan: Dict[str, Any]

class InternshipCreate(BaseModel):
    role: str
    company: str
    mode: str
    location: str
    stipend: str
    skills: List[str]
    application_url: Optional[str] = None


# -------------------- HEALTH CHECK --------------------

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# -------------------- AGENTIC AI PLANNER --------------------

DEFAULT_AVAILABLE_HOURS = 3


@app.post("/students/{user_id}/agent/plan")
def create_student_agent_plan(user_id: str):
    """Build and validate a study plan from the student's Supabase tasks."""

    supabase = get_supabase_client()

    try:
        user_response = (
            supabase.table("users")
            .select("id")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )

        if not user_response.data:
            raise HTTPException(status_code=404, detail="Student not found")

        task_response = (
            supabase.table("academic_tasks")
            .select("id, course_name, task_title, deadline, estimated_hours, status")
            .eq("user_id", user_id)
            .eq("status", "pending")
            .order("deadline")
            .execute()
        )

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve student tasks from Supabase",
        ) from exc

    if not task_response.data:
        raise HTTPException(
            status_code=422,
            detail="Student has no pending tasks to schedule",
        )

    agent_tasks = []

    for task in task_response.data:
        deadline = task.get("deadline")
        duration = task.get("estimated_hours")

        if not deadline or not duration or duration <= 0:
            raise HTTPException(
                status_code=422,
                detail=f"Task {task.get('id')} needs a deadline and positive estimated_hours",
            )

        agent_tasks.append({
            "title": task["task_title"],
            "due_date": deadline[:10],
            "duration_hours": float(duration),
            "status": "pending",
        })

    try:
        plan = run_agent_cycle(
            student_data={
                "student_id": user_id,
                "available_hours_per_day": DEFAULT_AVAILABLE_HOURS,
                "tasks": agent_tasks,
            },
            available_hours=DEFAULT_AVAILABLE_HOURS,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return {
        "student_id": user_id,
        "available_hours_per_day": DEFAULT_AVAILABLE_HOURS,
        **plan,
    }


# -------------------- STUDENT ROUTES --------------------

@app.post("/students", status_code=status.HTTP_201_CREATED)
def create_student(student: StudentCreate):
    supabase = get_supabase_client()
    try:
        response = supabase.table("users").insert({
            "full_name": student.name,
            "degree": student.degree,
            "semester": student.semester,
            "career_goal": student.career_goal,
            "available_hours": student.available_hours
        }).execute()
        
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create student")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/students")
def get_students():
    supabase = get_supabase_client()
    try:
        response = supabase.table("users").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/students/{student_id}")
def get_student(student_id: str):
    supabase = get_supabase_client()
    try:
        response = supabase.table("users").select("*").eq("id", student_id).single().execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Student not found")
        return response.data
    except Exception as e:
        raise HTTPException(status_code=404, detail="Student not found")


# -------------------- TASK ROUTES --------------------

@app.post("/tasks", status_code=status.HTTP_201_CREATED)
def create_task(task: TaskCreateRequest):
    supabase = get_supabase_client()
    try:
        payload = {
            "user_id": task.user_id,
            "course_name": task.course_name,
            "task_title": task.task_title,
            "deadline": task.deadline,
            "priority": task.priority,
            "estimated_hours": task.estimated_hours,
            "status": "pending"
        }
        response = supabase.table("academic_tasks").insert(payload).execute()
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create task")
        return {"task": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/tasks/{user_id}")
def get_student_tasks(
    user_id: str,
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=100)
):
    supabase = get_supabase_client()
    try:
        query = supabase.table("academic_tasks").select("*").eq("user_id", user_id)
        if status_filter:
            query = query.eq("status", status_filter)
        if priority:
            query = query.eq("priority", priority)

        response = query.order("created_at", desc=True).limit(limit).execute()
        return {"tasks": response.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.patch("/tasks/{task_id}/status")
def update_task_status(task_id: str, status_payload: TaskStatusUpdate):
    supabase = get_supabase_client()
    try:
        response = supabase.table("academic_tasks")\
            .update({"status": status_payload.status})\
            .eq("id", task_id)\
            .execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Task not found")

        return {"task": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: str):
    supabase = get_supabase_client()
    try:
        response = supabase.table("academic_tasks").delete().eq("id", task_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Task not found")
        return None
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# -------------------- SCHEDULE ROUTE --------------------

@app.post("/schedule", status_code=status.HTTP_201_CREATED)
def save_schedule(schedule: ScheduleCreateRequest):
    supabase = get_supabase_client()
    try:
        response = supabase.table("agent_schedules").insert({
            "user_id": schedule.user_id,
            "week_start_date": schedule.week_start_date,
            "weekly_plan": schedule.weekly_plan
        }).execute()

        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to save schedule")
        return {"schedule": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# -------------------- SKILL ROUTES --------------------

@app.get("/students/{user_id}/skills")
def get_student_skills(user_id: str):
    supabase = get_supabase_client()
    try:
        response = supabase.table("skills").select("*").eq("user_id", user_id).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/students/{user_id}/skills")
def save_student_skill(user_id: str, skill_data: SkillCreate):
    supabase = get_supabase_client()
    try:
        # Upsert skill for user
        payload = {
            "user_id": user_id,
            "skill_name": skill_data.skill_name.strip(),
            "proficiency": skill_data.proficiency
        }
        response = supabase.table("skills").upsert(payload, on_conflict="user_id, skill_name").execute()
        return response.data[0] if response.data else payload
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# -------------------- INTERNSHIP ROUTES --------------------

@app.get("/internships")
def get_internships(limit: int = Query(default=20, ge=1, le=100)):
    supabase = get_supabase_client()
    try:
        response = supabase.table("internships").select("*").order("created_at", desc=True).limit(limit).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/internships", status_code=status.HTTP_201_CREATED)
def create_internship(internship: InternshipCreate):
    supabase = get_supabase_client()
    try:
        response = supabase.table("internships").insert({
            "role": internship.role,
            "company": internship.company,
            "mode": internship.mode,
            "location": internship.location,
            "stipend": internship.stipend,
            "skills": internship.skills,
            "application_url": internship.application_url
        }).execute()

        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create internship")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# -------------------- VECTOR MATCH ROUTE (PGVECTOR) --------------------


@app.post("/internships/match")
def match_internships(match_req: MatchInternshipsRequest):
    supabase = get_supabase_client()

    try:
        response = supabase.rpc(
            "match_internships",
            {
                "query_embedding": match_req.query_embedding,
                "student_cgpa": match_req.student_cgpa,
                "match_count": match_req.match_count or 5,
            },
        ).execute()

        return {"matches": response.data or []}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Failed to match internships",
        ) from e
