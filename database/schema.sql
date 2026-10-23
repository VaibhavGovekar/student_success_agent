-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    current_cgpa NUMERIC(3, 2) DEFAULT 0.00,
    academic_term INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Academic tasks table
CREATE TABLE academic_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_name TEXT NOT NULL,
    task_title TEXT NOT NULL,
    deadline TIMESTAMPTZ NOT NULL,
    estimated_hours INT DEFAULT 2,
    status TEXT CHECK (status IN ('pending', 'completed', 'overdue')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student skills table
CREATE TABLE student_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    proficiency_level TEXT CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced')),
    verified BOOLEAN DEFAULT FALSE,
    embedding VECTOR(1536)
);

-- Internships vector store
CREATE TABLE internships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    role_description TEXT NOT NULL,
    min_cgpa NUMERIC(3, 2) DEFAULT 0.00,
    deadline TIMESTAMPTZ,
    application_url TEXT,
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent schedules table
CREATE TABLE agent_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    weekly_plan JSONB NOT NULL,
    last_replanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW Vector Index
CREATE INDEX ON internships USING hnsw (embedding vector_cosine_ops);

-- Semantic search function
CREATE OR REPLACE FUNCTION match_internships(
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
    similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
    SELECT 
        id, 
        title, 
        company, 
        role_description,
        min_cgpa, 
        1 - (embedding <=> query_embedding) AS similarity
    FROM internships
    WHERE min_cgpa <= student_cgpa
    ORDER BY embedding <=> query_embedding
    LIMIT match_count;
$$;