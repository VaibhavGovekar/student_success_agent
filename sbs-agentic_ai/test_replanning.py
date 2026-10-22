
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

