-- AI Career Coach Schema Migration (001_initial_schema.sql)
-- Supabase PostgreSQL Durable Storage

-- 1. Users / Identifiers
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_username TEXT UNIQUE NOT NULL,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Jobs
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL, -- 'greenhouse', 'lever', 'manual'
    company TEXT NOT NULL,
    title TEXT NOT NULL,
    location TEXT,
    is_remote BOOLEAN DEFAULT false,
    url TEXT,
    raw_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Job Requirements
CREATE TABLE IF NOT EXISTS job_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    skill TEXT NOT NULL,
    is_explicit BOOLEAN DEFAULT true,
    minimum_level TEXT DEFAULT 'competent',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Repositories
CREATE TABLE IF NOT EXISTS repositories (
    id BIGINT PRIMARY KEY, -- GitHub Repo ID
    full_name TEXT UNIQUE NOT NULL,
    owner TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    html_url TEXT NOT NULL,
    default_branch TEXT NOT NULL,
    stars INT DEFAULT 0,
    forks INT DEFAULT 0,
    primary_language TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Commits
CREATE TABLE IF NOT EXISTS commits (
    sha VARCHAR(40) PRIMARY KEY,
    repository_id BIGINT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    message TEXT,
    author TEXT,
    committed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Assessments (Versioned by commit SHA)
CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    repository_id BIGINT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    commit_sha VARCHAR(40) NOT NULL REFERENCES commits(sha) ON DELETE CASCADE,
    version INT NOT NULL DEFAULT 1,
    overall_match_pct INT NOT NULL,
    score_explanation TEXT,
    hiring_disclaimer TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, repository_id, version)
);

-- 7. Assessment Requirement Results
CREATE TABLE IF NOT EXISTS assessment_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    skill TEXT NOT NULL,
    status TEXT NOT NULL, -- 'demonstrated', 'partially_demonstrated', 'not_demonstrated_in_scope', 'needs_review'
    explanation TEXT NOT NULL,
    confidence TEXT NOT NULL, -- 'high', 'medium', 'low'
    limitations TEXT,
    recommended_next_step TEXT,
    is_explicit_requirement BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Evidence References (Code citations)
CREATE TABLE IF NOT EXISTS evidence_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_requirement_id UUID NOT NULL REFERENCES assessment_requirements(id) ON DELETE CASCADE,
    repository_full_name TEXT NOT NULL,
    commit_sha VARCHAR(40) NOT NULL,
    file_path TEXT NOT NULL,
    start_line INT NOT NULL,
    end_line INT NOT NULL,
    evidence_snippet TEXT NOT NULL,
    explanation TEXT NOT NULL,
    is_validated BOOLEAN NOT NULL DEFAULT false,
    validation_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Webhook Deliveries (Deduplication & HMAC audit)
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    delivery_id TEXT PRIMARY KEY, -- X-GitHub-Delivery GUID
    event_type TEXT NOT NULL,
    signature_valid BOOLEAN NOT NULL,
    repository_full_name TEXT,
    before_sha VARCHAR(40),
    after_sha VARCHAR(40),
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'received', -- 'received', 'processing', 'completed', 'failed', 'ignored_readme_only'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Background Processing Queue & Retry Metadata
CREATE TABLE IF NOT EXISTS background_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL, -- 'reassess_repository'
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for high performance
CREATE INDEX IF NOT EXISTS idx_assessments_job_repo ON assessments(job_id, repository_id);
CREATE INDEX IF NOT EXISTS idx_assessment_reqs_assessment ON assessment_requirements(assessment_id);
CREATE INDEX IF NOT EXISTS idx_evidence_req_id ON evidence_references(assessment_requirement_id);
CREATE INDEX IF NOT EXISTS idx_webhook_repo ON webhook_deliveries(repository_full_name);
