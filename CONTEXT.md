# Project Context & Session Handoff

## 1. Project Overview & Architecture

### Summary & Target End-State
We have built a production-grade **AI Career Coach** that evaluates a student's actual GitHub portfolio against real job and internship requirements. It addresses the fundamental flaw of naive resume keyword matchers by requiring **authentic, verifiable code evidence** for technical skills.

The system:
- Ingests real job requirements from live public job boards (Greenhouse, Lever) or pasted descriptions.
- Analyzes authentic repository source code at a pinned GitHub commit SHA.
- Evaluates skills into 4 objective statuses: `demonstrated`, `partially_demonstrated`, `not_demonstrated_in_scope`, or `needs_review`.
- Verifies every code citation programmatically (1-indexed line ranges, file bounds, and exact snippet content).
- Reassesses skills automatically via GitHub push webhooks (`X-Hub-Signature-256` HMAC SHA-256 verified) with idempotent deduplication (`X-GitHub-Delivery`).
- Strictly rejects documentation/README-only changes from falsely awarding technical skills.
- Stores historical versions linked to commit SHAs (v1, v2, v3...) so student progress can be compared over time.

### Tech Stack, Frameworks & Runtime Versions
- **Runtime**: Node.js `v20.20.2`, npm `10.8.2`
- **Backend**:
  - Express `^4.19.2`, TypeScript `^5.4.3`, NodeNext module resolution
  - Zod `^3.23.8` for structured schema validation
  - Official GitHub REST API (`@octokit/rest` / native Fetch)
  - `crypto` (HMAC SHA-256 signature verification)
  - `pdf-parse` (optional resume parser, strictly flagging unverified claims)
  - Vitest `^1.4.0` for unit and integration testing
  - `tsx` for TypeScript execution
- **Frontend**:
  - React `^18.2.0`, Vite `^5.1.6`, TypeScript `^5.4.3`
  - Tailwind CSS `^3.4.1`, PostCSS, Autoprefixer
  - `lucide-react` for developer-focused icons
- **Database & Persistence**:
  - Embedded durable file-backed JSON store (`data/career_coach_store.json`) ensuring 100% functionality out-of-the-box without external cloud dependencies.
  - Complete Supabase PostgreSQL schema migration script (`supabase/migrations/001_initial_schema.sql`).

### Directory Tree & Module Purposes
```
Kurukshetra/
├── backend/
│   ├── src/
│   │   ├── analyzer/
│   │   │   ├── citationValidator.ts   # Programmatic 1-indexed line range & snippet verification
│   │   │   └── codeEvidenceEngine.ts  # Code inspection engine with Zod schema & README filter
│   │   ├── db/
│   │   │   └── storage.ts             # Durable store with versioning (v1, v2...) & job queues
│   │   ├── github/
│   │   │   └── githubService.ts       # GitHub REST client (repos, commits, trees, diffs)
│   │   ├── jobs/
│   │   │   └── jobDiscoveryService.ts # Live Greenhouse & Lever board queries + JD parser
│   │   ├── resume/
│   │   │   └── resumeParser.ts        # PDF/text parser (claims strictly labeled unverified)
│   │   ├── routes/
│   │   │   └── api.ts                 # REST API endpoints for all frontend views
│   │   ├── skills/
│   │   │   ├── gapAnalyzer.ts         # Weighted score calculation & hiring disclaimer
│   │   │   └── taxonomy.ts            # Canonical skill taxonomy & alias normalization dictionary
│   │   ├── webhooks/
│   │   │   └── webhookHandler.ts      # HMAC SHA-256 verifier, deduplicator & reassessment worker
│   │   └── index.ts                   # Express server entry point with raw body preservation
│   ├── scripts/
│   │   └── demo_verification.ts       # Automated end-to-end simulation & verification script
│   ├── tests/
│   │   ├── citations_and_analysis.test.ts # Citation validation & README exclusion tests
│   │   ├── github_and_resumes.test.ts     # Pagination, rate limiting & resume unverified tests
│   │   ├── skills.test.ts                 # Taxonomy normalization & weighted match score tests
│   │   └── webhooks_and_history.test.ts   # HMAC SHA-256, deduplication & versioning tests
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Navbar.tsx             # Developer navigation bar with contextual target pills
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx      # High-level metrics, active targets, recent evaluations
│   │   │   ├── JobDiscoveryPage.tsx   # Live Greenhouse/Lever search + custom JD drawer
│   │   │   ├── JobDetailsPage.tsx     # Explicit vs inferred technical requirements view
│   │   │   ├── RepoSelectionPage.tsx  # GitHub username search, repo stats & assessment trigger
│   │   │   ├── SkillAssessmentPage.tsx# Score breakdown, pills, disclaimer, bonus skills
│   │   │   ├── EvidenceExplorerPage.tsx# Line-numbered code viewer & GitHub permalinks
│   │   │   ├── AssessmentHistoryPage.tsx# Commit version timeline & side-by-side diff
│   │   │   ├── EventStatusPage.tsx    # Webhook delivery audit table & polling fallback
│   │   │   └── SettingsPage.tsx       # Tunneling, secrets, rate limits & resume claims tester
│   │   ├── services/
│   │   │   └── api.ts                 # Typed frontend API client
│   │   ├── types/
│   │   │   └── index.ts               # Shared TypeScript interfaces and domain models
│   │   ├── App.tsx                    # Main state container & view router
│   │   ├── index.css                  # Tailwind styles
│   │   └── main.tsx                   # React 18 bootstrap
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql     # Full Supabase PostgreSQL schema with 10 tables & indexes
├── .env.example
├── package.json                       # Root workspace scripts
└── README.md                          # Full architectural & demonstration documentation
```

---

## 2. Environment & Tooling State

### Local Setup & Services
- The backend and frontend run locally as independent Node.js processes.
- Embedded storage data is stored in `backend/data/career_coach_store.json`.
- The frontend Vite dev server proxies `/api` requests to `http://localhost:4000`.

### Environment Variables
Located in `backend/.env` (and template `.env.example`):
```env
PORT=4000
GITHUB_TOKEN=                       # Optional: Personal Access Token (5000 req/hr vs 60 req/hr)
GITHUB_WEBHOOK_SECRET=your-secure-webhook-secret-here # HMAC secret for X-Hub-Signature-256
SUPABASE_URL=                       # Optional: Remote Supabase instance URL
SUPABASE_ANON_KEY=                  # Optional: Remote Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=          # Optional: Remote Supabase service role key
```

### Exact Terminal Commands

```powershell
# 1. Run all 21 automated backend tests
npm test

# 2. Run the end-to-end demonstration verification script
npm run demo

# 3. Build backend and frontend for production
npm run build:backend
npm run build:frontend

# 4. Start Backend Server (runs on http://localhost:4000)
npm run dev:backend

# 5. Start Frontend UI (runs on http://localhost:5173)
npm run dev:frontend
```

---

## 3. Work Completed So Far

1. **Attribution & Licensing**:
   - Reference repo: [JaweriaAsif745/Resume-github-job-analyzer](https://github.com/JaweriaAsif745/Resume-github-job-analyzer) inspected.
   - Skill vocabulary adapted under MIT License; attributed in `README.md`.
2. **Skill Taxonomy & Normalization Engine**:
   - 9 technical categories with alias dictionary and multi-word tokenizer.
   - Handles capitalization, punctuation, and multi-word terms (`Machine Learning`, `REST API`, `CI/CD`).
3. **Evidence-Based Match Scoring**:
   - Calculated as: `(demonstrated * 1.0 + partial * 0.5) / total * 100`.
   - Explicit disclaimer that score is **not a hiring guarantee**.
4. **Live Job Discovery**:
   - Live endpoints for Greenhouse (`cloudflare`, `figma`) and Lever (`netlify`).
   - Pasted job description parser differentiating explicit from inferred requirements.
5. **Code Evidence Engine & Citation Validation**:
   - AST/regex pattern detection on authentic code files.
   - Filters out non-source files (`README.md`, `LICENSE`, docs, configs).
   - Validates that citations match line ranges and snippet strings programmatically.
6. **Push Webhook Reassessment & Polling Fallback**:
   - HMAC SHA-256 signature verification (`crypto.timingSafeEqual`).
   - Delivery deduplication via `X-GitHub-Delivery`.
   - Reassessment worker updates assessments to new version (v2, v3).
   - Detects README-only changes and creates an audit record **without falsely boosting skill scores**.
7. **Complete 9-Page React Frontend**:
   - Restrained, professional developer UI with dark navbar, subtle borders, and monospace accents.
   - All 9 pages connected to live backend APIs.
8. **Automated Test Suite**:
   - 21 Vitest tests across 4 test suites passing with 100% success rate.
   - End-to-end demonstration script (`npm run demo`) verified.

---

## 4. Current Work in Progress & Active State

- **Current State**: All core stages (Audit, Reusable Foundations, Assessment Engine, Webhooks & Polling, 9-Page Frontend, Automated Testing, and E2E Demo Script) are **100% implemented, tested, and passing**.
- **Last Command Executed**: `npm test` (all 25 tests passed cleanly) & `npm run demo` (verified).
- **Recent Major Fix**: GitHub API Rate-Limit Diagnostics & Resilience:
  - Differentiated primary rate limit (`remaining: 0`), secondary limits (burst frequency / `Retry-After`), permission errors, and 401 bad credentials.
  - Added in-memory TTL caching (10m for users & repos, 60m for trees & file blobs) and in-flight request deduplication.
  - Reduced unnecessary quota usage by paging on demand rather than fetching 3 pages unconditionally on initial search.
  - Added live quota status indicator (`/api/github/rate-limit-status`) and clear actionable error cards with retry buttons on frontend.
- **Working Files**:
  - `backend/src/github/githubService.ts` (diagnostics, caching, in-flight deduplication).
  - `backend/src/routes/api.ts` (structured GitHub API error handler & rate limit status endpoint).
  - `frontend/src/pages/RepoSelectionPage.tsx` (quota bar, action cards, result preservation).
  - `backend/tests/github_and_resumes.test.ts` (expanded to 9 tests covering caching, limits, 401, 403, 404).
- **Uncommitted Changes**: Clean workspace; all code files are persisted in `backend/` and `frontend/`.

---

## 5. Roadblocks, Bugs & Failed Attempts (What NOT to Do)

1. **Do NOT use loose string fuzzy matching (`fuzzywuzzy`) for skills**:
   - *Reason*: Fuzzy string distance produces catastrophic false positives (e.g. matching `fast` to `FastAPI`, or `java` to `JavaScript`).
   - *Solution*: Use the deterministic canonical dictionary in `backend/src/skills/taxonomy.ts`.
2. **Do NOT treat README.md or markdown files as technical skill evidence**:
   - *Reason*: Students can easily write "I am an expert in Kubernetes" in a README.
   - *Solution*: `isDocumentationOrMetaFile()` in `backend/src/analyzer/codeEvidenceEngine.ts` strictly excludes markdown and doc files from code citations.
3. **Do NOT parse JSON body before capturing raw bytes for webhooks**:
   - *Reason*: GitHub's HMAC SHA-256 signature is calculated over the raw request payload buffer. If Express parses the JSON first, key order or whitespace differences break signature verification.
   - *Solution*: Express is configured with `verify: (req, res, buf) => { req.rawBody = buf; }` in `backend/src/index.ts`.
4. **Do NOT use commit SHAs with length other than 7–40 hex characters**:
   - *Reason*: Zod schema `EvidenceCitationSchema` enforces `/^[0-9a-f]{7,40}$/i`. A 41-character mock string will fail schema validation.
5. **Do NOT leave unused imports in TypeScript files**:
   - *Reason*: `tsconfig.json` has `"noUnusedLocals": true`. Any unused import will halt `npm run build:frontend`.

---

## 6. Exact Next Steps (Prioritized for Next Agent)

If expanding this project further, here is the prioritized roadmap:

### Immediate Step 1: Real-Time Webhook Tunnel Integration
- For testing live GitHub push webhooks from a real GitHub repository:
  1. Start backend: `npm run dev:backend`.
  2. Run tunneling tool: `cloudflared tunnel --url http://localhost:4000` (or `ngrok http 4000`).
  3. In a GitHub test repository, go to **Settings → Webhooks → Add Webhook**:
     - Payload URL: `https://<tunnel-url>/api/webhooks/github`
     - Content type: `application/json`
     - Secret: `your-secure-webhook-secret-here` (matching `backend/.env`)
     - Events: Select `Just the push event`.

### Subsequent Step 2: Supabase Live Cloud Sync
- The application currently uses the embedded durable file store (`backend/data/career_coach_store.json`).
- To connect a live Supabase database:
  1. Create a Supabase project at [supabase.com](https://supabase.com).
  2. Paste and run `supabase/migrations/001_initial_schema.sql` in the Supabase SQL Editor.
  3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env`.

### Subsequent Step 3: Add LLM Assessment Provider (Optional Enhancement)
- The current rule-based AST/regex code engine evaluates authentic code patterns deterministically and reliably.
- An optional OpenAI or Google Gemini LLM provider can be plugged into `backend/src/analyzer/codeEvidenceEngine.ts` to provide deeper semantic reasoning for complex architectural patterns, while keeping the programmatic `citationValidator.ts` as the tamper-proof gatekeeper.

### Subsequent Step 4: Add Student PDF Report Export
- Add a "Export Portfolio Audit Report (PDF)" button on the `SkillAssessmentPage` that exports the demonstrated skills, line citations, and hiring disclaimer into an downloadable student report.
