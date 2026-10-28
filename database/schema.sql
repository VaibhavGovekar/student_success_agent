-- Supabase schema used by backend/app/main.py.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    full_name TEXT NOT NULL,
    degree TEXT NOT NULL DEFAULT '',
    semester INT NOT NULL DEFAULT 1,
    cgpa NUMERIC(3, 2) NOT NULL DEFAULT 0,
    current_cgpa NUMERIC(3, 2) NOT NULL DEFAULT 0,
    academic_term INT NOT NULL DEFAULT 1,
    career_goal TEXT,
    available_hours INT NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS degree TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS semester INT NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cgpa NUMERIC(3, 2) NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_cgpa NUMERIC(3, 2) NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS academic_term INT NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS career_goal TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS available_hours INT NOT NULL DEFAULT 10;

CREATE TABLE IF NOT EXISTS academic_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_name TEXT NOT NULL,
    task_title TEXT NOT NULL,
    deadline TIMESTAMPTZ NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    estimated_hours INT NOT NULL DEFAULT 2 CHECK (estimated_hours > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE academic_tasks ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium';

CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    proficiency INT NOT NULL DEFAULT 0 CHECK (proficiency BETWEEN 0 AND 100),
    UNIQUE (user_id, skill_name)
);

CREATE TABLE IF NOT EXISTS internships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT '',
    company TEXT NOT NULL,
    role_description TEXT NOT NULL DEFAULT '',
    mode TEXT NOT NULL DEFAULT 'remote',
    location TEXT NOT NULL DEFAULT '',
    stipend TEXT NOT NULL DEFAULT '',
    skills TEXT[] NOT NULL DEFAULT '{}',
    min_cgpa NUMERIC(3, 2) NOT NULL DEFAULT 0,
    deadline TIMESTAMPTZ,
    application_url TEXT,
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE internships ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT '';
ALTER TABLE internships ADD COLUMN IF NOT EXISTS role_description TEXT NOT NULL DEFAULT '';
ALTER TABLE internships ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'remote';
ALTER TABLE internships ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT '';
ALTER TABLE internships ADD COLUMN IF NOT EXISTS stipend TEXT NOT NULL DEFAULT '';
ALTER TABLE internships ADD COLUMN IF NOT EXISTS skills TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE internships ADD COLUMN IF NOT EXISTS min_cgpa NUMERIC(3, 2) NOT NULL DEFAULT 0;
ALTER TABLE internships ADD COLUMN IF NOT EXISTS embedding VECTOR(1536);

CREATE TABLE IF NOT EXISTS agent_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    weekly_plan JSONB NOT NULL,
    last_replanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE agent_schedules ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS internships_embedding_hnsw
    ON internships USING hnsw (embedding vector_cosine_ops);

DROP FUNCTION IF EXISTS match_internships(VECTOR(1536), NUMERIC, INT);
CREATE FUNCTION match_internships(
    query_embedding VECTOR(1536),
    student_cgpa NUMERIC,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    company TEXT,
    role_description TEXT,
    min_cgpa NUMERIC,
    similarity FLOAT,
    mode TEXT,
    location TEXT,
    stipend TEXT,
    skills TEXT[],
    application_url TEXT
)
LANGUAGE sql STABLE
AS $$
    SELECT i.id, i.title, i.company, i.role_description, i.min_cgpa,
           (1 - (i.embedding <=> query_embedding))::DOUBLE PRECISION AS similarity,
           i.mode, i.location, i.stipend, i.skills, i.application_url
    FROM internships AS i
    WHERE i.embedding IS NOT NULL AND i.min_cgpa <= student_cgpa
    ORDER BY i.embedding <=> query_embedding
    LIMIT match_count;
$$;
