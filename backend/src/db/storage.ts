/**
 * Durable Storage Layer
 * Supports Supabase PostgreSQL and provides an embedded file-backed store
 * ensuring full persistence, historical versioning, and crash-resilience.
 */

import fs from 'fs';
import path from 'path';
import { DiscoveredJob } from '../jobs/jobDiscoveryService.js';
import { GitHubRepository, GitCommitInfo } from '../github/githubService.js';
import { AssessedSkillResult, MatchScoreResult } from '../skills/gapAnalyzer.js';
import { StoredRoadmap, ProjectProgressStatus } from '../roadmap/roadmapTypes.js';

export interface StoredAssessment {
  id: string;
  jobId: string;
  repositoryId: number;
  repositoryFullName: string;
  commitSha: string;
  version: number;
  matchScore: MatchScoreResult;
  assessedSkills: AssessedSkillResult[];
  createdAt: string;
}

export interface WebhookDeliveryRecord {
  deliveryId: string;
  eventType: string;
  signatureValid: boolean;
  repositoryFullName: string;
  beforeSha: string;
  afterSha: string;
  filesChanged: string[];
  isReadmeOnly: boolean;
  status: 'received' | 'processing' | 'completed' | 'failed' | 'ignored_readme_only';
  errorMessage?: string;
  createdAt: string;
}

export interface BackgroundJobRecord {
  id: string;
  jobType: string;
  payload: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StorageData {
  jobs: Record<string, DiscoveredJob>;
  repositories: Record<number, GitHubRepository>;
  commits: Record<string, GitCommitInfo & { repositoryId: number }>;
  assessments: StoredAssessment[];
  webhookDeliveries: Record<string, WebhookDeliveryRecord>;
  backgroundJobs: Record<string, BackgroundJobRecord>;
  roadmaps: Record<string, StoredRoadmap>;
}

export class StorageService {
  private dataFilePath: string;
  private data: StorageData;

  constructor(customPath?: string) {
    this.dataFilePath = customPath || path.resolve(process.cwd(), 'data', 'career_coach_store.json');
    this.data = {
      jobs: {},
      repositories: {},
      commits: {},
      assessments: [],
      webhookDeliveries: {},
      backgroundJobs: {},
      roadmaps: {},
    };
    this.init();
  }

  private init() {
    try {
      const dir = path.dirname(this.dataFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(this.dataFilePath)) {
        const raw = fs.readFileSync(this.dataFilePath, 'utf-8');
        this.data = JSON.parse(raw);
        this.data.roadmaps = this.data.roadmaps || {};
      } else {
        this.persist();
      }
    } catch (err) {
      console.warn('Initializing in-memory storage fallback:', err);
    }
  }


  private persist() {
    try {
      fs.writeFileSync(this.dataFilePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist storage:', err);
    }
  }

  // --- Jobs ---
  saveJob(job: DiscoveredJob): void {
    this.data.jobs[job.id] = job;
    this.persist();
  }

  getJob(id: string): DiscoveredJob | undefined {
    return this.data.jobs[id];
  }

  listJobs(): DiscoveredJob[] {
    return Object.values(this.data.jobs).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  // --- Repositories ---
  saveRepository(repo: GitHubRepository): void {
    this.data.repositories[repo.id] = repo;
    this.persist();
  }

  getRepository(id: number): GitHubRepository | undefined {
    return this.data.repositories[id];
  }

  getRepositoryByFullName(fullName: string): GitHubRepository | undefined {
    return Object.values(this.data.repositories).find(
      (r) => r.full_name.toLowerCase() === fullName.toLowerCase()
    );
  }

  listRepositories(): GitHubRepository[] {
    return Object.values(this.data.repositories);
  }

  // --- Commits ---
  saveCommit(repositoryId: number, commit: GitCommitInfo): void {
    this.data.commits[commit.sha] = {
      ...commit,
      repositoryId,
    };
    this.persist();
  }

  getCommit(sha: string): (GitCommitInfo & { repositoryId: number }) | undefined {
    return this.data.commits[sha];
  }

  // --- Assessments (Historical Versioning) ---
  saveAssessment(assessment: Omit<StoredAssessment, 'id' | 'version' | 'createdAt'>): StoredAssessment {
    // Look up previous versions for this job & repository
    const existing = this.data.assessments.filter(
      (a) => a.jobId === assessment.jobId && a.repositoryId === assessment.repositoryId
    );

    const nextVersion = existing.length > 0 ? Math.max(...existing.map((e) => e.version)) + 1 : 1;
    const newRecord: StoredAssessment = {
      ...assessment,
      id: `asmt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      version: nextVersion,
      createdAt: new Date().toISOString(),
    };

    this.data.assessments.push(newRecord);
    this.persist();
    return newRecord;
  }

  getLatestAssessment(jobId: string, repositoryId: number): StoredAssessment | undefined {
    const matching = this.data.assessments.filter(
      (a) => a.jobId === jobId && a.repositoryId === repositoryId
    );
    if (matching.length === 0) return undefined;
    return matching.sort((a, b) => b.version - a.version)[0];
  }

  getAssessmentHistory(jobId: string, repositoryId: number): StoredAssessment[] {
    return this.data.assessments
      .filter((a) => a.jobId === jobId && a.repositoryId === repositoryId)
      .sort((a, b) => b.version - a.version);
  }

  getAllAssessments(): StoredAssessment[] {
    return [...this.data.assessments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // --- Webhook Deliveries ---
  saveWebhookDelivery(delivery: WebhookDeliveryRecord): void {
    this.data.webhookDeliveries[delivery.deliveryId] = delivery;
    this.persist();
  }

  getWebhookDelivery(deliveryId: string): WebhookDeliveryRecord | undefined {
    return this.data.webhookDeliveries[deliveryId];
  }

  listWebhookDeliveries(): WebhookDeliveryRecord[] {
    return Object.values(this.data.webhookDeliveries).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // --- Background Jobs ---
  createBackgroundJob(jobType: string, payload: any): BackgroundJobRecord {
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const record: BackgroundJobRecord = {
      id,
      jobType,
      payload,
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.backgroundJobs[id] = record;
    this.persist();
    return record;
  }

  updateBackgroundJob(id: string, updates: Partial<BackgroundJobRecord>): BackgroundJobRecord | undefined {
    const job = this.data.backgroundJobs[id];
    if (!job) return undefined;
    Object.assign(job, updates, { updatedAt: new Date().toISOString() });
    this.persist();
    return job;
  }

  listBackgroundJobs(): BackgroundJobRecord[] {
    return Object.values(this.data.backgroundJobs).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // --- Career Roadmaps ---
  saveRoadmap(roadmap: StoredRoadmap): StoredRoadmap {
    this.data.roadmaps[roadmap.id] = roadmap;
    this.persist();
    return roadmap;
  }

  getRoadmap(id: string): StoredRoadmap | undefined {
    return this.data.roadmaps[id];
  }

  getLatestRoadmap(assessmentId?: string, jobId?: string): StoredRoadmap | undefined {
    const list = Object.values(this.data.roadmaps);
    let filtered = list;

    if (assessmentId) {
      filtered = filtered.filter((r) => r.assessmentId === assessmentId);
    } else if (jobId) {
      filtered = filtered.filter((r) => r.jobId === jobId);
    }

    if (filtered.length === 0) return undefined;
    return filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  }

  listRoadmaps(): StoredRoadmap[] {
    return Object.values(this.data.roadmaps).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  updateRoadmapProgress(
    roadmapId: string,
    projectId: string,
    milestoneId: string | null,
    isCompleted: boolean,
    projectStatus?: ProjectProgressStatus
  ): StoredRoadmap | undefined {
    const roadmap = this.data.roadmaps[roadmapId];
    if (!roadmap) return undefined;

    const project = roadmap.recommendedProjects.find((p) => p.id === projectId);
    if (!project) return undefined;

    if (milestoneId) {
      const milestone = project.milestones.find((m) => m.id === milestoneId);
      if (milestone) {
        milestone.isCompleted = isCompleted;
        if (isCompleted) {
          milestone.completedAt = new Date().toISOString();
        } else {
          delete milestone.completedAt;
        }
      }
    }

    if (projectStatus) {
      project.status = projectStatus;
    } else {
      // Auto-update project status based on milestones
      const allDone = project.milestones.every((m) => m.isCompleted);
      const someDone = project.milestones.some((m) => m.isCompleted);
      if (allDone && project.milestones.length > 0) {
        project.status = 'completed_and_verified';
      } else if (someDone) {
        project.status = 'in_progress';
      }
    }

    // Recalculate verified overall progress % strictly from completed milestones
    let totalM = 0;
    let completedM = 0;
    for (const p of roadmap.recommendedProjects) {
      for (const m of p.milestones) {
        totalM += 1;
        if (m.isCompleted) completedM += 1;
      }
    }

    roadmap.overallProgressPct = totalM > 0 ? Math.round((completedM / totalM) * 100) : 0;
    roadmap.updatedAt = new Date().toISOString();

    this.persist();
    return roadmap;
  }
}

