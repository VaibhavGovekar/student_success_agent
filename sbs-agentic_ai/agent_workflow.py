
import json
from pathlib import Path
from itertools import permutations
from mock_ai_engine import generate_recommendations

from priority_engine import rank_tasks
from schedule_validator import (
    validate_no_overlap,
    validate_available_hours,
    validate_deadlines,
    validate_completed_tasks,
    find_overdue_tasks,
    validate_task_hours,
)


def load_student_data():
    """Load student tasks from tasks.json."""
    file_path = Path(__file__).parent / "tasks.json"

    with open(file_path, "r", encoding="utf-8") as file:
        return json.load(file)



from datetime import date, timedelta


def validate_task_data(tasks):
    """Validate task structure and field values before processing."""
    errors = []
    required_fields = [
        "title",
        "due_date",
        "duration_hours",
        "status",
    ]
    allowed_statuses = {"pending", "completed"}

    if not isinstance(tasks, list):
        raise ValueError("'tasks' must be a list.")

    for index, task in enumerate(tasks):
        if not isinstance(task, dict):
            errors.append(
                f"Task at index {index} must be a dictionary."
            )
            continue

        missing_fields = [
            field for field in required_fields
            if field not in task
        ]

        if missing_fields:
            errors.append(
                f"Task at index {index} is missing required field(s): "
                + ", ".join(missing_fields)
            )
            continue

        title = task["title"]
        if not isinstance(title, str) or not title.strip():
            errors.append(
                f"Task at index {index} must have a non-empty title."
            )

        due_date = task["due_date"]
        if not isinstance(due_date, str):
            errors.append(
                f"Task at index {index} must have a date in YYYY-MM-DD format."
            )
        else:
            try:
                date.fromisoformat(due_date)
            except ValueError:
                errors.append(
                    f"Task at index {index} has an invalid due date: "
                    f"{due_date!r}."
                )

        duration = task["duration_hours"]
        if (
            isinstance(duration, bool)
            or not isinstance(duration, (int, float))
            or duration <= 0
        ):
            errors.append(
                f"Task at index {index} must have a positive numeric duration."
            )

        status = task["status"]
        if not isinstance(status, str) or status.lower() not in allowed_statuses:
            errors.append(
                f"Task at index {index} has an unsupported status: "
                f"{status!r}. Use 'pending' or 'completed'."
            )

    return errors





def create_study_schedule(
    ranked_tasks,
    available_hours,
    show_warnings=True,
    recovery_mode=False,
):
    """Schedule pending tasks within daily capacity and deadlines.

    In recovery mode, overdue tasks are scheduled from today onward.
    Their original deadlines are retained for reporting and validation.
    """

    if available_hours <= 0:
        raise ValueError("Available study hours must be greater than zero.")

    schedule = []
    current_date = date.today()
    current_hour = 9
    hours_used_today = 0

    for task in ranked_tasks:
        if task.get("status", "").lower() == "completed":
            continue

        remaining_hours = task["duration_hours"]
        due_date = date.fromisoformat(task["due_date"])

        # Normal mode respects deadlines strictly.
        # Recovery mode allows overdue work to be scheduled from today.
        if not recovery_mode and due_date < current_date:
            if show_warnings:
                print(
                    f"WARNING: '{task['title']}' is overdue "
                    f"(deadline: {task['due_date']})."
                )
            continue

        while remaining_hours > 0:
            if hours_used_today >= available_hours:
                current_date += timedelta(days=1)
                current_hour = 9
                hours_used_today = 0

            if not recovery_mode and current_date > due_date:
                if show_warnings:
                    print(
                        f"WARNING: '{task['title']}' cannot fit "
                        f"before its deadline ({task['due_date']})."
                    )
                break

            hours_available = available_hours - hours_used_today
            allocated_hours = min(remaining_hours, hours_available)

            schedule.append({
                "title": task["title"],
                "start_hour": current_hour,
                "end_hour": current_hour + allocated_hours,
                "scheduled_date": current_date.isoformat(),
                "due_date": task["due_date"],
                "status": task["status"],
                "recovery_mode": recovery_mode,
            })

            current_hour += allocated_hours
            hours_used_today += allocated_hours
            remaining_hours -= allocated_hours

    return schedule




def validate_schedule(schedule, available_hours, tasks=None):
    """Run all schedule validation checks."""

    if tasks is None:
        student_data = load_student_data()
        tasks = student_data["tasks"]

    overlap_errors = validate_no_overlap(schedule)

    hour_errors = validate_available_hours(
        schedule, available_hours
    )

    deadline_errors = validate_deadlines(schedule)

    completed_errors = validate_completed_tasks(schedule)

    task_hour_errors = validate_task_hours(
        tasks, schedule
    )

    errors = (
        overlap_errors
        + hour_errors
        + deadline_errors
        + completed_errors
        + task_hour_errors
    )

    return errors




def check_deadline_feasibility(tasks, available_hours):
    """Check whether pending tasks can fit before their deadlines."""
    today = date.today()
    sorted_tasks = sorted(tasks, key=lambda task: task["due_date"])

    cumulative_hours = 0
    print("\n3. DEADLINE FEASIBILITY CHECK")

    for task in sorted_tasks:
        due_date = date.fromisoformat(task["due_date"])

        if task.get("status") == "completed":
            continue

        cumulative_hours += task["duration_hours"]
        days_available = max(0, (due_date - today).days + 1)
        available_capacity = days_available * available_hours

        if cumulative_hours <= available_capacity:
            print(f"- {task['title']}: Feasible based on total hours.")
        else:
            print(
                f"- {task['title']}: NOT FEASIBLE with "
                f"{available_hours} study hour(s) per day. "
                f"Required by this deadline: {cumulative_hours} "
                f"hour(s); available capacity: "
                f"{available_capacity} hour(s)."
            )



def replan_schedule(tasks, available_hours):
    """Try alternative task orders and return the first valid schedule."""

    pending_tasks = [
        task for task in tasks
        if task.get("status") != "completed"
    ]

    if available_hours <= 0:
        return [], ["Available study hours must be greater than zero."]

    if not pending_tasks:
        return [], []

    # Try several sensible scheduling strategies first.
    candidate_orders = [
        sorted(pending_tasks, key=lambda task: task["due_date"]),
        sorted(
            pending_tasks,
            key=lambda task: (
                task["due_date"],
                -task["duration_hours"],
            ),
        ),
        sorted(
            pending_tasks,
            key=lambda task: task["duration_hours"],
        ),
        sorted(
            pending_tasks,
            key=lambda task: -task["duration_hours"],
        ),
    ]

    # For small task lists, systematically try every ordering.
    # Avoid factorial growth when there are many tasks.
    if len(pending_tasks) <= 7:
        candidate_orders.extend(permutations(pending_tasks))

    seen_orders = set()
    last_schedule = []
    last_errors = []

    for ordered_tasks in candidate_orders:
        order_key = tuple(
            (task.get("id", task.get("title", str(index))))
            for index, task in enumerate(ordered_tasks)
        )

        if order_key in seen_orders:
            continue

        seen_orders.add(order_key)

        candidate = create_study_schedule(
            ordered_tasks,
            available_hours,
            show_warnings=False,
            recovery_mode=True,
        )

        errors = validate_schedule(
            candidate,
            available_hours,
            tasks=pending_tasks,
        )

        
        if not errors:
            return candidate, []
 

        last_schedule = candidate
        last_errors = errors

    # No valid schedule was found among the candidates.
    return last_schedule, last_errors

def get_missed_deadline_warnings(tasks):
    """Report pending tasks whose original deadlines have passed."""
    today = date.today()
    warnings = []

    for task in tasks:
        if task.get("status", "").lower() == "completed":
            continue

        due_date = date.fromisoformat(task["due_date"])

        if due_date < today:
            warnings.append(
                f"Missed deadline: '{task['title']}' "
                f"was due on {task['due_date']}."
            )

    return warnings



def run_agent():
    student_data = load_student_data()

    recommendations = generate_recommendations(
        student_data["tasks"]
    )

    print("\n3. MOCK AI RECOMMENDATIONS")

    if recommendations:
        for item in recommendations:
            print(f"- Task: {item['task_title']}")
            print(f"  Priority: {item['priority']}")
            print(f"  Reason: {item['priority_reason']}")
            print(
                "  Recommended study hours: "
                f"{item['recommended_study_hours']}"
            )
    else:
        print("No pending tasks need recommendations.")

    available_hours = int(
        input("How many study hours are available per day today? ")
    )
    ranked_tasks = rank_tasks(
        student_data["tasks"],
        recommendations=recommendations,
    )

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

    print("\n2. PRIORITIZED TASKS")

    for task in ranked_tasks:
        print(
            f"- {task['title']} "
            f"(Priority: {task.get('priority_score', 'calculated')})"
        )

    check_deadline_feasibility(
        student_data["tasks"],
        available_hours,
    )

    schedule = create_study_schedule(
        ranked_tasks,
        available_hours,
    )

    print("\n4. PROPOSED STUDY SCHEDULE")

    for task in schedule:
        print(
            f"- {task['title']}: "
            f"{task['start_hour']}:00–{task['end_hour']}:00 "
            f"on {task['scheduled_date']}"
        )

    errors = validate_schedule(
        schedule,
        available_hours,
    )
    
    if errors:
        print("\nAttempting automatic replanning...")

        revised_schedule, revised_errors = replan_schedule(
            student_data["tasks"],
            available_hours,
        )

        schedule = revised_schedule
        errors = revised_errors

        if not errors:
            print("Replanning successful!")
            print("\nREVISED STUDY SCHEDULE")

            for task in schedule:
                print(
                    f"- {task['title']}: "
                    f"{task['start_hour']}:00-{task['end_hour']}:00 "
                    f"on {task['scheduled_date']}"
                )
        else:
            print("Automatic replanning could not find a valid schedule.")
            print("Remaining conflicts:")
            for error in errors:
                print(f"- {error}")


    print("\n5. VALIDATION RESULT")

    if errors:
        print("SCHEDULE INVALID")
        for error in errors:
            print(f"- {error}")

        print("\n6.REPLANNING RECOMMENDATION")
        print(
            "Your available study time is insufficient "
            "to meet all current deadlines."
        )
        print(
            "Consider increasing study hours, completing "
            "urgent tasks first, or requesting deadline extensions."
        )
    elif overdue_tasks:
        print("RECOVERY SCHEDULE VALID")
        print("Scheduling checks passed.")
        print("Warning: Original deadlines have already passed.")
    else:
        print("SCHEDULE VALID: All checks passed.")


if __name__ == "__main__":
    run_agent()
