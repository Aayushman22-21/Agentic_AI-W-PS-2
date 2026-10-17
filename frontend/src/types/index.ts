export type AssessmentStatus =
  | 'demonstrated'
  | 'partially_demonstrated'
  | 'not_demonstrated_in_scope'
  | 'needs_review';

export interface CodeEvidenceCitation {
  repository: string;
  commitSha: string;
  filePath: string;
  startLine: number;
  endLine: number;
  evidenceSnippet: string;
  explanation: string;
  isValidated: boolean;
  validationError?: string;
}

export interface AssessedSkillResult {
  skill: string;
  status: AssessmentStatus;
  explanation: string;
  evidence: CodeEvidenceCitation[];
  confidence: 'high' | 'medium' | 'low';
  limitations: string;
  recommendedNextStep: string;
  isExplicitRequirement: boolean;
}

export interface JobRequirementItem {
  skill: string;
  isExplicit: boolean;
  minimumLevel?: 'foundational' | 'competent' | 'advanced';
}

export interface DiscoveredJob {
  id: string;
  source: 'greenhouse' | 'lever' | 'manual';
  company: string;
  title: string;
  location: string;
  isRemote: boolean;
  url: string;
  updatedAt: string;
  rawDescription: string;
  requirements: JobRequirementItem[];
}

export interface GitHubUserProfile {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: string;
  description: string | null;
  html_url: string;
  default_branch: string;
  stars: number;
  forks: number;
  updated_at: string;
  languages: Record<string, number>;
  primary_language: string | null;
  topics: string[];
  is_fork: boolean;
}

export interface MatchScoreResult {
  overallDemonstratedPct: number;
  demonstratedCount: number;
  partiallyDemonstratedCount: number;
  notDemonstratedCount: number;
  needsReviewCount: number;
  totalRequirementsCount: number;
  demonstratedSkills: string[];
  partiallyDemonstratedSkills: string[];
  missingSkills: string[];
  needsReviewSkills: string[];
  portfolioBonusSkills: string[];
  resumeOverlapPct?: number;
  scoreExplanation: string;
  hiringDisclaimer: string;
}

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

export type PageView =
  | 'dashboard'
  | 'jobs'
  | 'job_details'
  | 'github_repos'
  | 'assessment'
  | 'roadmap'
  | 'evidence'
  | 'history'
  | 'event_status'
  | 'settings';

export type SeniorityLevel = 'entry' | 'mid' | 'senior';

export type ProjectDifficulty = 'foundational' | 'intermediate' | 'advanced';

export type ProjectProgressStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted_for_verification'
  | 'completed_and_verified';

export interface RoadmapPreferences {
  targetRole: string;
  targetCompany?: string;
  seniority: SeniorityLevel;
  weeklyHours?: number;
}

export interface RoadmapSkillGap {
  skill: string;
  category: string;
  requiredProficiency: 'foundational' | 'competent' | 'advanced';
  jobSource: string;
  jobSourceUrl?: string;
  supportingRequirementText: string;
  evidenceStatus: AssessmentStatus;
  evidenceCitations: CodeEvidenceCitation[];
  confidence: 'high' | 'medium' | 'low';
  assessmentReason: string;
  limitations?: string;
  isExplicitRequirement: boolean;
  priorityRank: number;
  priorityScore: number;
  priorityBreakdown: {
    jobRelevanceWeight: number;
    evidenceGapSeverity: number;
    prerequisiteValue: number;
    feasibilityBonus: number;
  };
  priorityExplanation: string;
  prerequisites: string[];
}

export interface ProjectMilestone {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  expectedEvidence: string;
  isCompleted: boolean;
  completedAt?: string;
}

export interface LearningResource {
  title: string;
  url: string;
  type: 'docs' | 'tutorial' | 'spec';
  description: string;
}

export interface RecommendedProject {
  id: string;
  title: string;
  track: string;
  difficulty: ProjectDifficulty;
  sequenceOrder: number;
  description: string;
  estimatedEffort: string;
  prerequisites: string[];
  skillsCovered: string[];
  targetSkillGaps: string[];
  roleFitExplanation: string;
  milestones: ProjectMilestone[];
  learningResources: LearningResource[];
  status: ProjectProgressStatus;
  submittedEvidenceUrl?: string;
  verifiedAt?: string;
}

export interface StoredRoadmap {
  id: string;
  assessmentId: string;
  jobId: string;
  jobTitle: string;
  jobCompany: string;
  jobSourceUrl?: string;
  repositoryId: number;
  repositoryFullName: string;
  commitSha: string;
  assessmentVersion: number;
  preferences: RoadmapPreferences;
  skillGaps: RoadmapSkillGap[];
  recommendedProjects: RecommendedProject[];
  overallProgressPct: number;
  reassessmentNote?: string;
  previousVersionId?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AvailableCareerRole {
  role: string;
  category: string;
  description: string;
  coreSkills: string[];
}

export type GitHubErrorType =
  | 'rate_limit_exceeded'

  | 'secondary_rate_limit'
  | 'permission_denied'
  | 'not_found'
  | 'bad_credentials'
  | 'network_error'
  | 'unknown';

export interface GitHubRateLimitInfo {
  limit: number;
  remaining: number;
  resetEpochSeconds: number;
  resetDate: string;
  retryAfterSeconds?: number;
  isAuthenticated: boolean;
}

export interface GitHubApiErrorDetail {
  error: string;
  errorType: GitHubErrorType;
  statusCode: number;
  rateLimit?: GitHubRateLimitInfo;
  retryAfterSeconds?: number;
  resetTime?: string;
  documentationUrl?: string;
  hint?: string;
}
