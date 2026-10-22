
"""
Reusable Student Success Agent cycle.

Flow:
Observe tasks -> Recommend -> Plan -> Validate
-> Replan if needed -> Return structured results.
"""

from agent_workflow import (
    load_student_data,
    create_study_schedule,
    validate_schedule,
    replan_schedule,
)
from mock_ai_engine import generate_recommendations
from priority_engine import rank_tasks


def run_agent_cycle(student_data=None, available_hours=None):
    """
    Run one complete agent cycle and return structured results.

    Pass student_data and available_hours for testing or API use.
    If omitted, load tasks.json and use its available hours.
    """

    # 1. OBSERVE: load and check input data.
    if student_data is None:
        student_data = load_student_data()

    if not isinstance(student_data, dict):
        raise ValueError("Student data must be a dictionary.")

    tasks = student_data.get("tasks")

    if not isinstance(tasks, list):
        raise ValueError("'tasks' must be a list.")

    if available_hours is None:
        available_hours = student_data.get("available_hours_per_day")

    if (
        isinstance(available_hours, bool)
        or not isinstance(available_hours, int)
        or available_hours <= 0
    ):
        raise ValueError("Available hours must be a positive integer.")

    # 2. RECOMMEND: generate structured mock recommendations.
    recommendations = generate_recommendations(tasks)

    # 3. PLAN: rank tasks and create an initial schedule.
    ranked_tasks = rank_tasks(
        tasks,
        recommendations=recommendations,
    )

    schedule = create_study_schedule(
        ranked_tasks,
        available_hours,
    )

    # 4. EVALUATE: validate the initial schedule.
    errors = validate_schedule(
        schedule,
        available_hours,
        tasks=tasks,
    )

    initial_errors = list(errors)
    replanning_attempted = False

    # 5. REPLAN: retry with the existing replanning engine if needed.
    if errors:
        replanning_attempted = True

        revised_schedule, revised_errors = replan_schedule(
            tasks,
            available_hours,
        )

        schedule = revised_schedule
        errors = revised_errors

    # 6. RETURN: provide structured results to the caller.
    return {
        "student_id": student_data.get("student_id"),
        "available_hours_per_day": available_hours,
        "recommendations": recommendations,
        "ranked_tasks": ranked_tasks,
        "schedule": schedule,
        "initial_validation_errors": initial_errors,
        "validation_errors": errors,
        "replanning_attempted": replanning_attempted,
        "success": len(errors) == 0,
        "schedule_status": (
            "valid" if not errors else "invalid"
        ),
        "recommendation_source": "mock_rules",
    }


if __name__ == "__main__":
    result = run_agent_cycle()

    print("STUDENT SUCCESS AGENT - COMPLETE CYCLE")
    print("=" * 45)
    print("Student ID:", result["student_id"])
    print("Schedule status:", result["schedule_status"])
    print("Replanning attempted:", result["replanning_attempted"])

    print("\nRECOMMENDATIONS")
    for item in result["recommendations"]:
        print(
            f"- {item['task_title']}: {item['priority']} "
            f"({item['priority_reason']})"
        )

    print("\nFINAL SCHEDULE")
    for item in result["schedule"]:
        print(
            f"- {item['title']}: "
            f"{item['start_hour']}:00–{item['end_hour']}:00 "
            f"on {item['scheduled_date']}"
        )

    if result["validation_errors"]:
        print("\nVALIDATION ERRORS")
        for error in result["validation_errors"]:
            print("-", error)
    else:
        print("\nSCHEDULE VALID: All checks passed.")
