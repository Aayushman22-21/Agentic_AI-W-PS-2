import {
  DiscoveredJob,
  GitHubUserProfile,
  GitHubRepository,
  StoredAssessment,
  WebhookDeliveryRecord,
  BackgroundJobRecord,
  GitHubRateLimitInfo,
  GitHubApiErrorDetail,
  GitHubErrorType,
  StoredRoadmap,
  AvailableCareerRole,
} from '../types';


export class GitHubClientError extends Error {
  public readonly errorType: GitHubErrorType;
  public readonly statusCode: number;
  public readonly rateLimit?: GitHubRateLimitInfo;
  public readonly retryAfterSeconds?: number;
  public readonly resetTime?: string;
  public readonly hint?: string;
  public readonly documentationUrl?: string;

  constructor(detail: GitHubApiErrorDetail) {
    super(detail.error);
    this.name = 'GitHubClientError';
    this.errorType = detail.errorType || 'unknown';
    this.statusCode = detail.statusCode || 500;
    this.rateLimit = detail.rateLimit;
    this.retryAfterSeconds = detail.retryAfterSeconds;
    this.resetTime = detail.resetTime;
    this.hint = detail.hint;
    this.documentationUrl = detail.documentationUrl;
  }
}

const API_BASE = '/api';

export const api = {
  // Jobs
  async getJobs(): Promise<DiscoveredJob[]> {
    const res = await fetch(`${API_BASE}/jobs`);
    if (!res.ok) throw new Error('Failed to fetch jobs');
    return res.json();
  },

  async getJob(id: string): Promise<DiscoveredJob> {
    const res = await fetch(`${API_BASE}/jobs/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Failed to fetch job details');
    return res.json();
  },

  async discoverGreenhouse(board: string = 'cloudflare'): Promise<DiscoveredJob[]> {
    const res = await fetch(`${API_BASE}/jobs/discover/greenhouse?board=${encodeURIComponent(board)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to discover Greenhouse jobs');
    }
    return res.json();
  },

  async discoverLever(company: string = 'netlify'): Promise<DiscoveredJob[]> {
    const res = await fetch(`${API_BASE}/jobs/discover/lever?company=${encodeURIComponent(company)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to discover Lever jobs');
    }
    return res.json();
  },

  async saveCustomJob(data: {
    title: string;
    company: string;
    location?: string;
    url?: string;
    text: string;
  }): Promise<DiscoveredJob> {
    const res = await fetch(`${API_BASE}/jobs/custom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save job');
    }
    return res.json();
  },

  // GitHub
  async getGitHubRateLimitStatus(): Promise<GitHubRateLimitInfo> {
    const res = await fetch(`${API_BASE}/github/rate-limit-status`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: 'Failed to fetch rate limit status' }));
      throw new GitHubClientError(errData);
    }
    return res.json();
  },

  async getGitHubProfile(username: string): Promise<GitHubUserProfile> {
    const res = await fetch(`${API_BASE}/github/profile/${encodeURIComponent(username)}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: 'Failed to fetch GitHub profile' }));
      throw new GitHubClientError(errData);
    }
    return res.json();
  },

  async getGitHubRepos(username: string, pages: number = 1): Promise<GitHubRepository[]> {
    const res = await fetch(`${API_BASE}/github/repos/${encodeURIComponent(username)}?pages=${pages}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: 'Failed to fetch GitHub repositories' }));
      throw new GitHubClientError(errData);
    }
    return res.json();
  },

  // Assessments
  async runAssessment(params: {
    jobId: string;
    owner: string;
    repoName: string;
    branch?: string;
  }): Promise<StoredAssessment> {
    const res = await fetch(`${API_BASE}/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Assessment failed');
    }
    return res.json();
  },

  async getAllAssessments(): Promise<StoredAssessment[]> {
    const res = await fetch(`${API_BASE}/assessments`);
    if (!res.ok) throw new Error('Failed to fetch assessments');
    return res.json();
  },

  async getAssessmentHistory(jobId: string, repoId: number): Promise<StoredAssessment[]> {
    const res = await fetch(`${API_BASE}/assessments/history?jobId=${encodeURIComponent(jobId)}&repoId=${repoId}`);
    if (!res.ok) throw new Error('Failed to fetch assessment history');
    return res.json();
  },

  // Events & Webhooks
  async getWebhookDeliveries(): Promise<WebhookDeliveryRecord[]> {
    const res = await fetch(`${API_BASE}/webhooks/deliveries`);
    if (!res.ok) throw new Error('Failed to fetch webhook deliveries');
    return res.json();
  },

  async getBackgroundJobs(): Promise<BackgroundJobRecord[]> {
    const res = await fetch(`${API_BASE}/background-jobs`);
    if (!res.ok) throw new Error('Failed to fetch background jobs');
    return res.json();
  },

  async triggerPoll(owner: string, repo: string): Promise<{ checked: boolean; newCommitFound: boolean }> {
    const res = await fetch(`${API_BASE}/github/poll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner, repo }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Polling failed');
    }
    return res.json();
  },

  // Resume Parsing (optional)
  async parseResume(fileOrText: File | string): Promise<any> {
    if (typeof fileOrText === 'string') {
      const res = await fetch(`${API_BASE}/resume/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fileOrText }),
      });
      if (!res.ok) throw new Error('Resume parsing failed');
      return res.json();
    } else {
      const formData = new FormData();
      formData.append('resume', fileOrText);
      const res = await fetch(`${API_BASE}/resume/parse`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Resume parsing failed');
      return res.json();
    }
  },

  // Career Roadmap & Project Recommendations
  async getRoadmapRoles(): Promise<{ canonicalRoles: AvailableCareerRole[]; discoveredRoles: AvailableCareerRole[] }> {
    const res = await fetch(`${API_BASE}/roadmap/roles`);
    if (!res.ok) throw new Error('Failed to fetch career roles');
    return res.json();
  },

  async generateRoadmap(data: {
    assessmentId?: string;
    jobId?: string;
    targetRole?: string;
    targetCompany?: string;
    seniority?: string;
    weeklyHours?: number;
  }): Promise<StoredRoadmap> {
    const res = await fetch(`${API_BASE}/roadmap/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate career roadmap');
    }
    return res.json();
  },

  async getLatestRoadmap(assessmentId?: string, jobId?: string): Promise<StoredRoadmap> {
    const params = new URLSearchParams();
    if (assessmentId) params.append('assessmentId', assessmentId);
    if (jobId) params.append('jobId', jobId);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/roadmap/latest${query}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'No active roadmap found');
    }
    return res.json();
  },

  async getRoadmapById(id: string): Promise<StoredRoadmap> {
    const res = await fetch(`${API_BASE}/roadmap/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Failed to fetch roadmap');
    return res.json();
  },

  async updateRoadmapProgress(
    roadmapId: string,
    data: {
      projectId: string;
      milestoneId?: string;
      isCompleted?: boolean;
      projectStatus?: string;
    }
  ): Promise<StoredRoadmap> {
    const res = await fetch(`${API_BASE}/roadmap/${encodeURIComponent(roadmapId)}/progress`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update roadmap progress');
    }
    return res.json();
  },

  async reassessRoadmap(roadmapId: string): Promise<StoredRoadmap> {
    const res = await fetch(`${API_BASE}/roadmap/${encodeURIComponent(roadmapId)}/reassess`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to reassess roadmap');
    }
    return res.json();
  },
};

