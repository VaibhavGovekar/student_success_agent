"""Generate LinkedIn search ideas from a student profile without web grounding."""

import json
import os

from google import genai


def generate_linkedin_search_ideas(*, career_goal, degree, skills, location, search_terms):
    """Use Gemini text generation to suggest searches, never to invent job listings."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is required for AI search suggestions")

    clean_skills = [str(skill).strip()[:60] for skill in skills if str(skill).strip()][:20]
    profile = {
        "career_goal": str(career_goal).strip()[:200],
        "degree": str(degree).strip()[:120],
        "skills": clean_skills,
        "location": str(location).strip()[:120],
        "requested_role_or_company": str(search_terms).strip()[:160],
    }
    prompt = f"""
Create exactly 3 useful LinkedIn Jobs search ideas for an internship seeker using this profile:
{json.dumps(profile, ensure_ascii=True)}

Return exactly one JSON object in this shape, with three items in the array:
{{"suggestions":[{{"role":"...","keywords":"...","reason":"..."}}]}}
Each idea must contain:
- role: a concise internship role title
- keywords: a practical LinkedIn search phrase, including internship and the most relevant skills
- reason: one short explanation tied to the supplied profile

Do not claim that any job is open. Do not invent job listings, employers, or company names.
If a requested company is supplied, preserve it in at least one keywords phrase. Otherwise,
use role and skill phrases only. Keep each keywords phrase under 140 characters.
""".strip()

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model=os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite"),
        contents=prompt,
        config={"response_mime_type": "application/json"},
    )
    if not response.text:
        raise RuntimeError("Gemini returned no search suggestions")

    payload = json.loads(response.text)
    if isinstance(payload, list):
        # Accept a bare JSON array in case the model follows the item format but
        # omits the requested wrapper object.
        suggestions = payload
    elif isinstance(payload, dict):
        suggestions = next(
            (payload.get(key) for key in ("suggestions", "search_ideas", "ideas")
             if isinstance(payload.get(key), list)),
            None,
        )
    else:
        suggestions = None
    if not isinstance(suggestions, list):
        raise RuntimeError("Gemini returned an invalid search suggestion response")

    cleaned = []
    for item in suggestions[:3]:
        if not isinstance(item, dict):
            continue
        role = str(item.get("role") or item.get("title") or "").strip()[:100]
        keywords = str(item.get("keywords") or item.get("search_query") or item.get("query") or "").strip()[:140]
        reason = str(item.get("reason") or item.get("rationale") or "").strip()[:240]
        if role and keywords and reason:
            cleaned.append({"role": role, "keywords": keywords, "reason": reason})
    if not cleaned:
        raise RuntimeError("Gemini did not return usable search suggestions")

    return cleaned
