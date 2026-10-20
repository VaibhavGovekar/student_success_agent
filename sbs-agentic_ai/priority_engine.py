
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


def rank_tasks(tasks, today=None):
    """Return incomplete tasks ranked from highest to lowest priority."""
    ranked_tasks = []

    for task in tasks:
        score = calculate_priority(task, today)

        if score is not None:
            ranked_tasks.append({
                **task,
                "priority_score": score
            })

    # Higher score first; earlier deadline breaks ties.
    ranked_tasks.sort(
        key=lambda task: (
            -task["priority_score"],
            date.fromisoformat(task["due_date"])
        )
    )

    return ranked_tasks


if __name__ == "__main__":
    # Sample tasks for testing the priority engine.
    sample_tasks = [
        {
            "id": 1,
            "title": "Python assignment",
            "due_date": "2026-10-20",
            "duration_hours": 2,
            "status": "pending"
        },
        {
            "id": 2,
            "title": "Java exam preparation",
            "due_date": "2026-10-22",
            "duration_hours": 3,
            "status": "pending"
        },
        {
            "id": 3,
            "title": "Mathematics notes",
            "due_date": "2026-10-24",
            "duration_hours": 1,
            "status": "completed"
        }
    ]

    ranked = rank_tasks(sample_tasks)

    print("STUDENT SUCCESS AGENT - PRIORITY ENGINE")
    print("---------------------------------------")

    for position, task in enumerate(ranked, start=1):
        print(
            f"{position}. {task['title']} | "
            f"Score: {task['priority_score']} | "
            f"Deadline: {task['due_date']}"
        )
