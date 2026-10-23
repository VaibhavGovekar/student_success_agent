
from agent_cycle import run_agent_cycle


def test_valid_cycle_returns_structured_results():
    result = run_agent_cycle()

    required_keys = [
        "student_id",
        "available_hours_per_day",
        "missed_deadline_warnings",
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


def assert_invalid_task_is_rejected(task, expected_message):
    """Verify that malformed task data raises a clear ValueError."""
    student_data = {
        "student_id": "TEST_INVALID",
        "available_hours_per_day": 3,
        "tasks": [task],
    }

    try:
        run_agent_cycle(student_data=student_data)
    except ValueError as error:
        assert expected_message in str(error), (
            f"Expected '{expected_message}', got '{error}'"
        )
    else:
        raise AssertionError(
            f"Expected ValueError containing '{expected_message}'."
        )


def test_non_dictionary_task_is_rejected():
    assert_invalid_task_is_rejected(
        "not a task dictionary",
        "Task at index 0 must be a dictionary.",
    )
    print("TEST 6 PASSED: Non-dictionary task is rejected.")


def test_missing_task_title_is_rejected():
    assert_invalid_task_is_rejected(
        {
            "due_date": "2026-10-25",
            "duration_hours": 1,
            "status": "pending",
        },
        "'title'",
    )
    print("TEST 7 PASSED: Missing task title is rejected.")


def test_missing_task_due_date_is_rejected():
    assert_invalid_task_is_rejected(
        {
            "title": "Test assignment",
            "duration_hours": 1,
            "status": "pending",
        },
        "'due_date'",
    )
    print("TEST 8 PASSED: Missing task due date is rejected.")


def test_missing_task_duration_is_rejected():
    assert_invalid_task_is_rejected(
        {
            "title": "Test assignment",
            "due_date": "2026-10-25",
            "status": "pending",
        },
        "'duration_hours'",
    )
    print("TEST 9 PASSED: Missing task duration is rejected.")


def test_missing_task_status_is_rejected():
    assert_invalid_task_is_rejected(
        {
            "title": "Test assignment",
            "due_date": "2026-10-25",
            "duration_hours": 1,
        },
        "'status'",
    )
    print("TEST 10 PASSED: Missing task status is rejected.")


def assert_invalid_task_value_is_rejected(task, expected_message):
    """Check that the full agent cycle rejects invalid task values."""
    student_data = {
        "student_id": "TEST_INVALID_VALUE",
        "available_hours_per_day": 3,
        "tasks": [task],
    }

    try:
        run_agent_cycle(student_data=student_data)
    except ValueError as error:
        assert expected_message in str(error), (
            f"Expected '{expected_message}', got '{error}'"
        )
    else:
        raise AssertionError(
            f"Expected ValueError containing '{expected_message}'."
        )


def test_empty_task_title_is_rejected():
    assert_invalid_task_value_is_rejected(
        {
            "title": "   ",
            "due_date": "2026-10-25",
            "duration_hours": 1,
            "status": "pending",
        },
        "non-empty title",
    )
    print("TEST 11 PASSED: Empty task title is rejected.")


def test_invalid_task_date_is_rejected():
    assert_invalid_task_value_is_rejected(
        {
            "title": "Test assignment",
            "due_date": "2026-02-30",
            "duration_hours": 1,
            "status": "pending",
        },
        "invalid due date",
    )
    print("TEST 12 PASSED: Invalid task date is rejected.")


def test_invalid_task_duration_is_rejected():
    assert_invalid_task_value_is_rejected(
        {
            "title": "Test assignment",
            "due_date": "2026-10-25",
            "duration_hours": -1,
            "status": "pending",
        },
        "positive numeric duration",
    )
    print("TEST 13 PASSED: Invalid task duration is rejected.")


def test_unsupported_task_status_is_rejected():
    assert_invalid_task_value_is_rejected(
        {
            "title": "Test assignment",
            "due_date": "2026-10-25",
            "duration_hours": 1,
            "status": "in_progress",
        },
        "unsupported status",
    )
    print("TEST 14 PASSED: Unsupported task status is rejected.")


def run_tests():
    test_valid_cycle_returns_structured_results()
    test_completed_tasks_are_not_recommended_or_ranked()
    test_invalid_available_hours_are_rejected()
    test_invalid_student_data_is_rejected()
    test_missing_tasks_list_is_rejected()
    test_non_dictionary_task_is_rejected()
    test_missing_task_title_is_rejected()
    test_missing_task_due_date_is_rejected()
    test_missing_task_duration_is_rejected()
    test_missing_task_status_is_rejected()
    test_empty_task_title_is_rejected()
    test_invalid_task_date_is_rejected()
    test_invalid_task_duration_is_rejected()
    test_unsupported_task_status_is_rejected()

    print("\nAll 14 agent cycle tests passed.")


if __name__ == "__main__":
    run_tests()
