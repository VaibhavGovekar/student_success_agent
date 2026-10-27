
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from google import genai


# Load the key from the existing backend environment file.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_ROOT / "backend" / ".env")

API_KEY = os.getenv("GEMINI_API_KEY")
MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")


def generate_recommendations(tasks):
    """Generate structured task recommendations using Gemini."""

    if not API_KEY:
        raise ValueError(
            "GEMINI_API_KEY is missing from backend/.env"
        )

    if not tasks:
        return []

    client = genai.Client(api_key=API_KEY)

    prompt = f"""
You are a student productivity assistant.

Analyze these pending student tasks:
{json.dumps(tasks, indent=2)}

Return ONLY a JSON array. For every task, include:
- task_title: exact task title
- priority: "high", "medium", or "low"
- priority_reason: a short explanation based on its deadline and duration
- recommended_study_hours: a positive number of hours

Consider overdue tasks urgent. Do not invent tasks.
"""

    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config={
            "response_mime_type": "application/json"
        },
    )

    recommendations = json.loads(response.text)

    if not isinstance(recommendations, list):
        raise ValueError("Gemini returned an invalid recommendation format.")

    expected_titles = {task["title"] for task in tasks}

    for item in recommendations:
        if not isinstance(item, dict):
            raise ValueError("Gemini returned an invalid recommendation item.")

        if item.get("task_title") not in expected_titles:
            raise ValueError("Gemini returned an unknown task title.")

        if item.get("priority") not in {"high", "medium", "low"}:
            raise ValueError("Gemini returned an invalid priority.")

        if not isinstance(item.get("priority_reason"), str):
            raise ValueError("Gemini returned an invalid priority reason.")

        hours = item.get("recommended_study_hours")
        if (
            isinstance(hours, bool)
            or not isinstance(hours, (int, float))
            or hours <= 0
        ):
            raise ValueError("Gemini returned invalid recommended study hours.")

    if len(recommendations) != len(tasks):
        raise ValueError("Gemini did not return one recommendation per task.")

    return recommendations
