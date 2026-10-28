
from datetime import date

def validate_no_overlap(schedule):
    """Check for overlapping tasks on the same date."""
    errors = []

    for i, task_a in enumerate(schedule):
        for task_b in schedule[i + 1:]:
            same_date = (
                task_a["scheduled_date"]
                == task_b["scheduled_date"]
            )

            overlaps = (
                task_a["start_hour"] < task_b["end_hour"]
                and task_b["start_hour"] < task_a["end_hour"]
            )

            if same_date and overlaps:
                errors.append(
                    f"Overlap detected on {task_a['scheduled_date']}: "
                    f"'{task_a['title']}' and '{task_b['title']}'."
                )

    return errors



def validate_available_hours(schedule, available_hours):
    """Check the study-hour limit separately for each date."""
    hours_by_date = {}

    for task in schedule:
        scheduled_date = task["scheduled_date"]
        duration = task["end_hour"] - task["start_hour"]

        hours_by_date[scheduled_date] = (
            hours_by_date.get(scheduled_date, 0) + duration
        )

    errors = []

    for scheduled_date, total_hours in hours_by_date.items():
        if total_hours > available_hours:
            errors.append(
                f"Schedule exceeds available study time on "
                f"{scheduled_date}: {total_hours} hours scheduled, "
                f"but only {available_hours} hours available."
            )

    return errors



def validate_deadlines(schedule):
    """Check deadlines that have not already passed."""
    errors = []
    today = date.today()

    for task in schedule:
        scheduled_date = date.fromisoformat(
            task["scheduled_date"]
        )
        due_date = date.fromisoformat(task["due_date"])

        # Overdue tasks are reported by find_overdue_tasks().
        # Do not report the same missed deadline twice.
        if due_date < today:
            continue

        if scheduled_date > due_date:
            errors.append(
                f"Deadline conflict: '{task['title']}' is scheduled "
                f"for {scheduled_date}, after its deadline {due_date}."
            )

    return errors


def validate_completed_tasks(schedule):
    """Reject tasks that are already completed."""
    errors = []

    for task in schedule:
        if task.get("status") == "completed":
            errors.append(
                f"Completed task cannot be scheduled again: "
                f"'{task['title']}'."
            )

    return errors

def find_overdue_tasks(tasks):
    """Return pending tasks whose deadlines have already passed."""
    today = date.today()
    overdue_tasks = []

    for task in tasks:
        if task.get("status") == "completed":
            continue

        due_date = date.fromisoformat(task["due_date"])

        if due_date < today:
            overdue_tasks.append({
                "title": task["title"],
                "due_date": task["due_date"],
                "days_overdue": (today - due_date).days,
            })

    return overdue_tasks



def validate_task_hours(tasks, schedule):
    """Check that each unfinished task has exactly its required hours scheduled."""

    errors = []

    for task in tasks:
        if task.get("status", "").strip().lower() == "completed":
            continue

        required_hours = task["duration_hours"]

        scheduled_hours = sum(
            item["end_hour"] - item["start_hour"]
            for item in schedule
            if item["title"] == task["title"]
        )

        if scheduled_hours < required_hours:
            missing_hours = required_hours - scheduled_hours
            errors.append(
                f"Incomplete task: '{task['title']}' has "
                f"{scheduled_hours}/{required_hours} hours scheduled. "
                f"{missing_hours} hour(s) still need scheduling."
            )

        elif scheduled_hours > required_hours:
            excess_hours = scheduled_hours - required_hours
            errors.append(
                f"Excess scheduled time: '{task['title']}' has "
                f"{scheduled_hours}/{required_hours} hours scheduled. "
                f"{excess_hours} extra hour(s) scheduled."
            )

    return errors




if __name__ == "__main__":
    study_schedule = [
    {
        "title": "Python assignment",
        "start_hour": 9,
        "end_hour": 11,
        "scheduled_date": "2026-10-20",
        "due_date": "2026-10-20",
        "status": "pending"
    },
    {
        "title": "Java exam preparation",
        "start_hour": 11,
        "end_hour": 12,
        "scheduled_date": "2026-10-20",
        "due_date": "2026-10-22",
        "status": "pending"
    }
]

    available_hours = 3

    
    overlap_errors = validate_no_overlap(study_schedule)

    hour_errors = validate_available_hours(
        study_schedule, available_hours
    )

    deadline_errors = validate_deadlines(study_schedule)

    completed_errors = validate_completed_tasks(study_schedule)

    errors = (
        overlap_errors
        + hour_errors
        + deadline_errors
        + completed_errors
    )


    if errors:
        print("SCHEDULE INVALID")
        for error in errors:
            print("-", error)
    else:
        print("SCHEDULE VALID: All checks passed.")
