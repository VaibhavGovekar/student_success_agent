
"""
Mock AI engine for Student Success Agent.

Reads real tasks from tasks.json.
No API calls or API credits are required.
"""

import json
from pathlib import Path
from datetime import date


def load_student_data():
    """Load student information and tasks from tasks.json."""
    file_path = Path(__file__).parent / "tasks.json"

    with open(file_path, "r", encoding="utf-8") as file:
        return json.load(file)


def generate_recommendations(tasks):
    """Generate structured recommendations for pending tasks."""

    recommendations = []

    for task in tasks:
        if task.get("status", "").lower() != "pending":
            continue

        title = task.get("title", "Untitled task")
        duration = task.get("duration_hours", 1)
        deadline = task.get("due_date", "No deadline provided")

        if not isinstance(duration, (int, float)) or duration <= 0:
            duration = 1

        
        # Calculate priority using the actual current date.
        try:
            days_left = (date.fromisoformat(deadline) - date.today()).days
        except (ValueError, TypeError):
            days_left = None

        if days_left is None:
            priority = "medium"
            reason = "Check the deadline and schedule this task."
        elif days_left < 0:
            priority = "high"
            reason = "This task is overdue and needs attention."
        elif days_left == 0:
            priority = "high"
            reason = "This task is due today; prioritize it."
        elif days_left <= 2:
            priority = "high"
            reason = "This task is due soon; prioritize it."
        else:
            priority = "medium"
            reason = "Schedule this task before its deadline."


        recommendations.append(
            {
                "task_id": task.get("id"),
                "task_title": title,
                "priority": priority,
                "priority_reason": reason,
                "recommended_study_hours": int(duration),
                "deadline": deadline,
                "recommendation_source": "mock_rules",
            }
        )

    return recommendations


if __name__ == "__main__":
    student_data = load_student_data()
    tasks = student_data.get("tasks", [])
    recommendations = generate_recommendations(tasks)

    print("STUDENT SUCCESS AGENT - MOCK AI RECOMMENDATIONS")
    print("-" * 50)
    print("Student ID:", student_data.get("student_id", "Unknown"))
    print(
        "Available study hours per day:",
        student_data.get("available_hours_per_day", 0),
    )
    print("-" * 50)

    for item in recommendations:
        print("Task:", item["task_title"])
        print("Priority:", item["priority"])
        print("Reason:", item["priority_reason"])
        print("Recommended hours:", item["recommended_study_hours"])
        print("Deadline:", item["deadline"])
        print("Source:", item["recommendation_source"])
        print("-" * 50)
