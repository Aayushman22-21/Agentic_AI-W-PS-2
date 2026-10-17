/**
 * GitHub Webhook Handler & Event-Driven Reassessment Pipeline
 * Verifies HMAC SHA-256 signature, deduplicates deliveries, queues
 * background processing, handles README-only changes, and saves versioned assessments.
 */

import crypto from 'crypto';
import { StorageService, WebhookDeliveryRecord } from '../db/storage.js';
import { GitHubService } from '../github/githubService.js';
import { analyzeRepositoryCode, isDocumentationOrMetaFile } from '../analyzer/codeEvidenceEngine.js';
import { calculateSkillGap } from '../skills/gapAnalyzer.js';
import { analyzeAndPrioritizeSkillGaps } from '../roadmap/roadmapEngine.js';

export interface WebhookVerificationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Verifies the GitHub HMAC SHA-256 signature (X-Hub-Signature-256).
 */
export function verifyGitHubSignature(
  payloadRaw: string | Buffer,
  signatureHeader: string | undefined,
  secret: string
): WebhookVerificationResult {
  if (!secret) {
    // If no secret configured, fail closed
    return { isValid: false, error: 'Webhook secret is not configured on server.' };
  }

  if (!signatureHeader) {
    return { isValid: false, error: 'Missing X-Hub-Signature-256 header.' };
  }

  const parts = signatureHeader.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') {
    return { isValid: false, error: 'Malformed signature format. Expected sha256=...' };
  }

  const expectedHash = parts[1];
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadRaw);
  const calculatedHash = hmac.digest('hex');

  const expectedBuffer = Buffer.from(expectedHash, 'hex');
  const calculatedBuffer = Buffer.from(calculatedHash, 'hex');

  if (expectedBuffer.length !== calculatedBuffer.length) {
    return { isValid: false, error: 'Signature length mismatch.' };
  }

  const isMatch = crypto.timingSafeEqual(expectedBuffer, calculatedBuffer);
  return {
    isValid: isMatch,
    error: isMatch ? undefined : 'HMAC signature verification failed.',
  };
}

export class WebhookProcessor {
  private storage: StorageService;
  private github: GitHubService;

  constructor(storage: StorageService, github: GitHubService) {
    this.storage = storage;
    this.github = github;
  }

  /**
   * Handle incoming GitHub webhook event with deduplication and verification
   */
  async handleWebhook(params: {
    deliveryId: string;
    eventType: string;
    signatureHeader?: string;
    rawBody: Buffer | string;
    parsedPayload: any;
    secret: string;
  }): Promise<{ status: string; message: string; deliveryId: string }> {
    const { deliveryId, eventType, signatureHeader, rawBody, parsedPayload, secret } = params;

    // 1. Check idempotency / deduplication
    const existing = this.storage.getWebhookDelivery(deliveryId);
    if (existing) {
      return {
        status: 'deduplicated',
        message: `Delivery ${deliveryId} already received and recorded.`,
        deliveryId,
      };
    }

    // 2. Verify signature
    const sigCheck = verifyGitHubSignature(rawBody, signatureHeader, secret);
    if (!sigCheck.isValid) {
      // Record failed delivery for audit
      this.storage.saveWebhookDelivery({
        deliveryId,
        eventType,
        signatureValid: false,
        repositoryFullName: parsedPayload?.repository?.full_name || '',
        beforeSha: parsedPayload?.before || '',
        afterSha: parsedPayload?.after || '',
        filesChanged: [],
        isReadmeOnly: false,
        status: 'failed',
        errorMessage: sigCheck.error,
        createdAt: new Date().toISOString(),
      });
      throw new Error(`Invalid signature: ${sigCheck.error}`);
    }

    // 3. Extract commit and file changes
    const repoFullName = parsedPayload?.repository?.full_name || '';
    const beforeSha = parsedPayload?.before || '';
    const afterSha = parsedPayload?.after || '';

    // Collect all files modified/added in push commits
    const filesChangedSet = new Set<string>();
    if (Array.isArray(parsedPayload?.commits)) {
      for (const c of parsedPayload.commits) {
        (c.added || []).forEach((f: string) => filesChangedSet.add(f));
        (c.modified || []).forEach((f: string) => filesChangedSet.add(f));
        (c.removed || []).forEach((f: string) => filesChangedSet.add(f));
      }
    }
    const filesChanged = Array.from(filesChangedSet);

    // 4. Check if change is README-only / documentation-only
    const isReadmeOnly =
      filesChanged.length > 0 &&
      filesChanged.every((file) => isDocumentationOrMetaFile(file));

    const deliveryRecord: WebhookDeliveryRecord = {
      deliveryId,
      eventType,
      signatureValid: true,
      repositoryFullName: repoFullName,
      beforeSha,
      afterSha,
      filesChanged,
      isReadmeOnly,
      status: isReadmeOnly ? 'ignored_readme_only' : 'received',
      createdAt: new Date().toISOString(),
    };

    this.storage.saveWebhookDelivery(deliveryRecord);

    if (eventType !== 'push') {
      return {
        status: 'ignored',
        message: `Event '${eventType}' acknowledged but only 'push' triggers reassessments.`,
        deliveryId,
      };
    }

    // 5. Enqueue background reassessment job
    const job = this.storage.createBackgroundJob('reassess_repository', {
      deliveryId,
      repositoryFullName: repoFullName,
      beforeSha,
      afterSha,
      filesChanged,
      isReadmeOnly,
    });

    // Execute job processing asynchronously
    this.processBackgroundJob(job.id).catch((err) => {
      console.error(`Background reassessment error on job ${job.id}:`, err);
    });

    return {
      status: 'enqueued',
      message: isReadmeOnly
        ? 'Push received: README-only changes detected. Non-code updates will not alter technical skill assessments.'
        : 'Push received and verified. Background reassessment queued.',
      deliveryId,
    };
  }

  /**
   * Background Worker: Process reassessment job with retries
   */
  async processBackgroundJob(jobId: string): Promise<void> {
    const job = this.storage.listBackgroundJobs().find((j) => j.id === jobId);
    if (!job || job.status === 'completed') return;

    this.storage.updateBackgroundJob(jobId, {
      status: 'processing',
      attempts: job.attempts + 1,
    });

    try {
      const { repositoryFullName, afterSha, isReadmeOnly } = job.payload;

      // Find the repository in storage
      const repo = this.storage.getRepositoryByFullName(repositoryFullName);
      if (!repo) {
        throw new Error(`Repository '${repositoryFullName}' is not registered in active assessments.`);
      }

      // Find all existing assessments for this repository across jobs
      const allAssessments = this.storage.getAllAssessments();
      const targetAssessments = allAssessments.filter((a) => a.repositoryId === repo.id);

      if (targetAssessments.length === 0) {
        this.storage.updateBackgroundJob(jobId, {
          status: 'completed',
          lastError: 'No active assessments registered for this repository yet.',
        });
        return;
      }

      // Group by jobId to reassess latest version of each job
      const jobIds = Array.from(new Set(targetAssessments.map((a) => a.jobId)));

      for (const targetJobId of jobIds) {
        const jobRecord = this.storage.getJob(targetJobId);
        const latestAssessment = this.storage.getLatestAssessment(targetJobId, repo.id);

        if (!jobRecord || !latestAssessment) continue;

        if (isReadmeOnly) {
          // README-only: Create a new version preserving previous assessment scores
          // and adding explicit audit note that docs-only changes do not grant technical skills.
          this.storage.saveAssessment({
            jobId: targetJobId,
            repositoryId: repo.id,
            repositoryFullName: repo.full_name,
            commitSha: afterSha,
            matchScore: {
              ...latestAssessment.matchScore,
              scoreExplanation: `${latestAssessment.matchScore.scoreExplanation} (Unchanged: Commit ${afterSha.substring(0, 7)} contained only documentation/README modifications).`,
            },
            assessedSkills: latestAssessment.assessedSkills,
          });
          continue;
        }

        // Fetch tree and changed files for real code reassessment
        let sourceFiles: Array<{ path: string; content: string }> = [];
        try {
          const tree = await this.github.getRepositoryTree(repo.owner, repo.name, afterSha);
          // Pick up to 15 relevant source files
          const codeEntries = tree
            .filter((t) => t.type === 'blob' && !isDocumentationOrMetaFile(t.path))
            .slice(0, 15);

          for (const entry of codeEntries) {
            try {
              const content = await this.github.getFileContent(repo.owner, repo.name, entry.path, afterSha);
              sourceFiles.push({ path: entry.path, content });
            } catch {
              // Ignore single file fetch error
            }
          }
        } catch (fetchErr) {
          console.warn('Could not fetch remote files for webhook commit. Using previous evidence base.');
        }

        if (sourceFiles.length === 0) {
          // If remote files couldn't be retrieved, fail job with retry or complete
          this.storage.updateBackgroundJob(jobId, {
            status: 'completed',
            lastError: 'No code files available at commit SHA.',
          });
          return;
        }

        // Reassess code against job requirements
        const newAssessed = analyzeRepositoryCode({
          repository: repo.full_name,
          commitSha: afterSha,
          files: sourceFiles,
          requirements: jobRecord.requirements,
        });

        const newMatchScore = calculateSkillGap(
          jobRecord.requirements,
          newAssessed,
          repo.topics
        );

        // Save new version
        const newAsmt = this.storage.saveAssessment({
          jobId: targetJobId,
          repositoryId: repo.id,
          repositoryFullName: repo.full_name,
          commitSha: afterSha,
          matchScore: newMatchScore,
          assessedSkills: newAssessed,
        });

        // Automatically update any active roadmap linked to this job & repository
        const existingRoadmap = this.storage.getLatestRoadmap(undefined, targetJobId);
        if (existingRoadmap && existingRoadmap.repositoryId === repo.id) {
          const updatedGaps = analyzeAndPrioritizeSkillGaps(
            jobRecord,
            newAssessed,
            existingRoadmap.preferences.targetRole
          );

          this.storage.saveRoadmap({
            ...existingRoadmap,
            id: `rdm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            assessmentId: newAsmt.id,
            commitSha: afterSha,
            assessmentVersion: newAsmt.version,
            skillGaps: updatedGaps,
            version: existingRoadmap.version + 1,
            previousVersionId: existingRoadmap.id,
            reassessmentNote: `Automated webhook reassessment against commit ${afterSha.substring(0, 7)} (v${newAsmt.version}): skills and roadmap updated.`,
            updatedAt: new Date().toISOString(),
          });
        }
      }


      this.storage.updateBackgroundJob(jobId, {
        status: 'completed',
      });
    } catch (err: any) {
      const isMax = job.attempts + 1 >= job.maxAttempts;
      this.storage.updateBackgroundJob(jobId, {
        status: isMax ? 'failed' : 'pending',
        lastError: err.message,
      });
      throw err;
    }
  }

  /**
   * Scheduled Polling Fallback
   * Checks for remote commits and triggers reassessment if new commit is detected.
   */
  async pollRepositoryForChanges(owner: string, repo: string): Promise<boolean> {
    const repository = this.storage.getRepositoryByFullName(`${owner}/${repo}`);
    if (!repository) return false;

    const latestRemote = await this.github.getLatestCommit(owner, repo);
    const existingCommit = this.storage.getCommit(latestRemote.sha);

    if (!existingCommit) {
      // New commit found via polling! Save commit and trigger reassessment
      this.storage.saveCommit(repository.id, latestRemote);

      const job = this.storage.createBackgroundJob('reassess_repository', {
        deliveryId: `poll_${Date.now()}`,
        repositoryFullName: repository.full_name,
        beforeSha: '',
        afterSha: latestRemote.sha,
        filesChanged: [],
        isReadmeOnly: false,
      });

      await this.processBackgroundJob(job.id);
      return true;
    }

    return false;
  }
}
