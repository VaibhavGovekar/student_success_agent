
from datetime import date
from typing import Literal

from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field, field_validator

from app.database import initialize_database, get_connection

import json
app = FastAPI(
    title="Student Success Agent API",
    description="APIs for student profiles, task management, and smart recommendations.",
    version="1.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:5501",
        "http://localhost:5501",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


initialize_database()


# -------------------- MODELS --------------------

TaskCategory = Literal[
    "academic",
    "skill_development",
    "project",
    "internship",
]

TaskPriority = Literal["low", "medium", "high"]


class StudentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    degree: str | None = None
    semester: int | None = Field(default=None, ge=1)
    cgpa: float | None = Field(default=None, ge=0, le=10)
    career_goal: str | None = None
    available_hours: float | None = Field(default=None, ge=0)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("Name cannot be empty")
        return value


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    category: TaskCategory
    deadline: date | None = None
    priority: TaskPriority = "medium"

    @field_validator("title")
    @classmethod
    def validate_title(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("Task title cannot be empty")
        return value


class InternshipCreate(BaseModel):
    role: str = Field(..., min_length=2)
    company: str = Field(..., min_length=2)
    mode: Literal["Remote", "On-site", "Hybrid"] = "Remote"
    location: str = ""
    stipend: str = ""
    skills: list[str] = Field(..., min_length=1)
    application_url: str | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    category: TaskCategory | None = None
    deadline: date | None = None
    priority: TaskPriority | None = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, value):
        if value is not None:
            value = value.strip()
            if not value:
                raise ValueError("Task title cannot be empty")
        return value


# -------------------- BASIC ROUTES --------------------

@app.get("/")
def home():
    return {"message": "Student Success Agent API is running"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


# -------------------- STUDENT ROUTES --------------------

@app.post("/students", status_code=201)
def create_student(student: StudentCreate):
    connection = get_connection()

    try:
        cursor = connection.cursor()
        cursor.execute(
            """
            INSERT INTO students
                (name, degree, semester, cgpa, career_goal, available_hours)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                student.name,
                student.degree,
                student.semester,
                student.cgpa,
                student.career_goal,
                student.available_hours,
            ),
        )

        connection.commit()
        student_id = cursor.lastrowid

        cursor.execute(
            "SELECT * FROM students WHERE id = ?",
            (student_id,),
        )
        return dict(cursor.fetchone())

    finally:
        connection.close()


@app.get("/students")
def get_students():
    connection = get_connection()

    try:
        cursor = connection.cursor()
        cursor.execute("SELECT * FROM students ORDER BY id")
        return [dict(row) for row in cursor.fetchall()]

    finally:
        connection.close()


@app.get("/students/{student_id}")
def get_student(student_id: int):
    connection = get_connection()

    try:
        cursor = connection.cursor()
        cursor.execute(
            "SELECT * FROM students WHERE id = ?",
            (student_id,),
        )
        student = cursor.fetchone()

        if student is None:
            raise HTTPException(
                status_code=404,
                detail="Student not found",
            )

        return dict(student)

    finally:
        connection.close()


# -------------------- TASK CREATION --------------------

@app.post("/students/{student_id}/tasks", status_code=201)
def create_task(student_id: int, task: TaskCreate):
    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
            "SELECT id FROM students WHERE id = ?",
            (student_id,),
        )

        if cursor.fetchone() is None:
            raise HTTPException(
                status_code=404,
                detail="Student not found",
            )

        deadline = task.deadline.isoformat() if task.deadline else None

        cursor.execute(
            """
            INSERT INTO tasks
                (student_id, title, category, deadline, priority, completed)
            VALUES (?, ?, ?, ?, ?, 0)
            """,
            (
                student_id,
                task.title,
                task.category,
                deadline,
                task.priority,
            ),
        )

        connection.commit()
        task_id = cursor.lastrowid

        cursor.execute(
            "SELECT * FROM tasks WHERE id = ?",
            (task_id,),
        )
        return dict(cursor.fetchone())

    finally:
        connection.close()


# -------------------- GET STUDENT TASKS --------------------

@app.get("/students/{student_id}/tasks")
def get_student_tasks(
    student_id: int,
    category: TaskCategory | None = None,
    completed: bool | None = None,
    priority: TaskPriority | None = None,
    limit: int = Query(default=50, ge=1, le=100),
):
    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
            "SELECT id FROM students WHERE id = ?",
            (student_id,),
        )

        if cursor.fetchone() is None:
            raise HTTPException(
                status_code=404,
                detail="Student not found",
            )

        query = "SELECT * FROM tasks WHERE student_id = ?"
        parameters = [student_id]

        if category is not None:
            query += " AND category = ?"
            parameters.append(category)

        if completed is not None:
            query += " AND completed = ?"
            parameters.append(int(completed))

        if priority is not None:
            query += " AND priority = ?"
            parameters.append(priority)

        query += " ORDER BY id DESC LIMIT ?"
        parameters.append(limit)

        cursor.execute(query, parameters)
        return [dict(row) for row in cursor.fetchall()]

    finally:
        connection.close()


# -------------------- UPDATE TASK --------------------

@app.patch("/tasks/{task_id}")
def update_task(task_id: int, task_update: TaskUpdate):
    updates = task_update.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(
            status_code=400,
            detail="Provide at least one field to update",
        )

    for field, value in updates.items():
        if value is None:
            raise HTTPException(
                status_code=400,
                detail=f"{field} cannot be null",
            )

    if "deadline" in updates:
        updates["deadline"] = updates["deadline"].isoformat()

    allowed_fields = {"title", "category", "deadline", "priority"}

    if not set(updates).issubset(allowed_fields):
        raise HTTPException(
            status_code=400,
            detail="Invalid fields",
        )

    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
            "SELECT id FROM tasks WHERE id = ?",
            (task_id,),
        )

        if cursor.fetchone() is None:
            raise HTTPException(
                status_code=404,
                detail="Task not found",
            )

        columns = ", ".join(f"{field} = ?" for field in updates)
        values = list(updates.values()) + [task_id]

        cursor.execute(
            f"UPDATE tasks SET {columns} WHERE id = ?",
            values,
        )
        connection.commit()

        cursor.execute(
            "SELECT * FROM tasks WHERE id = ?",
            (task_id,),
        )
        return dict(cursor.fetchone())

    finally:
        connection.close()


# -------------------- COMPLETE TASK --------------------

@app.patch("/tasks/{task_id}/complete")
def complete_task(task_id: int):
    connection = get_connection()

    try:
        cursor = connection.cursor()
        cursor.execute(
            "SELECT id FROM tasks WHERE id = ?",
            (task_id,),
        )

        if cursor.fetchone() is None:
            raise HTTPException(
                status_code=404,
                detail="Task not found",
            )

        cursor.execute(
            "UPDATE tasks SET completed = 1 WHERE id = ?",
            (task_id,),
        )
        connection.commit()

        cursor.execute(
            "SELECT * FROM tasks WHERE id = ?",
            (task_id,),
        )

        return {
            "message": "Task marked as completed",
            "task": dict(cursor.fetchone()),
        }

    finally:
        connection.close()


# -------------------- REOPEN TASK --------------------

@app.patch("/tasks/{task_id}/reopen")
def reopen_task(task_id: int):
    connection = get_connection()

    try:
        cursor = connection.cursor()
        cursor.execute(
            "SELECT id FROM tasks WHERE id = ?",
            (task_id,),
        )

        if cursor.fetchone() is None:
            raise HTTPException(
                status_code=404,
                detail="Task not found",
            )

        cursor.execute(
            "UPDATE tasks SET completed = 0 WHERE id = ?",
            (task_id,),
        )
        connection.commit()

        cursor.execute(
            "SELECT * FROM tasks WHERE id = ?",
            (task_id,),
        )

        return {
            "message": "Task reopened successfully",
            "task": dict(cursor.fetchone()),
        }

    finally:
        connection.close()


# -------------------- DELETE TASK --------------------

@app.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: int):
    connection = get_connection()

    try:
        cursor = connection.cursor()
        cursor.execute(
            "SELECT id FROM tasks WHERE id = ?",
            (task_id,),
        )

        if cursor.fetchone() is None:
            raise HTTPException(
                status_code=404,
                detail="Task not found",
            )

        cursor.execute(
            "DELETE FROM tasks WHERE id = ?",
            (task_id,),
        )
        connection.commit()

    finally:
        connection.close()


# -------------------- SMART TASK RECOMMENDATIONS --------------------

@app.get("/students/{student_id}/recommendations")
def get_task_recommendations(student_id: int):
    today = date.today().isoformat()

    priority_rank = {
        "high": 0,
        "medium": 1,
        "low": 2,
    }

    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
            "SELECT id FROM students WHERE id = ?",
            (student_id,),
        )

        if cursor.fetchone() is None:
            raise HTTPException(
                status_code=404,
                detail="Student not found",
            )

        cursor.execute(
            """
            SELECT id, student_id, title, category,
                   deadline, priority, completed
            FROM tasks
            WHERE student_id = ? AND completed = 0
            """,
            (student_id,),
        )

        tasks = [dict(row) for row in cursor.fetchall()]

        def task_sort_key(task):
            deadline = task["deadline"] or "9999-12-31"
            is_overdue = deadline < today

            return (
                0 if is_overdue else 1,
                deadline,
                priority_rank.get(task["priority"], 3),
            )

        tasks.sort(key=task_sort_key)

        for task in tasks:
            deadline = task["deadline"]

            if deadline and deadline < today:
                reason = f"This task is overdue (deadline: {deadline})."
            elif deadline == today:
                reason = "This task is due today."
            elif deadline:
                reason = f"Upcoming deadline: {deadline}."
            else:
                reason = "No deadline specified."

            task["recommendation_reason"] = (
                f"Priority: {task['priority']}. {reason}"
            )

        return {
            "student_id": student_id,
            "total_pending_tasks": len(tasks),
            "recommended_next_task": tasks[0] if tasks else None,
            "all_recommendations": tasks,
        }

    finally:
        connection.close()




# ---------------- SKILL ROUTES ----------------

from pydantic import BaseModel, Field


class SkillCreate(BaseModel):
    skill: str = Field(min_length=1, max_length=100)
    proficiency: int = Field(ge=0, le=100)


@app.get("/students/{student_id}/skills")
def get_student_skills(student_id: int):
    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute(
            "SELECT id FROM students WHERE id = ?",
            (student_id,)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Student not found")

        cursor.execute(
            "SELECT id, student_id, skill, proficiency "
            "FROM skills WHERE student_id = ? ORDER BY skill",
            (student_id,)
        )
        return [dict(row) for row in cursor.fetchall()]
    finally:
        connection.close()


@app.post("/students/{student_id}/skills")
def save_student_skill(student_id: int, skill_data: SkillCreate):
    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute(
            "SELECT id FROM students WHERE id = ?",
            (student_id,)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Student not found")

        cursor.execute(
            "SELECT id FROM skills WHERE student_id = ? AND skill = ?",
            (student_id, skill_data.skill.strip())
        )
        existing = cursor.fetchone()

        if existing:
            cursor.execute(
                "UPDATE skills SET proficiency = ? WHERE id = ?",
                (skill_data.proficiency, existing["id"])
            )
        else:
            cursor.execute(
                "INSERT INTO skills (student_id, skill, proficiency) "
                "VALUES (?, ?, ?)",
                (
                    student_id,
                    skill_data.skill.strip(),
                    skill_data.proficiency
                )
            )

        connection.commit()

        cursor.execute(
            "SELECT id, student_id, skill, proficiency "
            "FROM skills WHERE student_id = ? AND skill = ?",
            (student_id, skill_data.skill.strip())
        )
        return dict(cursor.fetchone())
    finally:
        connection.close()



# ---------------- INTERNSHIP ROUTES ----------------

@app.get("/internships")
def get_internships():
    connection = get_connection()

    try:
        cursor = connection.cursor()
        cursor.execute("""
            SELECT id, role, company, mode, location,
                   stipend, skills, application_url
            FROM internships
            ORDER BY id DESC
        """)

        rows = cursor.fetchall()
        result = []

        for row in rows:
            item = dict(row)
            item["skills"] = json.loads(item["skills"])
            result.append(item)

        return result

    finally:
        connection.close()


@app.post("/internships", status_code=201)
def create_internship(internship: InternshipCreate):
    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute("""
            INSERT INTO internships
            (role, company, mode, location, stipend,
             skills, application_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            internship.role,
            internship.company,
            internship.mode,
            internship.location,
            internship.stipend,
            json.dumps(internship.skills),
            internship.application_url
        ))

        connection.commit()
        internship_id = cursor.lastrowid

        return {
            "message": "Internship created successfully",
            "id": internship_id,
            "role": internship.role,
            "company": internship.company
        }

    finally:
        connection.close()

