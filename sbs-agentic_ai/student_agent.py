
from datetime import date

def analyze_tasks(tasks):
    """Prioritize tasks based on deadline and importance."""

    for task in tasks:
        days_left = (task["deadline"] - date.today()).days

        # Calculate priority score
        score = task["importance"] * 2

        if days_left <= 1:
            score += 10
        elif days_left <= 3:
            score += 6
        elif days_left <= 7:
            score += 3

        task["days_left"] = days_left
        task["priority_score"] = score

    return sorted(
        tasks,
        key=lambda task: task["priority_score"],
        reverse=True
    )


def create_study_plan(tasks):
    """Create a plan using the prioritized tasks."""

    print("\n===== STUDENT SUCCESS AGENT =====")
    print("Today's plan:", date.today())
    print("\nRecommended tasks:\n")

    for index, task in enumerate(tasks, start=1):
        print(f"{index}. {task['name']}")
        print(f"   Subject: {task['subject']}")
        print(f"   Hours needed: {task['hours']}")
        print(f"   Days left: {task['days_left']}")

        if task["days_left"] < 0:
            print("   Status: OVERDUE")
        elif task["days_left"] == 0:
            print("   Status: DUE TODAY")
        else:
            print("   Status: Upcoming")

        print(f"   Priority score: {task['priority_score']}\n")


def main():
    # Sample student tasks
    tasks = [
        {
            "name": "Complete Python assignment",
            "subject": "Python",
            "deadline": date(2026, 10, 13),
            "importance": 5,
            "hours": 2
        },
        {
            "name": "Study for Java exam",
            "subject": "Java",
            "deadline": date(2026, 10, 15),
            "importance": 5,
            "hours": 3
        },
        {
            "name": "Practice DSA",
            "subject": "C++",
            "deadline": date(2026, 10, 20),
            "importance": 3,
            "hours": 1
        },
        {
            "name": "Build hackathon project",
            "subject": "Agentic AI",
            "deadline": date(2026, 10, 18),
            "importance": 4,
            "hours": 2
        }
    ]

    # Observe -> Analyze -> Plan
    prioritized_tasks = analyze_tasks(tasks)
    create_study_plan(prioritized_tasks)


if __name__ == "__main__":
    main()
