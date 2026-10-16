import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { verifyGitHubSignature, WebhookProcessor } from '../src/webhooks/webhookHandler.js';
import { StorageService } from '../src/db/storage.js';
import { GitHubService } from '../src/github/githubService.js';

describe('Webhook HMAC Verification & Deduplication', () => {
  const secret = 'super-secret-key-123';
  const payload = JSON.stringify({
    repository: { full_name: 'student/portfolio-app' },
    before: '0000000000000000000000000000000000000000',
    after: '1111111111111111111111111111111111111111',
    commits: [{ message: 'Initial commit' }],
  });

  it('validates a valid HMAC SHA-256 signature', () => {
    const hash = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const header = `sha256=${hash}`;

    const check = verifyGitHubSignature(payload, header, secret);
    expect(check.isValid).toBe(true);
    expect(check.error).toBeUndefined();
  });

  it('rejects an invalid or tampered signature', () => {
    const header = `sha256=abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789`;
    const check = verifyGitHubSignature(payload, header, secret);
    expect(check.isValid).toBe(false);
    expect(check.error).toContain('failed');
  });

  it('rejects missing signature or missing secret', () => {
    expect(verifyGitHubSignature(payload, undefined, secret).isValid).toBe(false);
    expect(verifyGitHubSignature(payload, 'sha256=123', '').isValid).toBe(false);
  });
});

describe('Webhook Pipeline, Versioning, and README-Only Protection', () => {
  let tempStoragePath: string;
  let storage: StorageService;
  let processor: WebhookProcessor;
  const secret = 'test-secret';

  beforeEach(() => {
    tempStoragePath = path.resolve(process.cwd(), `temp_test_storage_${Date.now()}.json`);
    storage = new StorageService(tempStoragePath);
    const mockGithub = new GitHubService();
    processor = new WebhookProcessor(storage, mockGithub);
  });

  it('deduplicates duplicate delivery IDs idempotently', async () => {
    const deliveryId = 'del_unique_12345';
    const payload = {
      repository: { full_name: 'student/web-project' },
      before: 'aaa',
      after: 'bbb',
      commits: [{ added: ['src/app.ts'] }],
    };
    const rawBody = JSON.stringify(payload);
    const hash = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const signatureHeader = `sha256=${hash}`;

    // First delivery
    const res1 = await processor.handleWebhook({
      deliveryId,
      eventType: 'push',
      signatureHeader,
      rawBody,
      parsedPayload: payload,
      secret,
    });
    expect(res1.status).toBe('enqueued');

    // Duplicate delivery
    const res2 = await processor.handleWebhook({
      deliveryId,
      eventType: 'push',
      signatureHeader,
      rawBody,
      parsedPayload: payload,
      secret,
    });
    expect(res2.status).toBe('deduplicated');
    expect(res2.message).toContain('already received');

    // Clean up
    if (fs.existsSync(tempStoragePath)) fs.unlinkSync(tempStoragePath);
  });

  it('preserves historical versions and does not falsely claim skills on README-only commits', async () => {
    // 1. Seed a job and repository
    const jobId = 'job_test_1';
    storage.saveJob({
      id: jobId,
      source: 'manual',
      company: 'Test Co',
      title: 'Backend Engineer',
      location: 'Remote',
      isRemote: true,
      url: '',
      updatedAt: new Date().toISOString(),
      rawDescription: 'Requires TypeScript and PostgreSQL',
      requirements: [
        { skill: 'TypeScript', isExplicit: true },
        { skill: 'PostgreSQL', isExplicit: true },
      ],
    });

    const repo = {
      id: 999,
      name: 'test-backend',
      full_name: 'testuser/test-backend',
      owner: 'testuser',
      description: 'Backend API',
      html_url: 'https://github.com/testuser/test-backend',
      default_branch: 'main',
      stars: 5,
      forks: 1,
      updated_at: new Date().toISOString(),
      languages: { TypeScript: 1000 },
      primary_language: 'TypeScript',
      topics: ['typescript', 'api'],
      is_fork: false,
    };
    storage.saveRepository(repo);

    // Initial assessment version 1 (at commit sha_1)
    storage.saveAssessment({
      jobId,
      repositoryId: repo.id,
      repositoryFullName: repo.full_name,
      commitSha: 'sha_111111111111111111111111111111111111111',
      matchScore: {
        overallDemonstratedPct: 50,
        demonstratedCount: 1,
        partiallyDemonstratedCount: 0,
        notDemonstratedCount: 1,
        needsReviewCount: 0,
        totalRequirementsCount: 2,
        demonstratedSkills: ['TypeScript'],
        partiallyDemonstratedSkills: [],
        missingSkills: ['PostgreSQL'],
        needsReviewSkills: [],
        portfolioBonusSkills: [],
        scoreExplanation: '1 of 2 skills demonstrated',
        hiringDisclaimer: 'Not a hiring guarantee',
      },
      assessedSkills: [
        {
          skill: 'TypeScript',
          status: 'demonstrated',
          explanation: 'Found in src/index.ts',
          evidence: [],
          confidence: 'high',
          limitations: '',
          recommendedNextStep: '',
          isExplicitRequirement: true,
        },
        {
          skill: 'PostgreSQL',
          status: 'not_demonstrated_in_scope',
          explanation: 'No DB code found',
          evidence: [],
          confidence: 'high',
          limitations: '',
          recommendedNextStep: 'Add SQL code',
          isExplicitRequirement: true,
        },
      ],
    });

    const v1 = storage.getLatestAssessment(jobId, repo.id);
    expect(v1?.version).toBe(1);

    // Now simulate push webhook containing ONLY README.md changes
    const readmePayload = {
      repository: { full_name: 'testuser/test-backend' },
      before: 'sha_111111111111111111111111111111111111111',
      after: 'sha_222222222222222222222222222222222222222',
      commits: [
        {
          message: 'Update README with skills: PostgreSQL, Kubernetes, Docker',
          modified: ['README.md'],
        },
      ],
    };

    const rawBody = JSON.stringify(readmePayload);
    const hash = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    const webhookRes = await processor.handleWebhook({
      deliveryId: 'del_readme_test',
      eventType: 'push',
      signatureHeader: `sha256=${hash}`,
      rawBody,
      parsedPayload: readmePayload,
      secret,
    });

    expect(webhookRes.message).toContain('README-only');

    // Wait or let background job process
    const jobs = storage.listBackgroundJobs();
    expect(jobs.length).toBeGreaterThan(0);
    await processor.processBackgroundJob(jobs[0].id);

    // Verify version 2 was created preserving history
    const history = storage.getAssessmentHistory(jobId, repo.id);
    expect(history.length).toBe(2);
    expect(history[0].version).toBe(2);
    expect(history[1].version).toBe(1);

    // Verify PostgreSQL is STILL not demonstrated (README change did NOT falsely award it!)
    const v2 = storage.getLatestAssessment(jobId, repo.id);
    expect(v2?.matchScore.overallDemonstratedPct).toBe(50);
    expect(v2?.matchScore.missingSkills).toContain('PostgreSQL');
    expect(v2?.matchScore.scoreExplanation).toContain('Unchanged: Commit sha_222 contained only documentation/README modifications');

    // Clean up
    if (fs.existsSync(tempStoragePath)) fs.unlinkSync(tempStoragePath);
  });
});
