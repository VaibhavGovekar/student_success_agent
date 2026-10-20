
from datetime import date

def validate_no_overlap(schedule):
    """Check whether any two scheduled tasks overlap."""
    errors = []

    for i, task_a in enumerate(schedule):
        for task_b in schedule[i + 1:]:
            if (
                task_a["start_hour"] < task_b["end_hour"]
                and task_b["start_hour"] < task_a["end_hour"]
            ):
                errors.append(
                    f"Overlap detected: '{task_a['title']}' and "
                    f"'{task_b['title']}'."
                )

    return errors


def validate_available_hours(schedule, available_hours):
    """Check whether scheduled study time exceeds available hours."""
    total_hours = 0

    for task in schedule:
        total_hours += task["end_hour"] - task["start_hour"]

    if total_hours > available_hours:
        return [
            f"Schedule exceeds available study time: "
            f"{total_hours} hours scheduled, "
            f"but only {available_hours} hours available."
        ]

    return []


def validate_deadlines(schedule):
    """Check whether tasks are scheduled after their deadlines."""
    errors = []

    for task in schedule:
        scheduled_date = date.fromisoformat(task["scheduled_date"])
        due_date = date.fromisoformat(task["due_date"])

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
