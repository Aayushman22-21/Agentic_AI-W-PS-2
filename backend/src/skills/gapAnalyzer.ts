/**
 * Skill Gap and Match Analysis Engine
 * Evaluates code-verified repository evidence against job requirements,
 * keeping unverified claims separate and providing objective scoring.
 */

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
  isExplicit: boolean; // explicitly listed vs inferred from description
  category?: string;
  minimumLevel?: 'foundational' | 'competent' | 'advanced';
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

/**
 * Calculates evidence-backed skill gap analysis.
 */
export function calculateSkillGap(
  jobRequirements: JobRequirementItem[],
  assessedSkills: AssessedSkillResult[],
  allPortfolioSkills: string[] = [],
  resumeSkills: string[] = []
): MatchScoreResult {
  const reqMap = new Map<string, JobRequirementItem>();
  for (const r of jobRequirements) {
    reqMap.set(r.skill.toLowerCase(), r);
  }

  const demonstratedSkills: string[] = [];
  const partiallyDemonstratedSkills: string[] = [];
  const missingSkills: string[] = [];
  const needsReviewSkills: string[] = [];

  const assessedMap = new Map<string, AssessedSkillResult>();
  for (const a of assessedSkills) {
    assessedMap.set(a.skill.toLowerCase(), a);
  }

  // Iterate over job requirements
  for (const [key, req] of reqMap.entries()) {
    const assessed = assessedMap.get(key);
    if (!assessed) {
      missingSkills.push(req.skill);
      continue;
    }

    switch (assessed.status) {
      case 'demonstrated':
        demonstratedSkills.push(req.skill);
        break;
      case 'partially_demonstrated':
        partiallyDemonstratedSkills.push(req.skill);
        break;
      case 'needs_review':
        needsReviewSkills.push(req.skill);
        break;
      case 'not_demonstrated_in_scope':
      default:
        missingSkills.push(req.skill);
        break;
    }
  }

  // Detect portfolio skills present in repository evidence but not in job requirements
  const portfolioBonusSkills: string[] = [];
  for (const p of allPortfolioSkills) {
    if (!reqMap.has(p.toLowerCase())) {
      portfolioBonusSkills.push(p);
    }
  }

  const total = jobRequirements.length;
  // Weighted score: 1.0 for demonstrated, 0.5 for partially demonstrated
  const weightedSum = demonstratedSkills.length * 1.0 + partiallyDemonstratedSkills.length * 0.5;
  const overallDemonstratedPct = total > 0 ? Math.round((weightedSum / total) * 100) : 0;

  // Resume overlap calculation (if resume claims provided)
  let resumeOverlapPct: number | undefined;
  if (resumeSkills.length > 0 && total > 0) {
    const resumeSet = new Set(resumeSkills.map((s) => s.toLowerCase()));
    let overlap = 0;
    for (const [key] of reqMap.entries()) {
      if (resumeSet.has(key)) {
        overlap++;
      }
    }
    resumeOverlapPct = Math.round((overlap / total) * 100);
  }

  const scoreExplanation =
    `Demonstrated Match Score of ${overallDemonstratedPct}% reflects code-verified implementations found in inspected repositories: ` +
    `${demonstratedSkills.length} fully demonstrated (100% weight), ${partiallyDemonstratedSkills.length} partially demonstrated (50% weight), ` +
    `${missingSkills.length} missing in inspected scope, and ${needsReviewSkills.length} requiring manual review across ${total} total requirements.`;

  const hiringDisclaimer =
    'This score measures portfolio code evidence coverage against extracted technical job requirements. ' +
    'It does NOT predict or guarantee interview invitations, hiring probability, or cultural/system fit.';

  return {
    overallDemonstratedPct,
    demonstratedCount: demonstratedSkills.length,
    partiallyDemonstratedCount: partiallyDemonstratedSkills.length,
    notDemonstratedCount: missingSkills.length,
    needsReviewCount: needsReviewSkills.length,
    totalRequirementsCount: total,
    demonstratedSkills,
    partiallyDemonstratedSkills,
    missingSkills,
    needsReviewSkills,
    portfolioBonusSkills,
    resumeOverlapPct,
    scoreExplanation,
    hiringDisclaimer,
  };
}
