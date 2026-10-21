
import json
from pathlib import Path

from priority_engine import rank_tasks
from schedule_validator import (
    validate_no_overlap,
    validate_available_hours,
    validate_deadlines,
    validate_completed_tasks,
    find_overdue_tasks,
)


def load_student_data():
    """Load student tasks from tasks.json."""
    file_path = Path(__file__).parent / "tasks.json"

    with open(file_path, "r", encoding="utf-8") as file:
        return json.load(file)



from datetime import date, timedelta


def create_study_schedule(ranked_tasks, available_hours):
    """Schedule tasks across days without exceeding daily study hours."""

    schedule = []
    current_date = date.today()
    current_hour = 9
    hours_used_today = 0

    for task in ranked_tasks:
        remaining_hours = task["duration_hours"]

        while remaining_hours > 0:
            # Move to the next day when today's capacity is full.
            if hours_used_today >= available_hours:
                current_date += timedelta(days=1)
                current_hour = 9
                hours_used_today = 0

            # Allocate only the hours available today.
            hours_available = available_hours - hours_used_today
            allocated_hours = min(remaining_hours, hours_available)

            schedule.append({
                "title": task["title"],
                "start_hour": current_hour,
                "end_hour": current_hour + allocated_hours,
                "scheduled_date": current_date.isoformat(),
                "due_date": task["due_date"],
                "status": task["status"],
            })

            current_hour += allocated_hours
            hours_used_today += allocated_hours
            remaining_hours -= allocated_hours

    return schedule



def validate_schedule(schedule, available_hours):
    """Run all schedule validation checks."""
    errors = []

    errors += validate_no_overlap(schedule)
    errors += validate_available_hours(schedule, available_hours)
    errors += validate_deadlines(schedule)
    errors += validate_completed_tasks(schedule)

    return errors


def run_agent():
    student_data = load_student_data()
    ranked_tasks = rank_tasks(student_data["tasks"])

    overdue_tasks = find_overdue_tasks(student_data["tasks"])

    print("\nSTUDENT SUCCESS AGENT")
    print("=" * 40)

    print("\n1. OVERDUE TASK ALERT")

    if overdue_tasks:
        for task in overdue_tasks:
            print(
                f"- {task['title']} | "
                f"Due: {task['due_date']} | "
                f"{task['days_overdue']} day(s) overdue"
            )
        print("Action needed: review overdue tasks and plan recovery.")
    else:
        print("No overdue tasks.")

    print("\n1. PRIORITIZED TASKS")

    for task in ranked_tasks:
        print(
            f"- {task['title']} "
            f"(Priority: {task.get('priority_score', 'calculated')})"
        )

    schedule = create_study_schedule(
    ranked_tasks,
    student_data["available_hours_per_day"],
    )

    print("\n2. PROPOSED STUDY SCHEDULE")

    for task in schedule:
        print(
            f"- {task['title']}: "
            f"{task['start_hour']}:00–{task['end_hour']}:00 "
            f"on {task['scheduled_date']}"
        )

    errors = validate_schedule(
        schedule,
        student_data["available_hours_per_day"],
    )

    print("\n3. VALIDATION RESULT")

    if errors:
        print("SCHEDULE INVALID")
        for error in errors:
            print(f"- {error}")
    elif overdue_tasks:
        print("RECOVERY SCHEDULE VALID")
        print("Scheduling checks passed.")
        print("Warning: Original deadlines have already passed.")
    else:
        print("SCHEDULE VALID: All checks passed.")


if __name__ == "__main__":
    run_agent()
