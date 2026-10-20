
import json
from pathlib import Path
from datetime import date


# Locate tasks.json in the same folder as this Python file.
DATA_FILE = Path(__file__).with_name("tasks.json")


def load_student_data():
    """Load student information from the JSON file."""
    with DATA_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


def get_urgent_tasks(tasks):
    """Return incomplete tasks sorted by their deadlines."""
    pending_tasks = []

    for task in tasks:
        if task["status"].lower() != "completed":
            pending_tasks.append(task)

    pending_tasks.sort(
        key=lambda task: date.fromisoformat(task["due_date"])
    )

    return pending_tasks


if __name__ == "__main__":
    try:
        student_data = load_student_data()

        urgent_tasks = get_urgent_tasks(student_data["tasks"])

        print("STUDENT SUCCESS AGENT")
        print("---------------------")
        print(f"Student ID: {student_data['student_id']}")
        print(
            "Available hours per day: "
            f"{student_data['available_hours_per_day']}"
        )
        print("\nTasks requiring attention:\n")

        if not urgent_tasks:
            print("No pending tasks!")

        for task in urgent_tasks:
            print(f"Task: {task['title']}")
            print(f"Due date: {task['due_date']}")
            print(
                "Estimated duration: "
                f"{task['duration_hours']} hours"
            )
            print(f"Status: {task['status']}")
            print("-" * 30)

    except FileNotFoundError:
        print(f"ERROR: Could not find the data file: {DATA_FILE}")

    except json.JSONDecodeError:
        print("ERROR: tasks.json contains invalid JSON.")

    except (KeyError, ValueError) as error:
        print(f"ERROR: Student data is missing or invalid: {error}")
