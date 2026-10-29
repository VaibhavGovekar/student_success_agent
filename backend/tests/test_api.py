"""Isolated API contract tests. Supabase and Gemini are mocked; no real data is changed."""
from copy import deepcopy
from datetime import date
import unittest
from contextlib import redirect_stdout
from io import StringIO
from uuid import uuid4
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from agent_cycle import run_agent_cycle


class Result:
    def __init__(self, data):
        self.data = data


class FakeQuery:
    def __init__(self, db, table):
        self.db, self.table = db, table
        self.operation = "select"
        self.payload = None
        self.filters = []
        self.limit_count = None
        self.order_by = None
        self.single_row = False

    def select(self, *_args): return self
    def insert(self, payload): self.operation, self.payload = "insert", payload; return self
    def update(self, payload): self.operation, self.payload = "update", payload; return self
    def delete(self): self.operation = "delete"; return self
    def upsert(self, payload, **_kwargs): self.operation, self.payload = "upsert", payload; return self
    def eq(self, key, value): self.filters.append((key, "eq", value)); return self
    def lte(self, key, value): self.filters.append((key, "lte", value)); return self
    def order(self, key, desc=False): self.order_by = (key, desc); return self
    def limit(self, value): self.limit_count = value; return self
    def single(self): self.single_row = True; return self

    def execute(self):
        if self.table in self.db.missing_tables:
            raise RuntimeError(f"missing table: {self.table}")
        rows = self.db.tables.setdefault(self.table, [])
        matching = [row for row in rows if self._matches(row)]
        if self.operation == "insert":
            values = self.payload if isinstance(self.payload, list) else [self.payload]
            inserted = []
            for value in values:
                row = {"id": str(uuid4()), **deepcopy(value)}
                rows.append(row)
                inserted.append(deepcopy(row))
            return Result(inserted)
        if self.operation == "upsert":
            value = deepcopy(self.payload)
            row = next((r for r in rows if r.get("user_id") == value.get("user_id") and r.get("skill_name") == value.get("skill_name")), None)
            if row:
                row.update(value)
            else:
                row = {"id": str(uuid4()), **value}
                rows.append(row)
            return Result([deepcopy(row)])
        if self.operation == "update":
            for row in matching:
                row.update(deepcopy(self.payload))
            return Result(deepcopy(matching))
        if self.operation == "delete":
            self.db.tables[self.table] = [row for row in rows if not self._matches(row)]
            return Result(deepcopy(matching))
        if self.order_by:
            key, desc = self.order_by
            matching.sort(key=lambda row: row.get(key) or "", reverse=desc)
        if self.limit_count is not None:
            matching = matching[:self.limit_count]
        result = deepcopy(matching)
        return Result((result[0] if result else None) if self.single_row else result)

    def _matches(self, row):
        for key, operator, value in self.filters:
            actual = row.get(key)
            if operator == "eq" and str(actual) != str(value): return False
            if operator == "lte" and (actual is None or float(actual) > float(value)): return False
        return True


class FakeSupabase:
    def __init__(self):
        self.user_id = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
        self.task_id = "task-1"
        self.tables = {
            "users": [{"id": self.user_id, "full_name": "Test Student", "degree": "CS", "semester": 2, "cgpa": 8.0, "current_cgpa": 8.0, "career_goal": None, "available_hours": 3}],
            "academic_tasks": [{"id": self.task_id, "user_id": self.user_id, "course_name": "DBMS", "task_title": "Quiz", "deadline": f"{date.today().isoformat()}T23:00:00+00:00", "estimated_hours": 1, "priority": "medium", "status": "pending", "created_at": "2026-01-01"}],
            "skills": [{"id": "skill-1", "user_id": self.user_id, "skill_name": "Python", "proficiency": 70}],
            "internships": [{"id": "intern-1", "title": "Backend Intern", "role": "Backend Intern", "company": "Example Co", "role_description": "Python APIs", "min_cgpa": 7.0, "mode": "remote", "location": "Remote", "stipend": "Paid", "skills": ["Python"], "application_url": "https://example.com", "embedding": None, "created_at": "2026-01-01"}],
            "agent_schedules": [],
        }
        self.rpc_calls = []
        self.missing_tables = set()

    def table(self, name): return FakeQuery(self, name)

    def rpc(self, name, params):
        self.rpc_calls.append((name, params))
        return FakeRPC([{"id": "intern-1", "title": "Backend Intern", "company": "Example Co", "role_description": "Python APIs", "min_cgpa": 7.0, "similarity": 0.82, "skills": ["Python", "FastAPI"]}])


class FakeRPC:
    def __init__(self, data): self.data = data
    def execute(self): return Result(deepcopy(self.data))


class ApiContractTests(unittest.TestCase):
    def setUp(self):
        self.db = FakeSupabase()
        self.client = TestClient(app)
        self.db_patch = patch("app.main.get_supabase_client", return_value=self.db)
        self.db_patch.start()
        self.embedding_patch = patch("app.main.embed_text", return_value=[0.01] * 1536)
        self.embedding_patch.start()

    def tearDown(self):
        self.embedding_patch.stop()
        self.db_patch.stop()

    def test_health_and_student_routes(self):
        self.assertEqual(self.client.get("/health").json(), {"status": "healthy"})
        self.assertEqual(self.client.get("/students").status_code, 200)
        response = self.client.post("/students", json={"name": "New Student", "degree": "CS", "semester": 1, "cgpa": 8.1})
        self.assertEqual(response.status_code, 201)

    def test_task_crud_contract(self):
        tasks = self.client.get(f"/tasks/{self.db.user_id}")
        self.assertEqual(tasks.status_code, 200)
        self.assertEqual(tasks.json()["tasks"][0]["task_title"], "Quiz")
        updated = self.client.patch(f"/tasks/{self.db.task_id}/status", json={"status": "completed"})
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["task"]["status"], "completed")
        self.assertEqual(self.client.delete(f"/tasks/{self.db.task_id}").status_code, 204)

    def test_schedule_empty_get_and_upsert(self):
        empty = self.client.get(f"/schedule/{self.db.user_id}")
        self.assertEqual(empty.status_code, 200)
        self.assertFalse(empty.json()["saved"])
        plan = {"Mon": [{"title": "Study", "start": "09:00", "end": "10:00", "type": "academic"}]}
        payload = {"user_id": self.db.user_id, "week_start_date": date.today().isoformat(), "weekly_plan": plan}
        self.assertEqual(self.client.post("/schedule", json=payload).status_code, 201)
        saved = self.client.get(f"/schedule/{self.db.user_id}")
        self.assertTrue(saved.json()["saved"])
        self.assertEqual(saved.json()["weekly_plan"], plan)

    def test_skills_and_internship_listing_contracts(self):
        self.assertEqual(self.client.get(f"/students/{self.db.user_id}/skills").status_code, 200)
        skill = self.client.post(f"/students/{self.db.user_id}/skills", json={"skill_name": "SQL", "proficiency": 65})
        self.assertEqual(skill.status_code, 200)
        self.assertEqual(self.client.get("/internships").status_code, 200)
        created = self.client.post("/internships", json={"role": "Analyst Intern", "company": "Example Co", "mode": "remote", "location": "Remote", "stipend": "Paid", "skills": ["SQL"]})
        self.assertEqual(created.status_code, 201)

    def test_legacy_student_skills_schema(self):
        self.db.missing_tables.add("skills")
        self.db.tables["student_skills"] = [{"id": "legacy-skill", "user_id": self.db.user_id, "skill_name": "Python", "proficiency_level": "advanced"}]
        loaded = self.client.get(f"/students/{self.db.user_id}/skills")
        self.assertEqual(loaded.status_code, 200)
        self.assertEqual(loaded.json()[0]["proficiency"], 90)
        saved = self.client.post(f"/students/{self.db.user_id}/skills", json={"skill_name": "SQL", "proficiency": 70})
        self.assertEqual(saved.status_code, 200, saved.text)
        self.assertEqual(saved.json()["proficiency_level"], "advanced")

    def test_semantic_match_uses_profile_and_rpc(self):
        response = self.client.post("/internships/match", json={"user_id": self.db.user_id, "student_cgpa": 8.0, "career_goal": "Backend engineering", "skills": ["Python", "SQL"], "match_count": 5})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(len(response.json()["matches"]), 1)
        match = response.json()["matches"][0]
        self.assertEqual(match["matched_skills"], ["Python"])
        self.assertEqual(match["missing_skills"], ["FastAPI"])
        self.assertTrue(any("CGPA meets" in reason for reason in match["match_reasons"]))
        self.assertEqual(self.db.rpc_calls[0][0], "match_internships")
        self.assertEqual(len(self.db.rpc_calls[0][1]["query_embedding"]), 1536)

    def test_semantic_match_works_without_saved_skills_or_career_goal(self):
        self.db.tables["skills"] = []
        response = self.client.post("/internships/match", json={"user_id": self.db.user_id, "student_cgpa": 8.0})
        self.assertEqual(response.status_code, 200, response.text)

    def test_agent_plan_persists_schedule(self):
        from datetime import timedelta
        self.db.tables["academic_tasks"].append({
            "id": "overdue-1", "user_id": self.db.user_id, "course_name": "Math",
            "task_title": "Overdue assignment", "deadline": f"{(date.today() - timedelta(days=1)).isoformat()}T23:00:00+00:00",
            "estimated_hours": 1, "priority": "high", "status": "overdue", "created_at": "2026-01-02",
        })
        result = {"schedule": [{"title": "Quiz", "scheduled_date": date.today().isoformat(), "start_hour": 9, "end_hour": 10}], "recommendation_source": "mock_rules", "success": True}
        with patch("app.main.run_agent_cycle", return_value=result) as agent:
            response = self.client.post(f"/students/{self.db.user_id}/agent/plan")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertTrue(response.json()["weekly_plan"][date.today().strftime("%a")[:3]])
        self.assertEqual(len(self.db.tables["agent_schedules"]), 1)
        planned_tasks = agent.call_args.kwargs["student_data"]["tasks"]
        self.assertEqual({task["id"] for task in planned_tasks}, {"task-1", "overdue-1"})

    def test_overdue_task_is_replanned_and_marked_as_recovery(self):
        from datetime import timedelta
        task = {
            "id": "overdue-1", "title": "Overdue assignment",
            "due_date": (date.today() - timedelta(days=1)).isoformat(),
            "duration_hours": 1, "status": "pending",
        }
        recommendation = {
            "task_id": "overdue-1", "task_title": task["title"],
            "priority": "high", "priority_reason": "Past due",
            "recommended_study_hours": 1,
        }
        with patch("agent_cycle.generate_gemini_recommendations", return_value=[recommendation]):
            with redirect_stdout(StringIO()):
                result = run_agent_cycle({"tasks": [task], "available_hours_per_day": 3}, available_hours=3)
        self.assertEqual(result["recommendation_source"], "gemini")
        self.assertEqual(result["ranked_tasks"][0]["priority_score"], 115)
        self.assertTrue(result["missed_deadline_warnings"])
        self.assertTrue(result["replanning_attempted"])
        self.assertTrue(result["recovery_schedule"])
        self.assertTrue(result["schedule"][0]["recovery_mode"])
        self.assertEqual(result["schedule_status"], "valid")

    def test_agent_reports_temporary_gemini_outage(self):
        from datetime import timedelta
        task = {"title": "Synthetic task", "due_date": (date.today() + timedelta(days=1)).isoformat(), "duration_hours": 1, "status": "pending"}
        with patch("agent_cycle.generate_gemini_recommendations", side_effect=RuntimeError("503 UNAVAILABLE high demand")):
            with redirect_stdout(StringIO()):
                result = run_agent_cycle({"tasks": [task], "available_hours_per_day": 3}, available_hours=3)
        self.assertEqual(result["recommendation_source"], "mock_rules")
        self.assertIn("temporarily busy", result["recommendation_fallback_reason"])


if __name__ == "__main__":
    unittest.main()
