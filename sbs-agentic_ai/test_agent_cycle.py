from agent_cycle import run_agent_cycle


def test_valid_cycle_returns_structured_results():
    result = run_agent_cycle()

    required_keys = [
        "student_id",
        "available_hours_per_day",
        "recommendations",
        "ranked_tasks",
        "schedule",
        "initial_validation_errors",
        "validation_errors",
        "replanning_attempted",
        "success",
        "schedule_status",
        "recommendation_source",
    ]

    for key in required_keys:
        assert key in result, f"Missing result field: {key}"

    assert result["success"] is True
    assert result["schedule_status"] == "valid"
    assert result["validation_errors"] == []
    assert result["recommendation_source"] == "mock_rules"

    print("TEST 1 PASSED: Complete cycle returns structured results.")


def test_completed_tasks_are_not_recommended_or_ranked():
    student_data = {
        "student_id": "TEST001",
        "available_hours_per_day": 3,
        "tasks": [
            {
                "id": 1,
                "title": "Completed assignment",
                "due_date": "2026-10-20",
                "duration_hours": 1,
                "status": "completed",
            }
        ],
    }

    result = run_agent_cycle(student_data=student_data)

    assert result["recommendations"] == []
    assert result["ranked_tasks"] == []
    assert result["schedule"] == []
    assert result["success"] is True

    print("TEST 2 PASSED: Completed tasks are not rescheduled.")


def test_invalid_available_hours_are_rejected():
    student_data = {
        "student_id": "TEST002",
        "available_hours_per_day": 0,
        "tasks": [],
    }

    try:
        run_agent_cycle(student_data=student_data)
    except ValueError:
        print("TEST 3 PASSED: Zero study hours are rejected.")
    else:
        raise AssertionError("Zero study hours should raise ValueError.")


def test_invalid_student_data_is_rejected():
    try:
        run_agent_cycle(student_data=[])
    except ValueError:
        print("TEST 4 PASSED: Invalid student data is rejected.")
    else:
        raise AssertionError("Invalid student data should raise ValueError.")


def test_missing_tasks_list_is_rejected():
    student_data = {
        "student_id": "TEST003",
        "available_hours_per_day": 3,
    }

    try:
        run_agent_cycle(student_data=student_data)
    except ValueError:
        print("TEST 5 PASSED: Missing tasks list is rejected.")
    else:
        raise AssertionError("Missing tasks should raise ValueError.")


def run_tests():
    test_valid_cycle_returns_structured_results()
    test_completed_tasks_are_not_recommended_or_ranked()
    test_invalid_available_hours_are_rejected()
    test_invalid_student_data_is_rejected()
    test_missing_tasks_list_is_rejected()

    print("\nAll 5 agent cycle tests passed.")


if __name__ == "__main__":
    run_tests()
