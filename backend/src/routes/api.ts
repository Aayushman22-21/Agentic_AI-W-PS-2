/**
 * AI Career Coach REST API Routes
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { StorageService } from '../db/storage.js';
import { GitHubService, GitHubApiError } from '../github/githubService.js';
import { JobDiscoveryService } from '../jobs/jobDiscoveryService.js';
import { ResumeParserService } from '../resume/resumeParser.js';
import { WebhookProcessor } from '../webhooks/webhookHandler.js';
import { analyzeRepositoryCode, isDocumentationOrMetaFile } from '../analyzer/codeEvidenceEngine.js';
import { calculateSkillGap } from '../skills/gapAnalyzer.js';
import { SKILL_TAXONOMY, extractSkillsFromText } from '../skills/taxonomy.js';
import {
  CANONICAL_CAREER_ROLES,
  analyzeAndPrioritizeSkillGaps,
  recommendProjectsForRoadmap,
  calculateRoadmapProgress,
} from '../roadmap/roadmapEngine.js';
import { StoredRoadmap } from '../roadmap/roadmapTypes.js';

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

export function createApiRouter(
  storage: StorageService,
  github: GitHubService,
  jobDiscovery: JobDiscoveryService,
  resumeParser: ResumeParserService,
  webhookProcessor: WebhookProcessor
): Router {
  const router = Router();

  // --- Skill Taxonomy ---
  router.get('/taxonomy', (_req: Request, res: Response) => {
    res.json({
      total: SKILL_TAXONOMY.length,
      skills: SKILL_TAXONOMY,
    });
  });

  // --- Job Discovery & Management ---
  router.get('/jobs', (_req: Request, res: Response) => {
    const jobs = storage.listJobs();
    res.json(jobs);
  });

  router.get('/jobs/:id', (req: Request, res: Response) => {
    const job = storage.getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  });

  router.get('/jobs/discover/greenhouse', async (req: Request, res: Response) => {
    const board = (req.query.board as string) || 'cloudflare';
    try {
      const jobs = await jobDiscovery.fetchGreenhouseJobs(board);
      // Auto-save discovered jobs
      jobs.slice(0, 10).forEach((j) => storage.saveJob(j));
      res.json(jobs);
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  router.get('/jobs/discover/lever', async (req: Request, res: Response) => {
    const company = (req.query.company as string) || 'netlify';
    try {
      const jobs = await jobDiscovery.fetchLeverJobs(company);
      // Auto-save discovered jobs
      jobs.slice(0, 10).forEach((j) => storage.saveJob(j));
      res.json(jobs);
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  router.post('/jobs/custom', (req: Request, res: Response) => {
    const { title, company, location, url, text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Job description text is required' });
    }
    const job = jobDiscovery.parsePastedJobDescription({
      title,
      company,
      location,
      url,
      text,
    });
    storage.saveJob(job);
    res.status(201).json(job);
  });

  // Helper for structured GitHub API error responses
  const sendGitHubError = (res: Response, err: any) => {
    if (err instanceof GitHubApiError) {
      return res.status(err.statusCode).json({
        error: err.message,
        errorType: err.errorType,
        statusCode: err.statusCode,
        rateLimit: err.rateLimitInfo,
        retryAfterSeconds: err.retryAfterSeconds,
        resetTime: err.resetTime,
        documentationUrl: err.documentationUrl,
        hint: err.hint,
      });
    }

    const message = err?.message || 'Unknown GitHub API error';
    return res.status(500).json({
      error: message,
      errorType: 'unknown',
      statusCode: 500,
    });
  };

  // --- GitHub Exploration & Diagnostics ---
  router.get('/github/rate-limit-status', async (_req: Request, res: Response) => {
    try {
      const live = await github.getLiveRateLimitStatus();
      res.json(live);
    } catch (err: any) {
      const fallback = github.getLastKnownRateLimit();
      if (fallback) {
        return res.json(fallback);
      }
      sendGitHubError(res, err);
    }
  });

  router.get('/github/profile/:username', async (req: Request, res: Response) => {
    try {
      const profile = await github.getUserProfile(req.params.username);
      res.json(profile);
    } catch (err: any) {
      sendGitHubError(res, err);
    }
  });

  router.get('/github/repos/:username', async (req: Request, res: Response) => {
    try {
      const maxPages = req.query.pages ? parseInt(req.query.pages as string, 10) : 1;
      const repos = await github.getUserRepositories(req.params.username, maxPages);
      // Auto-save repos in storage
      repos.forEach((r) => storage.saveRepository(r));
      res.json(repos);
    } catch (err: any) {
      sendGitHubError(res, err);
    }
  });

  router.get('/github/languages/:owner/:repo', async (req: Request, res: Response) => {
    try {
      const languages = await github.getRepositoryLanguages(req.params.owner, req.params.repo);
      res.json(languages);
    } catch (err: any) {
      sendGitHubError(res, err);
    }
  });

  // --- Assessment Engine ---
  router.post('/assess', async (req: Request, res: Response) => {
    try {
      const { jobId, owner, repoName, branch } = req.body;
      if (!jobId || !owner || !repoName) {
        return res.status(400).json({ error: 'jobId, owner, and repoName are required.' });
      }

      const job = storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ error: `Job ${jobId} not found.` });
      }

      // 1. Fetch latest commit info to PIN assessment
      const commit = await github.getLatestCommit(owner, repoName, branch);

      // Find or save repository
      let repository = storage.getRepositoryByFullName(`${owner}/${repoName}`);
      if (!repository) {
        repository = {
          id: Date.now(),
          name: repoName,
          full_name: `${owner}/${repoName}`,
          owner,
          description: null,
          html_url: `https://github.com/${owner}/${repoName}`,
          default_branch: branch || 'main',
          stars: 0,
          forks: 0,
          updated_at: new Date().toISOString(),
          languages: {},
          primary_language: null,
          topics: [],
          is_fork: false,
        };
        storage.saveRepository(repository);
      }
      storage.saveCommit(repository.id, commit);

      // 2. Fetch repository file tree
      const tree = await github.getRepositoryTree(owner, repoName, commit.sha);

      // 3. Select code files (limit to top 25 non-meta files to avoid rate limiting)
      const codeEntries = tree
        .filter((t) => t.type === 'blob' && !isDocumentationOrMetaFile(t.path))
        .slice(0, 25);

      const sourceFiles: Array<{ path: string; content: string }> = [];
      for (const entry of codeEntries) {
        try {
          const content = await github.getFileContent(owner, repoName, entry.path, commit.sha);
          sourceFiles.push({ path: entry.path, content });
        } catch {
          // Skip if binary or inaccessible
        }
      }

      // 4. Perform evidence-based analysis
      const assessedSkills = analyzeRepositoryCode({
        repository: repository.full_name,
        commitSha: commit.sha,
        files: sourceFiles,
        requirements: job.requirements,
      });

      // 5. Calculate skill gap score
      const matchScore = calculateSkillGap(
        job.requirements,
        assessedSkills,
        repository.topics
      );

      // 6. Persist versioned assessment
      const stored = storage.saveAssessment({
        jobId: job.id,
        repositoryId: repository.id,
        repositoryFullName: repository.full_name,
        commitSha: commit.sha,
        matchScore,
        assessedSkills,
      });

      res.status(201).json(stored);
    } catch (err: any) {
      console.error('Assessment failed:', err);
      res.status(500).json({ error: err.message || 'Assessment execution error.' });
    }
  });

  router.get('/assessments', (_req: Request, res: Response) => {
    res.json(storage.getAllAssessments());
  });

  router.get('/assessments/history', (req: Request, res: Response) => {
    const jobId = req.query.jobId as string;
    const repoId = Number(req.query.repoId);

    if (!jobId || isNaN(repoId)) {
      return res.status(400).json({ error: 'jobId and numeric repoId query parameters are required.' });
    }

    const history = storage.getAssessmentHistory(jobId, repoId);
    res.json(history);
  });

  // --- Resume Parsing (Optional Feature) ---
  router.post('/resume/parse', upload.single('resume'), async (req: Request, res: Response) => {
    try {
      if (req.file) {
        const result = await resumeParser.parsePdfBuffer(req.file.buffer);
        return res.json(result);
      }

      const { text } = req.body;
      if (text) {
        const result = resumeParser.parsePlainText(text);
        return res.json(result);
      }

      res.status(400).json({ error: 'No resume file or text provided.' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- Webhooks & Events ---
  router.post('/webhooks/github', async (req: Request, res: Response) => {
    try {
      const deliveryId = (req.headers['x-github-delivery'] as string) || `del_${Date.now()}`;
      const eventType = (req.headers['x-github-event'] as string) || 'push';
      const signatureHeader = req.headers['x-hub-signature-256'] as string;
      const secret = process.env.GITHUB_WEBHOOK_SECRET || 'development-webhook-secret';

      // rawBody is attached by express raw/json middleware
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);

      const result = await webhookProcessor.handleWebhook({
        deliveryId,
        eventType,
        signatureHeader,
        rawBody,
        parsedPayload: req.body,
        secret,
      });

      res.status(200).json(result);
    } catch (err: any) {
      res.status(401).json({ error: err.message });
    }
  });

  router.get('/webhooks/deliveries', (_req: Request, res: Response) => {
    res.json(storage.listWebhookDeliveries());
  });

  router.get('/background-jobs', (_req: Request, res: Response) => {
    res.json(storage.listBackgroundJobs());
  });

  router.post('/github/poll', async (req: Request, res: Response) => {
    const { owner, repo } = req.body;
    if (!owner || !repo) {
      return res.status(400).json({ error: 'owner and repo are required' });
    }
    try {
      const updated = await webhookProcessor.pollRepositoryForChanges(owner, repo);
      res.json({ checked: true, newCommitFound: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // Career Roadmap & Project Recommendation API
  // ==========================================

  // 1. Available Target Career Roles
  router.get('/roadmap/roles', (_req: Request, res: Response) => {
    // Combine canonical roles with unique job titles discovered in system
    const existingJobs = storage.listJobs();
    const dynamicJobRoles = Array.from(new Set(existingJobs.map((j) => j.title)))
      .filter((title) => !CANONICAL_CAREER_ROLES.some((r) => r.role.toLowerCase() === title.toLowerCase()))
      .map((title) => ({
        role: title,
        category: 'backend' as const,
        description: `Role dynamically discovered from job postings (${title}).`,
        coreSkills: [],
      }));

    res.json({
      canonicalRoles: CANONICAL_CAREER_ROLES,
      discoveredRoles: dynamicJobRoles,
    });
  });

  // 2. Generate or Update a Career Roadmap from an Assessment
  router.post('/roadmap/generate', (req: Request, res: Response) => {
    try {
      const {
        assessmentId,
        jobId,
        targetRole,
        targetCompany,
        seniority = 'mid',
        weeklyHours = 10,
      } = req.body;

      // 1. Retrieve Assessment
      let assessment = assessmentId
        ? storage.getAllAssessments().find((a) => a.id === assessmentId)
        : undefined;

      // Fallback: If no assessmentId provided, get latest assessment
      if (!assessment) {
        const allAssessments = storage.getAllAssessments();
        if (jobId) {
          assessment = allAssessments.find((a) => a.jobId === jobId);
        } else if (allAssessments.length > 0) {
          assessment = allAssessments[0];
        }
      }

      if (!assessment) {
        return res.status(400).json({
          error: 'No repository assessment found. Please run a skill assessment on your GitHub repository first so recommendations are grounded in authentic evidence.',
        });
      }

      // 2. Retrieve Job
      const effectiveJobId = jobId || assessment.jobId;
      const job = storage.getJob(effectiveJobId);
      if (!job) {
        return res.status(404).json({ error: `Associated job ${effectiveJobId} not found.` });
      }

      const effectiveRole = targetRole || job.title;

      // 3. Analyze & Prioritize Skill Gaps
      const skillGaps = analyzeAndPrioritizeSkillGaps(job, assessment.assessedSkills, effectiveRole);

      // 4. Recommend Sequenced Projects
      const recommendedProjects = recommendProjectsForRoadmap(effectiveRole, skillGaps, seniority);

      // 5. Calculate initial milestone progress
      const overallProgressPct = calculateRoadmapProgress(recommendedProjects);

      // 6. Check for previous roadmap version
      const existingRoadmap = storage.getLatestRoadmap(assessment.id, job.id);
      const nextVersion = existingRoadmap ? existingRoadmap.version + 1 : 1;

      const roadmap: StoredRoadmap = {
        id: `rdm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        assessmentId: assessment.id,
        jobId: job.id,
        jobTitle: job.title,
        jobCompany: targetCompany || job.company,
        jobSourceUrl: job.url || undefined,
        repositoryId: assessment.repositoryId,
        repositoryFullName: assessment.repositoryFullName,
        commitSha: assessment.commitSha,
        assessmentVersion: assessment.version,
        preferences: {
          targetRole: effectiveRole,
          targetCompany: targetCompany || job.company,
          seniority,
          weeklyHours: Number(weeklyHours) || 10,
        },
        skillGaps,
        recommendedProjects,
        overallProgressPct,
        version: nextVersion,
        previousVersionId: existingRoadmap?.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const saved = storage.saveRoadmap(roadmap);
      res.status(201).json(saved);
    } catch (err: any) {
      console.error('Failed to generate roadmap:', err);
      res.status(500).json({ error: err.message || 'Error generating career roadmap.' });
    }
  });

  // 3. Get Latest Active Roadmap
  router.get('/roadmap/latest', (req: Request, res: Response) => {
    const assessmentId = req.query.assessmentId as string | undefined;
    const jobId = req.query.jobId as string | undefined;

    const roadmap = storage.getLatestRoadmap(assessmentId, jobId);
    if (!roadmap) {
      return res.status(404).json({ error: 'No roadmap found. Please generate one first.' });
    }
    res.json(roadmap);
  });

  // 4. Get Roadmap by ID
  router.get('/roadmap/:id', (req: Request, res: Response) => {
    const roadmap = storage.getRoadmap(req.params.id);
    if (!roadmap) {
      return res.status(404).json({ error: 'Roadmap not found.' });
    }
    res.json(roadmap);
  });

  // 5. Update Project Progress & Milestone Completion
  router.patch('/roadmap/:id/progress', (req: Request, res: Response) => {
    const { projectId, milestoneId, isCompleted, projectStatus } = req.body;
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required.' });
    }

    const updated = storage.updateRoadmapProgress(
      req.params.id,
      projectId,
      milestoneId || null,
      Boolean(isCompleted),
      projectStatus
    );

    if (!updated) {
      return res.status(404).json({ error: 'Roadmap or project not found.' });
    }

    res.json(updated);
  });

  // 6. Reassess Roadmap against Latest Repository Evidence
  router.post('/roadmap/:id/reassess', (req: Request, res: Response) => {
    try {
      const existing = storage.getRoadmap(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Roadmap not found.' });
      }

      // Fetch the latest assessment for this job and repository
      const latestAssessment = storage.getLatestAssessment(existing.jobId, existing.repositoryId);
      if (!latestAssessment) {
        return res.status(400).json({ error: 'No updated assessment found for this repository.' });
      }

      const job = storage.getJob(existing.jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found.' });
      }

      // Re-analyze skill gaps with new assessment
      const updatedGaps = analyzeAndPrioritizeSkillGaps(
        job,
        latestAssessment.assessedSkills,
        existing.preferences.targetRole
      );

      // Track newly demonstrated skills
      const newlyDemonstrated: string[] = [];
      for (const gap of updatedGaps) {
        const oldGap = existing.skillGaps.find((g) => g.skill.toLowerCase() === gap.skill.toLowerCase());
        if (oldGap && oldGap.evidenceStatus !== 'demonstrated' && gap.evidenceStatus === 'demonstrated') {
          newlyDemonstrated.push(gap.skill);
        }
      }

      const reassessmentNote = newlyDemonstrated.length > 0
        ? `Reassessment against commit ${latestAssessment.commitSha.substring(0, 7)} (v${latestAssessment.version}): newly verified code evidence found for ${newlyDemonstrated.join(', ')}.`
        : `Reassessment against commit ${latestAssessment.commitSha.substring(0, 7)} (v${latestAssessment.version}): skill evidence base verified; no new skills demonstrated.`;

      // Update project list: preserve user progress on existing projects, update targeted gaps
      const updatedProjects = existing.recommendedProjects.map((proj) => {
        const remainingGaps = proj.targetSkillGaps.filter((s) => {
          const gap = updatedGaps.find((g) => g.skill.toLowerCase() === s.toLowerCase());
          return gap ? gap.evidenceStatus !== 'demonstrated' : true;
        });

        return {
          ...proj,
          targetSkillGaps: remainingGaps,
        };
      });

      const updatedRoadmap: StoredRoadmap = {
        ...existing,
        id: `rdm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        assessmentId: latestAssessment.id,
        commitSha: latestAssessment.commitSha,
        assessmentVersion: latestAssessment.version,
        skillGaps: updatedGaps,
        recommendedProjects: updatedProjects,
        reassessmentNote,
        previousVersionId: existing.id,
        version: existing.version + 1,
        updatedAt: new Date().toISOString(),
      };

      const saved = storage.saveRoadmap(updatedRoadmap);
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error reassessing roadmap.' });
    }
  });

  return router;

}
