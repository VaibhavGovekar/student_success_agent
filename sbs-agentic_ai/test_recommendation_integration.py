
"""Tests for mock recommendations and task ranking."""

from datetime import date

from mock_ai_engine import generate_recommendations
from priority_engine import rank_tasks


def run_tests():
    today = date(2026, 10, 22)

    tasks = [
        {
            "id": 1,
            "title": "Urgent exam",
            "due_date": "2026-10-22",
            "duration_hours": 2,
            "status": "pending",
        },
        {
            "id": 2,
            "title": "Later assignment",
            "due_date": "2026-10-28",
            "duration_hours": 1,
            "status": "pending",
        },
        {
            "id": 3,
            "title": "Finished notes",
            "due_date": "2026-10-21",
            "duration_hours": 1,
            "status": "completed",
        },
    ]

    recommendations = generate_recommendations(tasks)

    assert len(recommendations) == 2
    assert all(
        item["recommendation_source"] == "mock_rules"
        for item in recommendations
    )
    print("TEST 1 PASSED: Pending tasks receive recommendations.")

    assert all(
        item["task_title"] != "Finished notes"
        for item in recommendations
    )
    print("TEST 2 PASSED: Completed tasks are excluded.")

    ranked = rank_tasks(
        tasks,
        today=today,
        recommendations=recommendations,
    )

    assert ranked[0]["title"] == "Urgent exam"
    assert ranked[0]["priority_score"] == 95
    assert ranked[0]["ai_recommendation"]["priority"] == "high"
    print("TEST 3 PASSED: High-priority recommendation influences ranking.")

    assert len(ranked) == 2
    assert all(task["status"] != "completed" for task in ranked)
    print("TEST 4 PASSED: Completed tasks remain excluded from ranking.")

    baseline = rank_tasks(tasks, today=today)
    assert baseline[0]["priority_score"] == 85
    print("TEST 5 PASSED: Existing ranking still works without recommendations.")

    print("\nAll 5 recommendation integration tests passed.")


if __name__ == "__main__":
    run_tests()
