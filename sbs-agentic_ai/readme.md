# Student Success Agent 🤖

An intelligent student assistant that helps college students manage academic deadlines, prioritize tasks, generate study schedules, and recover when an initial schedule is invalid.

## 🎯 Problem Statement

College students often struggle to balance assignments, examinations, projects, skill development, and internship preparation. The Student Success Agent aims to simplify student planning by prioritizing tasks and creating schedules that respect deadlines and available study hours.

## 🚀 Current Features

- Prioritizes pending tasks based on urgency and importance.
- Generates a proposed study schedule from task durations and deadlines.
- Identifies overdue tasks.
- Checks whether tasks can fit within available study hours.
- Validates schedules for conflicts and deadline violations.
- Detects tasks that have not received their required study hours.
- Attempts automatic replanning by testing alternative task orders.
- Excludes completed tasks from the proposed schedule.

## 🧠 Agentic AI Workflow

The current workflow follows these stages:

1. **Observe:** Read student tasks, deadlines, durations, and completion status.
2. **Prioritize:** Rank pending tasks.
3. **Plan:** Generate an initial study schedule.
4. **Evaluate:** Validate the schedule against defined rules.
5. **Replan:** If validation fails, try alternative task orders.
6. **Validate again:** Check the revised schedule and report whether it passes validation.

The current replanning logic uses deterministic Python rules. LLM-powered planning and personalized recommendations are potential future improvements.

## 🛠️ Technology Stack

- **Language:** Python 3
- **Data format:** JSON
- **Core concepts:** Functions, dictionaries, sorting, date handling, scheduling algorithms, and rule-based validation
- **Development environment:** Visual Studio Code
- **Version control:** Git and GitHub

## 📁 Main Files

- `agent_workflow.py` — coordinates task prioritization, schedule generation, validation, and replanning.
- `priority_engine.py` — ranks tasks by priority.
- `schedule_validator.py` — contains the schedule validation rules.
- `tasks.json` — sample student task data.
- `test_replanning.py` — tests initial schedule validation and automatic replanning.
- `tasks_backup.json` — local backup of task data; this is not required to run the workflow.

## ▶️ How to Run

1. Install Python 3.
2. Clone the project repository.
3. Open the `sbs-agentic_ai` folder in VS Code.
4. Open the integrated terminal in that folder.
5. Run the main workflow:

   ```bash
   python agent_workflow.py
   ```

6. To run the replanning test:

   ```bash
   python test_replanning.py
   ```

The test reports the errors in the initial schedule, attempts replanning, and displays the final validation errors.

## 🧪 Testing

A successful replanning test should report:

```text
REPLANNING SUCCEEDED
Final validation errors: []
```

The exact schedule depends on the task data and current date. A valid result for one test case does not guarantee that every possible set of tasks and deadlines is feasible.

## 👨‍💻 Contribution

Working on the Agentic AI module, including task analysis, prioritization, scheduling, deterministic validation, and automatic replanning.

## 🔮 Future Improvements

- Integrate an LLM for personalized study recommendations.
- Accept student tasks dynamically through a user interface or API.
- Replan schedules when tasks are missed or circumstances change.
- Add technical skill-gap analysis and learning roadmaps.
- Integrate internship matching.
- Connect the workflow to a backend API and persistent database.
- Add more automated tests for deadline conflicts, overlapping sessions, and impossible schedules.

## 📌 Project Status

Early-stage prototype developed as part of a student hackathon project.

## Backend Integration: Agent Cycle

The Agentic AI module exposes `run_agent_cycle()` from `agent_cycle.py`.
The backend can import this function and call it directly without running
a separate terminal process.

### Basic usage

```python
from agent_cycle import run_agent_cycle

result = run_agent_cycle()

if result["success"]:
    print("Schedule status:", result["schedule_status"])
    print("Study schedule:", result["schedule"])
else:
    print("Schedule errors:", result["validation_errors"])
```

### Optional inputs

The function accepts optional `student_data` and `available_hours`
arguments. If omitted, it loads the student data from `tasks.json`
and uses the configured daily study hours.

```python
result = run_agent_cycle(
    student_data={
        "student_id": "STU001",
        "available_hours_per_day": 3,
        "tasks": [
            {
                "id": 1,
                "title": "Complete Python assignment",
                "due_date": "2026-10-23",
                "duration_hours": 2,
                "status": "pending"
            }
        ]
    },
    available_hours=3
)
```

### Result fields

- `student_id`: Student identifier.
- `available_hours_per_day`: Daily study-hour limit used.
- `recommendations`: Rule-based task recommendations.
- `ranked_tasks`: Incomplete tasks ordered by priority.
- `schedule`: Proposed final study schedule.
- `initial_validation_errors`: Problems detected in the initial schedule.
- `validation_errors`: Problems remaining after any replanning.
- `replanning_attempted`: Whether the agent attempted to replan.
- `success`: Whether the final schedule passed validation.
- `schedule_status`: `valid` or `invalid`.
- `recommendation_source`: Currently `mock_rules`.

### Important integration notes

- The current recommendation engine uses deterministic Python rules;
  it does not require an LLM API call.
- The backend should handle `ValueError` for invalid input.
- The backend should check `success` before treating a schedule as valid.
- The current schedule is a proposal; the backend should persist it only
  through the team's approved database workflow.
- Do not commit `.env` or expose API credentials.
