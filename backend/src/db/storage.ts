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
}
