# 🎯 AI Career Coach — Verifiable Code-Evidence Portfolio Evaluator

> A production-grade AI Career Coach that evaluates a student's actual GitHub portfolio against real job and internship requirements. It identifies which skills are demonstrated by code, which are partially demonstrated, which are missing from scope, and which require human review — backed by verifiable, line-range code citations pinned to exact commit SHAs.

---

## 🏛️ Architecture Overview

The system consists of a decoupled, high-performance architecture:

```
Kurukshetra/
├── backend/                  # Node.js + Express + TypeScript Backend
│   ├── src/
│   │   ├── analyzer/         # Code evidence engine & citation line-range validator
│   │   ├── db/               # Durable JSON store + Supabase PostgreSQL schema client
│   │   ├── github/           # GitHub REST API client (profiles, repos, commits, diffs)
│   │   ├── jobs/             # Live Greenhouse & Lever public APIs + Custom JD parser
│   │   ├── resume/           # Resume parser (unverified claims kept strictly separate)
│   │   ├── skills/           # Skill taxonomy, canonical normalization, gap analyzer
│   │   ├── webhooks/         # GitHub push webhook HMAC SHA-256 verifier & retry queue
│   │   ├── routes/           # REST API endpoints
│   │   └── index.ts          # Server entry point with raw body verification
│   └── tests/                # Automated Vitest test suite (21 unit & integration tests)
├── frontend/                 # React 18 + Vite + TypeScript + Tailwind CSS Frontend
│   └── src/
│       ├── components/       # Restrained, polished developer navbar & UI components
│       ├── pages/            # 9 Dedicated Views (Dashboard, Jobs, Repo Selection, etc.)
│       └── services/         # Typed API client
└── supabase/
    └── migrations/           # Supabase PostgreSQL durable storage DDL
```

---

## ⚖️ Attribution & License Compliance

This project reuses, adapts, and substantially extends concepts from the open-source reference project:
- **Reference Repository:** [JaweriaAsif745/Resume-github-job-analyzer](https://github.com/JaweriaAsif745/Resume-github-job-analyzer)
- **License:** MIT License (Jaweria Asif Khan)
- **Attribution Note:** Portions of technical skill keyword vocabulary and basic GitHub profile query concepts were adapted from the reference repository under the terms of the MIT License.

### Feature Mapping Table

| Feature Category | Reference Repo Status | Our Implementation | Classification |
| :--- | :--- | :--- | :--- |
| **Skill Vocabulary** | Basic flat list of ~100 keywords (`skills_list.txt`) | Curated multi-domain taxonomy (Languages, Frameworks, DBs, Cloud, ML, DevOps, Testing) | **Adapted & Improved** |
| **Skill Normalization** | Python NLTK / Regex with basic string distance | High-speed TypeScript tokenizer with deterministic canonical alias resolution (e.g. `js` → `JavaScript`, `postgres` → `PostgreSQL`) | **Adapted & Improved** |
| **GitHub Integration** | Basic profile and language query (`requests`) | Official GitHub REST API with pagination, rate limit resilience, commit SHA pinning, tree inspection, and diff comparison | **Substantially Extended** |
| **Match Scoring** | Raw string ratio `len(A & B) / len(B)` | Weighted formula (100% full, 50% partial) with explicit disclaimer that it measures code evidence coverage, NOT hiring probability | **Substantially Extended** |
| **Resume Parsing** | Central assessment mechanism via PyPDF2 | Optional secondary feature; resume claims are strictly marked as **unverified claims** separate from code proof | **Adapted & Improved** |
| **Real Job Discovery** | None (only manual PDF/text upload) | Live querying of public **Greenhouse** (`cloudflare`, `figma`) & **Lever** (`netlify`) APIs + Pasted JD fallback | **Built from Scratch** |
| **Source Code Analysis** | None (only repo descriptions and language bytes) | Automated AST/regex pattern matching of authentic code files at pinned commit SHA | **Built from Scratch** |
| **Citation Validator** | None | Programmatic validator verifying file existence, 1-indexed line ranges, and exact snippet matching | **Built from Scratch** |
| **README-only Filter** | None | Strictly excludes markdown/docs/metadata from code evidence; prevents false skill claims on documentation updates | **Built from Scratch** |
| **Event Reassessment** | None | GitHub push webhook with HMAC SHA-256 verification, deduplication, retry queue, and commit polling fallback | **Built from Scratch** |
| **Frontend UI** | Streamlit Python UI (`streamlit run app.py`) | Production React 18 + Vite + TypeScript + Tailwind CSS with 9 dedicated pages | **Built from Scratch** |
| **Database & Versioning** | In-memory only (lost on restart) | Supabase PostgreSQL schema with historical version tracking per commit SHA | **Built from Scratch** |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9+ or v10+

### 2. Installation

Clone and install dependencies for both services:

```bash
# In the root repository directory
cd backend && npm install
cd ../frontend && npm install
```

### 3. Environment Configuration

Copy the `.env.example` file in the root or `backend/` directory:

```bash
cp .env.example backend/.env
```

Default configuration values:
```env
PORT=4000
GITHUB_TOKEN=                       # Optional: Personal Access Token (increases API limit from 60 to 5000 req/hr)
GITHUB_WEBHOOK_SECRET=your-secret   # Secret used for HMAC SHA-256 push webhook verification
SUPABASE_URL=                       # Optional: Supabase PostgreSQL instance URL
SUPABASE_SERVICE_ROLE_KEY=          # Optional: Supabase Service Role Key
```

### 4. Running the Application

You can run both backend and frontend concurrently:

```bash
# Terminal 1: Start Backend (Port 4000)
cd backend
npm run dev

# Terminal 2: Start Frontend (Port 5173)
cd frontend
npm run dev
```

Open your browser to: **`http://localhost:5173`**

---

## 🧪 Automated Testing

Run the full automated test suite covering skill normalization, citation validation, code evidence analysis, README-only protection, and webhook HMAC deduplication:

```bash
cd backend
npm test
```

### Test Coverage Summary:
- **`skills.test.ts`**: Canonical alias mapping, multiword skill extraction, weighted match scores, hiring disclaimer verification.
- **`citations_and_analysis.test.ts`**: Line-range bounds checking, snippet correspondence verification, documentation file filtering, and verified code evidence generation.
- **`github_and_resumes.test.ts`**: GitHub REST API pagination, 404/403 rate limit handling, and resume claim separation.
- **`webhooks_and_history.test.ts`**: HMAC SHA-256 signature verification, delivery ID deduplication, historical assessment versioning, and proof that **README-only commits do not alter technical skill scores**.

---

## 🔄 End-to-End Demonstration Walkthrough

Follow these steps for a complete, verifiable end-to-end demonstration:

### Step 1: Discover Real Job Listings
1. Navigate to **Job Discovery** (`/jobs`).
2. Click **"Greenhouse: Cloudflare"** or **"Lever: Netlify"** to query live public endpoints.
3. Or paste a job description using the **"Paste Job Description"** drawer.
4. Click **"View Requirements"** to view structured explicit vs inferred requirements.

### Step 2: Select a Public GitHub Repository
1. Navigate to **Repositories** (`/github_repos`).
2. Enter any public GitHub username (e.g. `facebook`, `vercel`, or your student handle) and click **"Fetch Repositories"**.
3. View repository metadata (stars, forks, languages, default branch).
4. Select a repository and click **"Assess Repository"**.

### Step 3: Inspect Evidence-Backed Skill Assessment
1. The system pins the assessment to the latest commit SHA and retrieves authentic code files.
2. In **Skill Assessment** (`/assessment`), view:
   - Demonstrated Match Score % (weighted: 100% for demonstrated, 50% for partial).
   - Clear breakdown pills: Demonstrated, Partial Usage, Missing in Scope, Needs Review.
   - Transparent calculation note and hiring disclaimer.
   - Bonus portfolio skills not required by the job.

### Step 4: Explore Line-Range Code Evidence
1. Navigate to **Evidence Explorer** (`/evidence`).
2. Review validated code snippets with exact 1-indexed line numbers (e.g. `L5-L28`).
3. Click **"GitHub Permalink"** to inspect the source file directly on GitHub at the exact commit SHA.

### Step 5: Test Webhook Reassessment & README-Only Protection
1. Navigate to **Event Processing** (`/event_status`).
2. When a GitHub push webhook is received at `POST /api/webhooks/github`:
   - HMAC SHA-256 signature is verified using `crypto.createHmac`.
   - Event is deduplicated using `X-GitHub-Delivery`.
   - If the commit only modified `README.md` or markdown files, the system records `ignored_readme_only` and saves an audit note, **refusing to falsely claim technical skills**.
   - If actual code files changed, the background worker reassesses the codebase and creates a new version (e.g. `v2`).
3. In **History & Diff** (`/history`), view the side-by-side progression between `v1` and `v2`.

---

## 🗄️ Supabase PostgreSQL Setup (Optional Cloud Storage)

For persistent cloud deployment, apply the provided migration schema to your Supabase PostgreSQL instance:

1. In Supabase Dashboard, open the **SQL Editor**.
2. Run the script located in `supabase/migrations/001_initial_schema.sql`.
3. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to your `backend/.env`.

---

## 🌐 Local Webhook Tunneling

To test GitHub webhooks against your local development server:

```bash
# Using ngrok:
ngrok http 4000

# Using cloudflared:
cloudflared tunnel --url http://localhost:4000
```

Set your repository webhook Payload URL to:
`https://<your-tunnel-subdomain>/api/webhooks/github` with secret `your-secure-webhook-secret-here`.
