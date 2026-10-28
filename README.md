# Student Success Agent

Student Success Agent uses a vanilla JavaScript portal (`vini-frontend`), FastAPI, Supabase/PostgreSQL with pgvector, and the Python planner in `sbs-agentic_ai`. A Next.js UI also exists in `frontend/` as an alternate client.

## Connect the integrations

1. Create a Supabase project. In its SQL Editor, run [`database/schema.sql`](database/schema.sql). The backend uses the `users`, `academic_tasks`, `skills`, `internships`, and `agent_schedules` tables.
2. Copy `backend/.env.example` to `backend/.env` and fill in `SUPABASE_URL`, `SUPABASE_KEY`, and `GEMINI_API_KEY`. Gemini is used for agent recommendations and 1536-dimensional internship embeddings. Keep both provider keys on the backend; never put them in frontend JavaScript or a `NEXT_PUBLIC_*` variable. `DATABASE_URL` is not used by this Supabase client.
3. Create a student profile through `POST /students` in Swagger. The vanilla portal reads the first student returned by `GET /students`; add a career goal or skills before requesting semantic internship matches.
4. Create a student record using `POST http://127.0.0.1:8000/students`, or insert one in Supabase, and use its returned `id` as `NEXT_PUBLIC_DEMO_USER_ID`.
5. Start the API in one terminal:

   ```powershell
   cd backend
   .\.venv\Scripts\Activate.ps1
   uvicorn app.main:app --reload --port 8000
   ```

   If the virtual environment is not set up yet, create it and install dependencies first:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

6. Serve the README's vanilla JavaScript frontend in another terminal from the project root:

   ```powershell
   npx serve vini-frontend
   ```

   Open the URL printed by `serve`. The Next.js alternative can still be started from `frontend/` with `npm run dev`. The API health check is `http://127.0.0.1:8000/health` and interactive API docs are at `http://127.0.0.1:8000/docs`.

## Notes

- Local `.env` files are ignored by Git. Do not commit secrets or paste secret values into chat.
- If a key was ever committed or shared, rotate it in the provider dashboard.
- The frontend calls FastAPI; it does not connect directly to Supabase. This keeps the Supabase service-role key server-side.
- `database/schema.sql` is safe to run on a new project and adds missing columns for existing tables, but review any custom production schema before applying migrations.
- `sbs-agentic_ai/` contains the planner and Gemini recommendation integration. `POST /students/{user_id}/agent/plan` generates a plan from pending tasks and saves it; `GET /schedule/{user_id}` returns the latest saved plan.
- `POST /internships/match` accepts a student ID and CGPA, creates a Gemini profile embedding, indexes legacy internship rows, and calls the Supabase `match_internships` pgvector RPC.
