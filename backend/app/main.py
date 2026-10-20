
from datetime import date
from typing import Literal

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field, field_validator

from app.database import initialize_database, get_connection


app = FastAPI(
    title="Student Success Agent",
    description="Agentic AI platform for student academic and career management",
    version="1.1.0",
)

initialize_database()


# -------------------- CONSTANTS --------------------

TaskCategory = Literal[
    "academic",
    "skill_development",
    "project",
    "internship",
]

TaskPriority = Literal["low", "medium", "high"]


# -------------------- REQUEST MODELS --------------------

class StudentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    degree: str | None = None
    semester: int | None = Field(default=None, ge=1)
    cgpa: float | None = Field(default=None, ge=0, le=10)
    career_goal: str | None = None
    available_hours: int | None = Field(default=None, ge=0)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Student name cannot be empty")
        return value


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    category: TaskCategory
    deadline: date
    priority: TaskPriority = "medium"

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Task title cannot be empty")
        return value


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    category: TaskCategory | None = None
    deadline: date | None = None
    priority: TaskPriority | None = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str | None) -> str | None:
        if value is not None:
            value = value.strip()
            if not value:
                raise ValueError("Task title cannot be empty")
        return value


# -------------------- BASIC ROUTES --------------------

@app.get("/")
def home():
    return {
        "message": "Student Success Agent backend is running",
        "status": "online",
    }


@app.get("/health")
def health():
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

        student_id = cursor.lastrowid
        connection.commit()

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
            raise HTTPException(status_code=404, detail="Student not found")

        return dict(student)

    finally:
        connection.close()


# -------------------- CREATE TASK --------------------

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
            raise HTTPException(status_code=404, detail="Student not found")

        cursor.execute(
            """
            INSERT INTO tasks
            (student_id, title, category, deadline, priority)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                student_id,
                task.title,
                task.category,
                task.deadline.isoformat(),
                task.priority,
            ),
        )

        task_id = cursor.lastrowid
        connection.commit()

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
            raise HTTPException(status_code=404, detail="Student not found")

        query = "SELECT * FROM tasks WHERE student_id = ?"
        params = [student_id]

        if category is not None:
            query += " AND category = ?"
            params.append(category)

        if completed is not None:
            query += " AND completed = ?"
            params.append(int(completed))

        if priority is not None:
            query += " AND priority = ?"
            params.append(priority)

        query += " ORDER BY deadline ASC, id ASC LIMIT ?"
        params.append(limit)

        cursor.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]

    finally:
        connection.close()


# -------------------- UPDATE TASK --------------------

@app.patch("/tasks/{task_id}")
def update_task(task_id: int, task: TaskUpdate):
    updates = task.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(
            status_code=400,
            detail="Provide at least one field to update",
        )

    # Explicit nulls are not valid updates for these fields.
    if any(value is None for value in updates.values()):
        raise HTTPException(
            status_code=422,
            detail="Updated task fields cannot be null",
        )

    if "deadline" in updates:
        updates["deadline"] = updates["deadline"].isoformat()

    allowed_fields = {"title", "category", "deadline", "priority"}

    if not set(updates).issubset(allowed_fields):
        raise HTTPException(status_code=400, detail="Invalid fields")

    connection = get_connection()

    try:
        cursor = connection.cursor()
        cursor.execute(
            "SELECT id FROM tasks WHERE id = ?",
            (task_id,),
        )

        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Task not found")

        columns = ", ".join(f"{key} = ?" for key in updates)
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
            raise HTTPException(status_code=404, detail="Task not found")

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
            raise HTTPException(status_code=404, detail="Task not found")

        cursor.execute(
            "UPDATE tasks SET completed = 0 WHERE id = ?",
            (task_id,),
        )
        connection.commit()

        return {
            "message": "Task reopened successfully",
            "task_id": task_id,
            "completed": False,
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
            "DELETE FROM tasks WHERE id = ?",
            (task_id,),
        )

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Task not found")

        connection.commit()

    finally:
        connection.close()
