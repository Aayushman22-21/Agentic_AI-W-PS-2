import { describe, it, expect } from 'vitest';
import { normalizeSkill, extractSkillsFromText } from '../src/skills/taxonomy.js';
import { calculateSkillGap, AssessedSkillResult } from '../src/skills/gapAnalyzer.js';

describe('Skill Taxonomy & Normalization', () => {
  it('normalizes common variations and abbreviations to canonical names', () => {
    expect(normalizeSkill('js')).toBe('JavaScript');
    expect(normalizeSkill('ts')).toBe('TypeScript');
    expect(normalizeSkill('py')).toBe('Python');
    expect(normalizeSkill('golang')).toBe('Go');
    expect(normalizeSkill('postgres')).toBe('PostgreSQL');
    expect(normalizeSkill('k8s')).toBe('Kubernetes');
    expect(normalizeSkill('reactjs')).toBe('React');
    expect(normalizeSkill('nodejs')).toBe('Node.js');
    expect(normalizeSkill('csharp')).toBe('C#');
  });

  it('avoids duplicate skills caused by capitalization or whitespace', () => {
    expect(normalizeSkill('  JAVASCRIPT  ')).toBe('JavaScript');
    expect(normalizeSkill('pYtHoN')).toBe('Python');
    expect(normalizeSkill('c++')).toBe('C++');
  });

  it('correctly extracts multiword skills and single-word skills from job text', () => {
    const text = 'We need expertise in Machine Learning, REST API architecture, Docker, and PostgreSQL.';
    const result = extractSkillsFromText(text);

    expect(result.skills).toContain('Machine Learning');
    expect(result.skills).toContain('REST API');
    expect(result.skills).toContain('Docker');
    expect(result.skills).toContain('PostgreSQL');
  });
});

describe('Skill Gap & Match Score Calculation', () => {
  it('computes weighted score where demonstrated=100% and partial=50%', () => {
    const requirements = [
      { skill: 'TypeScript', isExplicit: true },
      { skill: 'React', isExplicit: true },
      { skill: 'PostgreSQL', isExplicit: true },
      { skill: 'Docker', isExplicit: true },
    ];

    const assessed: AssessedSkillResult[] = [
      {
        skill: 'TypeScript',
        status: 'demonstrated',
        explanation: 'Interface definitions found',
        evidence: [],
        confidence: 'high',
        limitations: 'None',
        recommendedNextStep: 'Keep practicing',
        isExplicitRequirement: true,
      },
      {
        skill: 'React',
        status: 'partially_demonstrated',
        explanation: 'Imports found',
        evidence: [],
        confidence: 'medium',
        limitations: 'Basic usage',
        recommendedNextStep: 'Build custom hooks',
        isExplicitRequirement: true,
      },
      {
        skill: 'PostgreSQL',
        status: 'not_demonstrated_in_scope',
        explanation: 'No queries found',
        evidence: [],
        confidence: 'high',
        limitations: 'Missing',
        recommendedNextStep: 'Add SQL schema',
        isExplicitRequirement: true,
      },
      {
        skill: 'Docker',
        status: 'not_demonstrated_in_scope',
        explanation: 'No Dockerfile',
        evidence: [],
        confidence: 'high',
        limitations: 'Missing',
        recommendedNextStep: 'Add Dockerfile',
        isExplicitRequirement: true,
      },
    ];

    const result = calculateSkillGap(requirements, assessed, ['Redis']);

    // 1 full (1.0) + 1 partial (0.5) / 4 = 1.5 / 4 = 37.5% -> round to 38%
    expect(result.overallDemonstratedPct).toBe(38);
    expect(result.demonstratedCount).toBe(1);
    expect(result.partiallyDemonstratedCount).toBe(1);
    expect(result.notDemonstratedCount).toBe(2);
    expect(result.portfolioBonusSkills).toContain('Redis');
    expect(result.hiringDisclaimer).toContain('does NOT predict or guarantee interview invitations');
  });
});
