
from datetime import date


def calculate_priority(task, today=None):
    """
    Calculate a transparent priority score for one task.

    Higher scores indicate that a task deserves more attention.
    The optional 'today' argument makes testing predictable.
    """
    if today is None:
        today = date.today()

    # Completed tasks do not need prioritization.
    status = task["status"].strip().lower()

    if status == "completed":
        return None

    if status not in {"pending", "in_progress"}:
        raise ValueError(f"Unsupported task status: {status}")

    # Convert the deadline string into a date.
    due_date = date.fromisoformat(task["due_date"])
    days_left = (due_date - today).days

    # Score based on deadline.
    if days_left < 0:
        score = 100
    elif days_left == 0:
        score = 80
    elif days_left == 1:
        score = 60
    elif days_left <= 3:
        score = 40
    elif days_left <= 7:
        score = 20
    else:
        score = 10

    # Add points for tasks that need more time.
    duration = float(task["duration_hours"])

    if duration < 0:
        raise ValueError("Task duration cannot be negative.")

    if duration >= 3:
        score += 10
    elif duration >= 1:
        score += 5

    return score



def rank_tasks(tasks, today=None, recommendations=None):
    """
    Rank incomplete tasks using deterministic priority scores
    and optional mock-engine recommendations.

    Deadline-based scores remain the primary ranking signal.
    High-priority recommendations receive a modest score boost.
    """
    ranked_tasks = []

    recommendation_by_id = {}
    recommendation_by_title = {}

    for recommendation in recommendations or []:
        task_id = recommendation.get("task_id")
        title = recommendation.get("task_title")

        if task_id is not None:
            recommendation_by_id[task_id] = recommendation

        if title:
            recommendation_by_title[title] = recommendation

    for task in tasks:
        score = calculate_priority(task, today)

        if score is None:
            continue

        recommendation = recommendation_by_id.get(task.get("id"))

        if recommendation is None:
            recommendation = recommendation_by_title.get(
                task.get("title")
            )

        ranked_task = {
            **task,
            "priority_score": score,
        }

        if recommendation:
            recommended_priority = recommendation.get(
                "priority", "medium"
            )

            if recommended_priority == "high":
                ranked_task["priority_score"] += 10

            ranked_task["ai_recommendation"] = recommendation
        else:
            ranked_task["ai_recommendation"] = None

        ranked_tasks.append(ranked_task)

    # Higher score first; earlier deadline breaks ties.
    ranked_tasks.sort(
        key=lambda task: (
            -task["priority_score"],
            date.fromisoformat(task["due_date"])
        )
    )

    return ranked_tasks




import json
from pathlib import Path

if __name__ == "__main__":
    # Load student data from tasks.json
    data_file = Path(__file__).with_name("tasks.json")

    try:
        with open(data_file, "r", encoding="utf-8") as file:
            student_data = json.load(file)

        tasks = student_data["tasks"]

        # Rank tasks using the priority engine
        ranked_tasks = rank_tasks(tasks)

        print("\nSTUDENT TASK PRIORITIES")
        print("-" * 40)
        print(f"Student ID: {student_data['student_id']}")
        print(f"Available hours per day: {student_data['available_hours_per_day']}")

        for task in ranked_tasks:
            print(f"\nTask: {task['title']}")
            print(f"Due date: {task['due_date']}")
            print(f"Duration: {task['duration_hours']} hours")
            print(f"Priority score: {task['priority_score']}")

    except FileNotFoundError:
        print("Error: tasks.json was not found.")

    except (json.JSONDecodeError, KeyError) as error:
        print(f"Error reading student data: {error}")
