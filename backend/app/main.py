
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from app.database import initialize_database, get_connection

app = FastAPI(
    title="Student Success Agent",
    description="Agentic AI platform for student academic and career management",
    version="1.0.0"
)

initialize_database()


# Request model for student registration
class StudentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    degree: str | None = None
    semester: int | None = Field(default=None, ge=1)
    cgpa: float | None = Field(default=None, ge=0, le=10)
    career_goal: str | None = None
    available_hours: int | None = Field(default=None, ge=0)


@app.get("/")
def home():
    return {
        "message": "Student Success Agent backend is running",
        "status": "online"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


# Register a student
@app.post("/students", status_code=201)
def create_student(student: StudentCreate):
    name = student.name.strip()

    if not name:
        raise HTTPException(
            status_code=422,
            detail="Student name cannot be empty"
        )

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
                name,
                student.degree,
                student.semester,
                student.cgpa,
                student.career_goal,
                student.available_hours
            )
        )

        student_id = cursor.lastrowid
        connection.commit()

        cursor.execute(
            "SELECT * FROM students WHERE id = ?",
            (student_id,)
        )

        return dict(cursor.fetchone())

    finally:
        connection.close()


# Get all students
@app.get("/students")
def get_students():
    connection = get_connection()

    try:
        cursor = connection.cursor()
        cursor.execute("SELECT * FROM students ORDER BY id")
        return [dict(row) for row in cursor.fetchall()]

    finally:
        connection.close()


# Get one student by ID
@app.get("/students/{student_id}")
def get_student(student_id: int):
    connection = get_connection()

    try:
        cursor = connection.cursor()
        cursor.execute(
            "SELECT * FROM students WHERE id = ?",
            (student_id,)
        )

        student = cursor.fetchone()

        if student is None:
            raise HTTPException(
                status_code=404,
                detail="Student not found"
            )

        return dict(student)

    finally:
        connection.close()



from datetime import date
from typing import Literal

from pydantic import Field


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    category: Literal[
        "academic", "skill_development", "project", "internship"
    ]
    deadline: date
    priority: Literal["low", "medium", "high"] = "medium"


@app.post("/students/{student_id}/tasks", status_code=201)
def create_task(student_id: int, task: TaskCreate):
    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
            "SELECT id FROM students WHERE id = ?",
            (student_id,)
        )

        if cursor.fetchone() is None:
            raise HTTPException(
                status_code=404,
                detail="Student not found"
            )

        cursor.execute(
            """
            INSERT INTO tasks
            (student_id, title, category, deadline, priority)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                student_id,
                task.title.strip(),
                task.category,
                task.deadline.isoformat(),
                task.priority
            )
        )

        task_id = cursor.lastrowid
        connection.commit()

        cursor.execute(
            "SELECT * FROM tasks WHERE id = ?",
            (task_id,)
        )

        return dict(cursor.fetchone())

    finally:
        connection.close()


@app.get("/students/{student_id}/tasks")
def get_student_tasks(student_id: int):
    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
            "SELECT id FROM students WHERE id = ?",
            (student_id,)
        )

        if cursor.fetchone() is None:
            raise HTTPException(
                status_code=404,
                detail="Student not found"
            )

        cursor.execute(
            """
            SELECT * FROM tasks
            WHERE student_id = ?
            ORDER BY deadline ASC
            """,
            (student_id,)
        )

        return [dict(row) for row in cursor.fetchall()]

    finally:
        connection.close()


@app.patch("/tasks/{task_id}/complete")
def complete_task(task_id: int):
    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
            "UPDATE tasks SET completed = 1 WHERE id = ?",
            (task_id,)
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Task not found"
            )

        connection.commit()

        return {
            "message": "Task marked as completed",
            "task_id": task_id,
            "completed": True
        }

    finally:
        connection.close()
