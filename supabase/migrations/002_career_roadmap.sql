-- AI Career Coach Schema Migration (002_career_roadmap.sql)
-- Supabase PostgreSQL Durable Storage for Career Roadmap & Project Recommendations

-- 1. Career Roadmaps (Persistent roadmap records tied to assessments)
CREATE TABLE IF NOT EXISTS career_roadmaps (
    id TEXT PRIMARY KEY,
    assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL,
    job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    job_title TEXT NOT NULL,
    job_company TEXT NOT NULL,
    job_source_url TEXT,
    repository_id BIGINT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    repository_full_name TEXT NOT NULL,
    commit_sha VARCHAR(40) NOT NULL REFERENCES commits(sha) ON DELETE CASCADE,
    assessment_version INT NOT NULL DEFAULT 1,
    target_role TEXT NOT NULL,
    target_company TEXT,
    seniority TEXT NOT NULL DEFAULT 'mid', -- 'entry', 'mid', 'senior'
    weekly_hours INT DEFAULT 10,
    overall_progress_pct INT NOT NULL DEFAULT 0,
    reassessment_note TEXT,
    previous_version_id TEXT REFERENCES career_roadmaps(id) ON DELETE SET NULL,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Roadmap Skill Gaps (Ranked with transparent scoring breakdown)
CREATE TABLE IF NOT EXISTS roadmap_skill_gaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roadmap_id TEXT NOT NULL REFERENCES career_roadmaps(id) ON DELETE CASCADE,
    skill TEXT NOT NULL,
    category TEXT NOT NULL,
    required_proficiency TEXT NOT NULL DEFAULT 'competent', -- 'foundational', 'competent', 'advanced'
    job_source TEXT NOT NULL,
    job_source_url TEXT,
    supporting_requirement_text TEXT NOT NULL,
    evidence_status TEXT NOT NULL, -- 'demonstrated', 'partially_demonstrated', 'not_demonstrated_in_scope', 'needs_review'
    confidence TEXT NOT NULL DEFAULT 'medium',
    assessment_reason TEXT NOT NULL,
    limitations TEXT,
    is_explicit_requirement BOOLEAN DEFAULT true,
    priority_rank INT NOT NULL,
    priority_score INT NOT NULL,
    priority_job_relevance INT NOT NULL DEFAULT 0,
    priority_evidence_gap INT NOT NULL DEFAULT 0,
    priority_prerequisite INT NOT NULL DEFAULT 0,
    priority_feasibility INT NOT NULL DEFAULT 0,
    priority_explanation TEXT NOT NULL,
    prerequisites TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Roadmap Projects (Sequenced Foundational -> Intermediate -> Advanced)
CREATE TABLE IF NOT EXISTS roadmap_projects (
    id TEXT PRIMARY KEY,
    roadmap_id TEXT NOT NULL REFERENCES career_roadmaps(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    track TEXT NOT NULL, -- 'backend', 'fullstack', 'ai_ml', 'data', 'devops'
    difficulty TEXT NOT NULL, -- 'foundational', 'intermediate', 'advanced'
    sequence_order INT NOT NULL,
    description TEXT NOT NULL,
    estimated_effort TEXT NOT NULL,
    prerequisites TEXT[] DEFAULT '{}',
    skills_covered TEXT[] DEFAULT '{}',
    target_skill_gaps TEXT[] DEFAULT '{}',
    role_fit_explanation TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'not_started', -- 'not_started', 'in_progress', 'submitted_for_verification', 'completed_and_verified'
    submitted_evidence_url TEXT,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Roadmap Project Milestones
CREATE TABLE IF NOT EXISTS roadmap_milestones (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES roadmap_projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    acceptance_criteria TEXT[] NOT NULL DEFAULT '{}',
    expected_evidence TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_roadmaps_assessment ON career_roadmaps(assessment_id);
CREATE INDEX IF NOT EXISTS idx_roadmaps_job ON career_roadmaps(job_id);
CREATE INDEX IF NOT EXISTS idx_roadmaps_repo ON career_roadmaps(repository_id);
CREATE INDEX IF NOT EXISTS idx_skill_gaps_roadmap ON roadmap_skill_gaps(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_projects_roadmap ON roadmap_projects(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_milestones_project ON roadmap_milestones(project_id);
