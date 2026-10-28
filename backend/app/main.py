import json
import logging
from datetime import date
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import sys
from pathlib import Path

from app.database import get_supabase_client
from app.embeddings import embed_text
# Import the existing Agentic AI workflow.
AGENTIC_AI_DIR = Path(__file__).resolve().parents[2] / "sbs-agentic_ai"

if str(AGENTIC_AI_DIR) not in sys.path:
    sys.path.insert(0, str(AGENTIC_AI_DIR))

from agent_cycle import run_agent_cycle

logger = logging.getLogger(__name__)

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
    user_id: Optional[str] = None
    query_embedding: Optional[List[float]] = Field(None, description="1536-dimensional embedding vector")
    student_cgpa: Optional[float] = None
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
            .select("*")
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

    eligible_statuses = {"pending", "overdue", "in_progress"}
    for task in task_response.data:
        if (task.get("status") or "pending").lower() not in eligible_statuses:
            continue
        deadline = task.get("deadline")
        duration = task.get("estimated_hours")

        if not deadline or not duration or duration <= 0:
            raise HTTPException(
                status_code=422,
                detail=f"Task {task.get('id')} needs a deadline and positive estimated_hours",
            )

        agent_tasks.append({
            "id": task["id"],
            "title": task["task_title"],
            "due_date": deadline[:10],
            "duration_hours": float(duration),
            "status": "pending",
        })

    if not agent_tasks:
        raise HTTPException(status_code=422, detail="Student has no pending or overdue tasks to schedule")

    available_hours = user_response.data[0].get("available_hours") or DEFAULT_AVAILABLE_HOURS

    try:
        plan = run_agent_cycle(
            student_data={
                "student_id": user_id,
                "available_hours_per_day": available_hours,
                "tasks": agent_tasks,
            },
            available_hours=available_hours,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    weekly_plan: Dict[str, List[Dict[str, str]]] = {
        day: [] for day in ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
    }
    from datetime import datetime, timedelta
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    for block in plan.get("schedule", []):
        scheduled = date.fromisoformat(block["scheduled_date"])
        day_index = (scheduled - week_start).days
        if not 0 <= day_index < 7:
            continue
        day_name = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")[day_index]
        start = int(block["start_hour"])
        end = int(block["end_hour"])
        weekly_plan[day_name].append({
            "start": f"{start:02d}:00", "end": f"{end:02d}:00",
            "title": block["title"], "type": "academic",
        })
    try:
        upsert_schedule(supabase, user_id, week_start.isoformat(), weekly_plan)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Plan generated but could not be saved") from exc

    return {
        "student_id": user_id,
        "available_hours_per_day": available_hours,
        "weekly_plan": weekly_plan,
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
            "cgpa": student.cgpa,
            "current_cgpa": student.cgpa,
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

def upsert_schedule(supabase, user_id: str, week_start_date: str, weekly_plan: Dict[str, Any]):
    existing = (supabase.table("agent_schedules").select("id")
                .eq("user_id", user_id).eq("week_start_date", week_start_date)
                .limit(1).execute())
    payload = {"weekly_plan": weekly_plan}
    if existing.data:
        return (supabase.table("agent_schedules").update(payload)
                .eq("id", existing.data[0]["id"]).execute())
    return supabase.table("agent_schedules").insert({
        "user_id": user_id,
        "week_start_date": week_start_date,
        "weekly_plan": weekly_plan,
    }).execute()


@app.post("/schedule", status_code=status.HTTP_201_CREATED)
def save_schedule(schedule: ScheduleCreateRequest):
    supabase = get_supabase_client()
    try:
        response = upsert_schedule(
            supabase, schedule.user_id, schedule.week_start_date, schedule.weekly_plan
        )

        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to save schedule")
        return {"schedule": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/schedule/{user_id}")
def get_schedule(user_id: str):
    try:
        client = get_supabase_client()
        student = client.table("users").select("id").eq("id", user_id).limit(1).execute()
        if not student.data:
            raise HTTPException(status_code=404, detail="Student not found")
        response = (client.table("agent_schedules")
                    .select("weekly_plan, week_start_date")
                    .eq("user_id", user_id)
                    .order("week_start_date", desc=True)
                    .limit(1).execute())
        if not response.data:
            return {
                "weekly_plan": {day: [] for day in ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")},
                "week_start_date": date.today().isoformat(),
                "saved": False,
            }
        return {**response.data[0], "saved": True}
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to retrieve saved schedule for user %s", user_id)
        raise HTTPException(status_code=502, detail="Unable to retrieve schedule") from exc


# -------------------- SKILL ROUTES --------------------

@app.get("/students/{user_id}/skills")
def get_student_skills(user_id: str):
    supabase = get_supabase_client()
    try:
        response = supabase.table("skills").select("*").eq("user_id", user_id).execute()
        return response.data
    except Exception:
        try:
            legacy = (supabase.table("student_skills")
                      .select("id, user_id, skill_name, proficiency_level")
                      .eq("user_id", user_id).execute())
            proficiency = {"beginner": 25, "intermediate": 60, "advanced": 90}
            return [{
                **skill,
                "proficiency": proficiency.get(skill.get("proficiency_level"), 0),
            } for skill in (legacy.data or [])]
        except Exception as exc:
            logger.exception("Failed to load skills for user %s", user_id)
            raise HTTPException(status_code=502, detail="Unable to load student skills") from exc


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
    except Exception:
        try:
            level = "beginner" if skill_data.proficiency < 34 else "intermediate" if skill_data.proficiency < 67 else "advanced"
            legacy_table = supabase.table("student_skills")
            existing = (legacy_table.select("id").eq("user_id", user_id)
                        .eq("skill_name", skill_data.skill_name.strip()).limit(1).execute())
            legacy_payload = {
                "user_id": user_id,
                "skill_name": skill_data.skill_name.strip(),
                "proficiency_level": level,
            }
            if existing.data:
                response = legacy_table.update(legacy_payload).eq("id", existing.data[0]["id"]).execute()
            else:
                response = legacy_table.insert(legacy_payload).execute()
            row = response.data[0] if response.data else legacy_payload
            return {**row, "proficiency": skill_data.proficiency}
        except Exception as exc:
            logger.exception("Failed to save skill for user %s", user_id)
            raise HTTPException(status_code=502, detail="Unable to save student skill") from exc


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
            "title": internship.role,
            "role": internship.role,
            "company": internship.company,
            "role_description": internship.role,
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
        query_embedding = match_req.query_embedding
        student_cgpa = match_req.student_cgpa

        if query_embedding is None:
            if not match_req.user_id:
                raise HTTPException(status_code=422, detail="Provide user_id or query_embedding")

            profile = (supabase.table("users").select("*")
                       .eq("id", match_req.user_id).limit(1).execute())
            if not profile.data:
                raise HTTPException(status_code=404, detail="Student not found")
            student = profile.data[0]
            student_cgpa = student_cgpa if student_cgpa is not None else float(
                student.get("cgpa") or student.get("current_cgpa") or 0
            )
            try:
                skills = (supabase.table("skills").select("skill_name, proficiency")
                          .eq("user_id", match_req.user_id).execute()).data or []
                skill_context = ", ".join(
                    f"{skill['skill_name']} (proficiency {skill.get('proficiency', 0)})"
                    for skill in skills
                )
            except Exception:
                # Support the original README schema, which used student_skills.
                legacy_skills = (supabase.table("student_skills")
                                 .select("skill_name, proficiency_level")
                                 .eq("user_id", match_req.user_id).execute()).data or []
                skill_context = ", ".join(
                    f"{skill['skill_name']} ({skill.get('proficiency_level', 'unknown')})"
                    for skill in legacy_skills
                )
            query_text = " ".join(filter(None, [
                student.get("career_goal"),
                student.get("degree"),
                f"Technical skills: {skill_context}" if skill_context else None,
                f"Student seeking internships with CGPA {student_cgpa}",
            ]))
            try:
                query_embedding = embed_text(query_text)
            except RuntimeError as exc:
                raise HTTPException(status_code=503, detail=str(exc)) from exc

            # Backfill old internship rows that were created before vector indexing was enabled.
            listings = (supabase.table("internships").select("*")
                        .lte("min_cgpa", student_cgpa).limit(200).execute()).data or []
            for listing in listings:
                if listing.get("embedding") is not None:
                    continue
                description = " ".join(filter(None, [
                    listing.get("title"), listing.get("role"), listing.get("role_description"),
                    ", ".join(listing.get("skills") or []),
                ]))
                vector = embed_text(description)
                supabase.table("internships").update({"embedding": vector}).eq("id", listing["id"]).execute()

        if student_cgpa is None:
            raise HTTPException(status_code=422, detail="student_cgpa is required")

        response = supabase.rpc(
            "match_internships",
            {
                "query_embedding": query_embedding,
                "student_cgpa": student_cgpa,
                "match_count": match_req.match_count or 5,
            },
        ).execute()
        return {"matches": response.data or []}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to semantically match internships")
        raise HTTPException(
            status_code=500,
            detail="Failed to match internships",
        ) from e
