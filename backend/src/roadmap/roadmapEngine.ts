/**
 * Career Roadmap & Project Recommendation Engine
 * Provides transparent, evidence-based skill gap prioritization,
 * pedagogical project sequencing (Foundational -> Intermediate -> Advanced),
 * and milestone-backed progress tracking.
 */

import { DiscoveredJob } from '../jobs/jobDiscoveryService.js';
import { AssessedSkillResult, AssessmentStatus } from '../skills/gapAnalyzer.js';
import { SKILL_TAXONOMY, getSkillInfo } from '../skills/taxonomy.js';
import { PROJECT_CATALOGUE, CatalogueProjectTemplate } from './projectCatalogue.js';
import {
  RoadmapPreferences,
  RoadmapSkillGap,
  RecommendedProject,
  StoredRoadmap,
} from './roadmapTypes.js';

// Pre-defined canonical engineering career tracks
export interface AvailableCareerRole {
  role: string;
  category: 'backend' | 'frontend' | 'fullstack' | 'ai_ml' | 'devops' | 'data';
  description: string;
  coreSkills: string[];
}

export const CANONICAL_CAREER_ROLES: AvailableCareerRole[] = [
  {
    role: 'Backend Engineer',
    category: 'backend',
    description: 'Specializes in server architectures, relational databases, REST APIs, microservices, and system scalability.',
    coreSkills: ['Node.js', 'Express.js', 'PostgreSQL', 'TypeScript', 'REST API', 'Docker'],
  },
  {
    role: 'Full-Stack Developer',
    category: 'fullstack',
    description: 'Bridges responsive clientside React interfaces with typed serverside APIs, databases, and deployment pipelines.',
    coreSkills: ['React', 'TypeScript', 'Node.js', 'Express.js', 'PostgreSQL', 'REST API', 'Tailwind CSS'],
  },
  {
    role: 'AI / Machine Learning Engineer',
    category: 'ai_ml',
    description: 'Builds machine learning pipelines, embedding models, RAG vector search, and production inference microservices.',
    coreSkills: ['Python', 'FastAPI', 'Machine Learning', 'LLM & Generative AI', 'Docker'],
  },
  {
    role: 'Data Analyst / Engineer',
    category: 'data',
    description: 'Designs ETL extraction pipelines, data modeling, SQL queries, and automated analytical reporting dashboards.',
    coreSkills: ['Python', 'PostgreSQL', 'Unit Testing', 'CI/CD'],
  },
  {
    role: 'DevOps / Cloud Platform Engineer',
    category: 'devops',
    description: 'Automates cloud infrastructure, multi-stage container orchestration, and continuous integration/deployment.',
    coreSkills: ['Docker', 'AWS', 'CI/CD', 'Unit Testing'],
  },
];

// Prerequisite map for foundational skills
const CORE_PREREQUISITE_MAP: Record<string, string[]> = {
  'TypeScript': ['JavaScript'],
  'Express.js': ['Node.js', 'JavaScript'],
  'React': ['JavaScript'],
  'FastAPI': ['Python', 'REST API'],
  'Docker': ['Linux', 'Git'],
  'CI/CD': ['Git', 'Unit Testing'],
  'PostgreSQL': ['SQL'],
  'LLM & Generative AI': ['Python', 'Machine Learning'],
};

/**
 * Normalizes and prioritizes skill gaps using a transparent, explainable scoring model.
 */
export function analyzeAndPrioritizeSkillGaps(
  job: DiscoveredJob,
  assessedSkills: AssessedSkillResult[],
  targetRole?: string
): RoadmapSkillGap[] {
  const assessedMap = new Map<string, AssessedSkillResult>();
  for (const a of assessedSkills) {
    assessedMap.set(a.skill.toLowerCase(), a);
  }

  const gaps: RoadmapSkillGap[] = [];

  // Evaluate each job requirement
  for (const req of job.requirements) {
    const assessed = assessedMap.get(req.skill.toLowerCase());
    const evidenceStatus: AssessmentStatus = assessed
      ? assessed.status
      : 'not_demonstrated_in_scope';

    const taxonomyInfo = getSkillInfo(req.skill);
    const category = taxonomyInfo?.category || 'general';

    // 1. Job Relevance Weight (0 - 40 pts)
    const jobRelevanceWeight = req.isExplicit ? 40 : 25;

    // 2. Evidence Gap Severity (0 - 35 pts)
    let evidenceGapSeverity = 0;
    if (evidenceStatus === 'not_demonstrated_in_scope') {
      evidenceGapSeverity = 35; // Maximum gap urgency
    } else if (evidenceStatus === 'partially_demonstrated') {
      evidenceGapSeverity = 20; // Partial evidence exists, needs production-depth
    } else if (evidenceStatus === 'needs_review') {
      evidenceGapSeverity = 10;
    } else {
      evidenceGapSeverity = 0; // Already demonstrated
    }

    // 3. Prerequisite & Core Value (0 - 15 pts)
    const isCoreFoundational = [
      'Node.js',
      'Python',
      'TypeScript',
      'PostgreSQL',
      'REST API',
      'Docker',
      'React',
    ].includes(req.skill);
    const prerequisiteValue = isCoreFoundational ? 15 : 5;

    // 4. Actionable Project Feasibility Bonus (0 - 10 pts)
    const hasProjectCoverage = PROJECT_CATALOGUE.some((p) =>
      p.skillsCovered.map((s) => s.toLowerCase()).includes(req.skill.toLowerCase())
    );
    const feasibilityBonus = hasProjectCoverage ? 10 : 5;

    const priorityScore =
      jobRelevanceWeight + evidenceGapSeverity + prerequisiteValue + feasibilityBonus;

    // Build transparent explanation
    let statusText = '';
    if (evidenceStatus === 'not_demonstrated_in_scope') {
      statusText = 'No verifiable code evidence found in analysed scope (note: this does NOT imply lack of ability).';
    } else if (evidenceStatus === 'partially_demonstrated') {
      statusText = 'Foundational syntax/imports found, but full production business logic is not yet demonstrated.';
    } else if (evidenceStatus === 'needs_review') {
      statusText = 'Implementation identified requires human/manual code review.';
    } else {
      statusText = 'Skill is code-verified with authentic citations.';
    }

    const priorityExplanation =
      `${req.isExplicit ? 'Explicit requirement' : 'Inferred requirement'} for ${job.title} (${jobRelevanceWeight}/40 pts) + ` +
      `Evidence status '${evidenceStatus}' (${evidenceGapSeverity}/35 pts) + ` +
      `Prerequisite index (${prerequisiteValue}/15 pts) + ` +
      `Project coverage (${feasibilityBonus}/10 pts) = Total Priority ${priorityScore}/100.`;

    let assessmentReason = assessed?.explanation || statusText;
    if (evidenceStatus === 'not_demonstrated_in_scope' && !assessmentReason.includes('does NOT imply lack of ability')) {
      assessmentReason = `${assessmentReason} (Note: Missing code evidence in the analysed scope does NOT imply lack of ability or knowledge).`;
    }

    const prerequisites = CORE_PREREQUISITE_MAP[req.skill] || [];

    gaps.push({
      skill: req.skill,
      category,
      requiredProficiency: req.minimumLevel || 'competent',
      jobSource: `${job.company} (${job.source})`,
      jobSourceUrl: job.url || undefined,
      supportingRequirementText: req.isExplicit
        ? `Explicitly listed in requirements for ${job.title} at ${job.company}`
        : `Inferred technical requirement based on ${job.title} role description`,
      evidenceStatus,
      evidenceCitations: assessed?.evidence || [],
      confidence: assessed?.confidence || 'medium',
      assessmentReason,
      limitations: assessed?.limitations,
      isExplicitRequirement: req.isExplicit,
      priorityRank: 0, // Assigned after sorting
      priorityScore,
      priorityBreakdown: {
        jobRelevanceWeight,
        evidenceGapSeverity,
        prerequisiteValue,
        feasibilityBonus,
      },
      priorityExplanation,
      prerequisites,
    });
  }

  // Sort descending by priorityScore
  gaps.sort((a, b) => b.priorityScore - a.priorityScore);

  // Assign 1-indexed ranks
  gaps.forEach((g, idx) => {
    g.priorityRank = idx + 1;
  });

  return gaps;
}

/**
 * Recommends an ordered sequence of practical projects addressing verified skill gaps.
 * Sequences projects from Foundational -> Intermediate -> Advanced.
 */
export function recommendProjectsForRoadmap(
  targetRole: string,
  gaps: RoadmapSkillGap[],
  seniority: 'entry' | 'mid' | 'senior' = 'mid'
): RecommendedProject[] {
  // Identify missing and partially demonstrated skill names
  const missingOrPartialSkills = gaps
    .filter((g) => g.evidenceStatus !== 'demonstrated')
    .map((g) => g.skill.toLowerCase());

  // Determine appropriate track based on target role
  const roleLower = targetRole.toLowerCase();
  let preferredTrack: 'backend' | 'fullstack' | 'ai_ml' | 'data' | 'devops' = 'backend';

  if (roleLower.includes('full') || roleLower.includes('frontend') || roleLower.includes('web')) {
    preferredTrack = 'fullstack';
  } else if (roleLower.includes('ai') || roleLower.includes('machine learning') || roleLower.includes('ml')) {
    preferredTrack = 'ai_ml';
  } else if (roleLower.includes('data') || roleLower.includes('analytics')) {
    preferredTrack = 'data';
  } else if (roleLower.includes('devops') || roleLower.includes('cloud') || roleLower.includes('infrastructure')) {
    preferredTrack = 'devops';
  } else {
    preferredTrack = 'backend';
  }

  // Score candidate projects
  const scoredCandidates: Array<{
    template: CatalogueProjectTemplate;
    matchedSkills: string[];
    score: number;
  }> = [];

  for (const template of PROJECT_CATALOGUE) {
    const templateSkills = template.skillsCovered.map((s) => s.toLowerCase());

    // Check which user gaps this project addresses
    const matchedSkills = gaps
      .filter(
        (g) =>
          templateSkills.includes(g.skill.toLowerCase()) &&
          g.evidenceStatus !== 'demonstrated'
      )
      .map((g) => g.skill);

    // Track affinity bonus
    const trackBonus = template.track === preferredTrack ? 40 : 15;

    // Score based on matched high-priority skills
    let gapScore = 0;
    for (const g of gaps) {
      if (templateSkills.includes(g.skill.toLowerCase()) && g.evidenceStatus !== 'demonstrated') {
        gapScore += g.priorityScore;
      }
    }

    const totalScore = trackBonus + gapScore;

    scoredCandidates.push({
      template,
      matchedSkills,
      score: totalScore,
    });
  }

  // Separate by difficulty
  const foundationalCandidates = scoredCandidates
    .filter((c) => c.template.difficulty === 'foundational')
    .sort((a, b) => b.score - a.score);

  const intermediateCandidates = scoredCandidates
    .filter((c) => c.template.difficulty === 'intermediate')
    .sort((a, b) => b.score - a.score);

  const advancedCandidates = scoredCandidates
    .filter((c) => c.template.difficulty === 'advanced')
    .sort((a, b) => b.score - a.score);

  // Pick progression: 1 Foundational, 1 Intermediate, 1 Advanced (or top 3 relevant)
  const selectedTemplates: CatalogueProjectTemplate[] = [];

  if (foundationalCandidates.length > 0) {
    selectedTemplates.push(foundationalCandidates[0].template);
  }

  if (intermediateCandidates.length > 0) {
    selectedTemplates.push(intermediateCandidates[0].template);
  }

  if (advancedCandidates.length > 0 && seniority !== 'entry') {
    selectedTemplates.push(advancedCandidates[0].template);
  } else if (seniority === 'entry' && foundationalCandidates.length > 1) {
    // For entry level, pick a complementary foundational/intermediate project
    selectedTemplates.push(foundationalCandidates[1].template);
  } else if (advancedCandidates.length > 0) {
    selectedTemplates.push(advancedCandidates[0].template);
  }

  // Fallback if none picked (guarantee at least 2 projects from preferred track)
  if (selectedTemplates.length === 0) {
    const trackProjects = PROJECT_CATALOGUE.filter((p) => p.track === preferredTrack);
    selectedTemplates.push(...trackProjects.slice(0, 3));
  }

  // Convert to RecommendedProject models
  const recommended: RecommendedProject[] = selectedTemplates.map((tmpl, idx) => {
    const tmplSkillsLower = tmpl.skillsCovered.map((s) => s.toLowerCase());

    const targetGaps = gaps
      .filter((g) => tmplSkillsLower.includes(g.skill.toLowerCase()))
      .map((g) => g.skill);

    const roleFit = tmpl.roleFitExplanationTemplate.replace(
      'Backend and Full-Stack roles',
      `${targetRole} role`
    );

    return {
      id: `proj_${tmpl.id}_${Date.now()}_${idx}`,
      title: tmpl.title,
      track: tmpl.track,
      difficulty: tmpl.difficulty,
      sequenceOrder: idx + 1,
      description: tmpl.description,
      estimatedEffort: tmpl.estimatedEffort,
      prerequisites: tmpl.prerequisites,
      skillsCovered: tmpl.skillsCovered,
      targetSkillGaps: targetGaps.length > 0 ? targetGaps : tmpl.skillsCovered.slice(0, 3),
      roleFitExplanation: roleFit,
      milestones: tmpl.milestones.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        acceptanceCriteria: m.acceptanceCriteria,
        expectedEvidence: m.expectedEvidence,
        isCompleted: false,
      })),
      learningResources: tmpl.learningResources,
      status: 'not_started',
    };
  });

  return recommended;
}

/**
 * Calculates verified progress strictly from completed milestones.
 * Never invents proficiency scores out of thin air.
 */
export function calculateRoadmapProgress(projects: RecommendedProject[]): number {
  let totalMilestones = 0;
  let completedMilestones = 0;

  for (const project of projects) {
    for (const milestone of project.milestones) {
      totalMilestones += 1;
      if (milestone.isCompleted) {
        completedMilestones += 1;
      }
    }
  }

  if (totalMilestones === 0) return 0;
  return Math.round((completedMilestones / totalMilestones) * 100);
}
