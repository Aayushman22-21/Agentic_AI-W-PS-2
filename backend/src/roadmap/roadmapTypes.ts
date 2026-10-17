/**
 * Career Roadmap & Project Recommendation Domain Types
 */

import { AssessmentStatus, CodeEvidenceCitation } from '../skills/gapAnalyzer.js';

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
  priorityRank: number; // 1 (highest) to N
  priorityScore: number; // 0 to 100
  priorityBreakdown: {
    jobRelevanceWeight: number; // 0 - 40 pts
    evidenceGapSeverity: number; // 0 - 35 pts
    prerequisiteValue: number; // 0 - 15 pts
    feasibilityBonus: number; // 0 - 10 pts
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
  sequenceOrder: number; // 1, 2, 3...
  description: string;
  estimatedEffort: string;
  prerequisites: string[];
  skillsCovered: string[];
  targetSkillGaps: string[]; // Specific gaps from the assessment this project addresses
  roleFitExplanation: string; // Explains why this project matches the target role
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
  overallProgressPct: number; // Strictly computed as (completedMilestones / totalMilestones) * 100
  reassessmentNote?: string;
  previousVersionId?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}
