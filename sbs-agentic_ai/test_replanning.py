
from datetime import date, timedelta
from schedule_validator import validate_available_hours, validate_deadlines
from agent_workflow import (
    create_study_schedule,
    replan_schedule,
    validate_schedule,
)
import json

with open("tasks.json", "r", encoding="utf-8") as file:
    data = json.load(file)

tasks = [
    task for task in data["tasks"]
    if task.get("status") != "completed"
]

available_hours = data["available_hours_per_day"]

print("TEST 1: Original task order")

original_schedule = create_study_schedule(
    tasks, available_hours, show_warnings=False
)
original_errors = validate_schedule(
    original_schedule, available_hours
)

print("Original schedule errors:", original_errors)

print("\nTEST 2: Automatic replanning")

revised_schedule, revised_errors = replan_schedule(
    tasks, available_hours
)

if revised_errors:
    print("REPLANNING FAILED")
    for error in revised_errors:
        print("-", error)
else:
    print("REPLANNING SUCCEEDED")
    for item in revised_schedule:
        print(
            f"- {item['title']}: "
            f"{item['start_hour']}:00–{item['end_hour']}:00 "
            f"on {item['scheduled_date']}"
        )

print("\nFinal validation errors:", revised_errors)


print("\nTEST 3: No pending tasks")

schedule, errors = replan_schedule(
    [{"id": 1, "title": "Completed task",
      "due_date": "2026-10-22",
      "duration_hours": 2, "status": "completed"}],
    3,
)

if schedule == [] and errors == []:
    print("PASSED: No schedule needed for completed tasks.")
else:
    print("FAILED:", schedule, errors)


print("\nTEST 4: Zero available hours")

schedule, errors = replan_schedule(tasks, 0)

if schedule == [] and errors:
    print("PASSED: Zero hours rejected safely.")
    print("Error:", errors[0])
else:
    print("FAILED:", schedule, errors)

    

print("\nTEST 5: Impossible deadline")

from agent_workflow import get_missed_deadline_warnings

impossible_tasks = [
    {
        "id": 99,
        "title": "Urgent assignment",
        "due_date": "2026-10-22",
        "duration_hours": 5,
        "status": "pending",
    }
]

urgent_warnings = get_missed_deadline_warnings(impossible_tasks)

urgent_matches = [
    warning for warning in urgent_warnings
    if "Urgent assignment" in warning
]

if urgent_matches:
    print("PASSED: Missed original deadline detected.")
    for warning in urgent_matches:
        print("-", warning)
else:
    print("FAILED: Missed original deadline was not reported.")

print("\nTEST 6: Daily study-hour limit")

overloaded_schedule = [
    {
        "title": "Task A",
        "start_hour": 9,
        "end_hour": 11,
        "scheduled_date": date.today().isoformat(),
        "due_date": (date.today() + timedelta(days=1)).isoformat(),
        "status": "pending",
    },
    {
        "title": "Task B",
        "start_hour": 11,
        "end_hour": 13,
        "scheduled_date": date.today().isoformat(),
        "due_date": (date.today() + timedelta(days=1)).isoformat(),
        "status": "pending",
    },
]

hour_errors = validate_available_hours(overloaded_schedule, 3)

if hour_errors:
    print("PASSED: Daily-hour limit violation detected.")
    print("-", hour_errors[0])
else:
    print("FAILED: Daily-hour limit violation was not detected.")


print("\nTEST 7: Deadline violation")

late_schedule = [
    {
        "title": "Late task",
        "start_hour": 9,
        "end_hour": 10,
        "scheduled_date": (date.today() + timedelta(days=2)).isoformat(),
        "due_date": (date.today() + timedelta(days=1)).isoformat(),
        "status": "pending",
    }
]

deadline_errors = validate_deadlines(late_schedule)

if deadline_errors:
    print("PASSED: Deadline violation detected.")
    print("-", deadline_errors[0])
else:
    print("FAILED: Deadline violation was not detected.")


print("\nTEST 8: Invalid task date")

invalid_tasks = [
    {
        "id": 100,
        "title": "Bad date task",
        "due_date": "not-a-date",
        "duration_hours": 1,
        "status": "pending",
    }
]

try:
    replan_schedule(invalid_tasks, 3)
except ValueError:
    print("PASSED: Invalid date rejected.")
else:
    print("FAILED: Invalid date was not rejected.")


