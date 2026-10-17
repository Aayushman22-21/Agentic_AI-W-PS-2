/**
 * Career Roadmap & Project Recommendation Tests
 * Tests transparent gap prioritization, pedagogical project sequencing,
 * milestone progress persistence, and reassessment updates.
 */

import fs from 'fs';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StorageService } from '../src/db/storage.js';
import {
  analyzeAndPrioritizeSkillGaps,
  recommendProjectsForRoadmap,
  calculateRoadmapProgress,
  CANONICAL_CAREER_ROLES,
} from '../src/roadmap/roadmapEngine.js';
import { DiscoveredJob } from '../src/jobs/jobDiscoveryService.js';
import { AssessedSkillResult } from '../src/skills/gapAnalyzer.js';
import { StoredRoadmap } from '../src/roadmap/roadmapTypes.js';

describe('Career Roadmap Engine & Priority Model', () => {
  const sampleJob: DiscoveredJob = {
    id: 'test_job_backend_1',
    source: 'manual',
    company: 'Acme Cloud',
    title: 'Senior Backend Engineer',
    location: 'Remote',
    isRemote: true,
    url: 'https://careers.acme.example/jobs/sr-backend',
    updatedAt: new Date().toISOString(),
    rawDescription: 'Looking for a backend engineer proficient in Node.js, PostgreSQL, Docker, and REST APIs.',
    requirements: [
      { skill: 'Node.js', isExplicit: true, minimumLevel: 'advanced' },
      { skill: 'PostgreSQL', isExplicit: true, minimumLevel: 'competent' },
      { skill: 'Docker', isExplicit: false, minimumLevel: 'competent' },
      { skill: 'GraphQL', isExplicit: false, minimumLevel: 'foundational' },
    ],
  };

  const sampleAssessedSkills: AssessedSkillResult[] = [
    {
      skill: 'Node.js',
      status: 'demonstrated',
      explanation: 'Code evidence verified in server.ts',
      evidence: [
        {
          repository: 'student/portfolio-repo',
          commitSha: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
          filePath: 'src/server.ts',
          startLine: 1,
          endLine: 10,
          evidenceSnippet: 'import express from "express";',
          explanation: 'Express REST server initialization',
          isValidated: true,
        },
      ],
      confidence: 'high',
      limitations: 'Demonstrated in active server file',
      recommendedNextStep: 'Expand tests',
      isExplicitRequirement: true,
    },
    {
      skill: 'PostgreSQL',
      status: 'not_demonstrated_in_scope',
      explanation: 'No SQL or database code found in scanned files.',
      evidence: [],
      confidence: 'high',
      limitations: 'Not found in inspected repository scope',
      recommendedNextStep: 'Build relational database project',
      isExplicitRequirement: true,
    },
    {
      skill: 'Docker',
      status: 'partially_demonstrated',
      explanation: 'Basic Dockerfile with FROM node:alpine found.',
      evidence: [
        {
          repository: 'student/portfolio-repo',
          commitSha: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
          filePath: 'Dockerfile',
          startLine: 1,
          endLine: 5,
          evidenceSnippet: 'FROM node:alpine\nWORKDIR /app',
          explanation: 'Dockerfile base image',
          isValidated: true,
        },
      ],
      confidence: 'medium',
      limitations: 'Multi-stage builds and compose not yet implemented',
      recommendedNextStep: 'Add docker-compose and orchestration',
      isExplicitRequirement: false,
    },
  ];

  it('provides a transparent, explainable scoring breakdown for skill gaps', () => {
    const gaps = analyzeAndPrioritizeSkillGaps(sampleJob, sampleAssessedSkills, 'Backend Engineer');

    expect(gaps.length).toBe(4);

    // PostgreSQL is explicit (40 pts) + missing (35 pts) + core foundational (15 pts) + project coverage (10 pts) = 100 pts
    const pgGap = gaps.find((g) => g.skill === 'PostgreSQL')!;
    expect(pgGap).toBeDefined();
    expect(pgGap.priorityBreakdown.jobRelevanceWeight).toBe(40);
    expect(pgGap.priorityBreakdown.evidenceGapSeverity).toBe(35);
    expect(pgGap.priorityBreakdown.prerequisiteValue).toBe(15);
    expect(pgGap.priorityBreakdown.feasibilityBonus).toBe(10);
    expect(pgGap.priorityScore).toBe(100);
    expect(pgGap.priorityRank).toBe(1);

    // Ensure the explanation contains transparent breakdown formula
    expect(pgGap.priorityExplanation).toContain('Explicit requirement for Senior Backend Engineer (40/40 pts)');
    expect(pgGap.priorityExplanation).toContain("Evidence status 'not_demonstrated_in_scope' (35/35 pts)");

    // Never state that the user lacks ability
    expect(pgGap.assessmentReason).toContain('does NOT imply lack of ability');
  });

  it('ranks demonstrated skills lower than unverified or missing skills', () => {
    const gaps = analyzeAndPrioritizeSkillGaps(sampleJob, sampleAssessedSkills, 'Backend Engineer');

    const nodeGap = gaps.find((g) => g.skill === 'Node.js')!;
    const pgGap = gaps.find((g) => g.skill === 'PostgreSQL')!;

    // Node.js is already demonstrated, so evidenceGapSeverity is 0
    expect(nodeGap.priorityBreakdown.evidenceGapSeverity).toBe(0);
    expect(pgGap.priorityScore).toBeGreaterThan(nodeGap.priorityScore);
    expect(pgGap.priorityRank).toBeLessThan(nodeGap.priorityRank); // rank 1 is higher priority than rank 3
  });

  it('sequences recommended projects in pedagogical progression (Foundational -> Intermediate -> Advanced)', () => {
    const gaps = analyzeAndPrioritizeSkillGaps(sampleJob, sampleAssessedSkills, 'Backend Engineer');
    const projects = recommendProjectsForRoadmap('Backend Engineer', gaps, 'mid');

    expect(projects.length).toBeGreaterThanOrEqual(2);

    // Verify progression order
    expect(projects[0].difficulty).toBe('foundational');
    expect(projects[1].difficulty).toBe('intermediate');
    if (projects.length >= 3) {
      expect(projects[2].difficulty).toBe('advanced');
    }

    // Verify projects address the target skill gaps
    const firstProject = projects[0];
    expect(firstProject.milestones.length).toBeGreaterThan(0);
    expect(firstProject.learningResources.length).toBeGreaterThan(0);
    expect(firstProject.learningResources[0].url).toMatch(/^https:\/\//);
    expect(firstProject.roleFitExplanation).toContain('Backend Engineer');
  });

  it('calculates verified progress strictly from completed milestones', () => {
    const gaps = analyzeAndPrioritizeSkillGaps(sampleJob, sampleAssessedSkills, 'Backend Engineer');
    const projects = recommendProjectsForRoadmap('Backend Engineer', gaps, 'mid');

    // 0 milestones completed initially
    expect(calculateRoadmapProgress(projects)).toBe(0);

    // Complete 1 milestone
    projects[0].milestones[0].isCompleted = true;
    const progressAfterOne = calculateRoadmapProgress(projects);
    expect(progressAfterOne).toBeGreaterThan(0);
    expect(progressAfterOne).toBeLessThan(100);

    // Complete all milestones across all projects
    for (const proj of projects) {
      for (const m of proj.milestones) {
        m.isCompleted = true;
      }
    }
    expect(calculateRoadmapProgress(projects)).toBe(100);
  });
});

describe('Roadmap Storage & Reassessment Integration', () => {
  let storage: StorageService;
  let testPath: string;

  beforeEach(() => {
    // Isolated in-memory storage instance for test
    testPath = `data/test_roadmap_store_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.json`;
    storage = new StorageService(testPath);
  });

  afterEach(() => {
    try {
      if (fs.existsSync(testPath)) {
        fs.unlinkSync(testPath);
      }
    } catch {
      // Ignore cleanup error
    }
  });


  it('persists and retrieves a roadmap with milestone checkmarks', () => {
    const sampleRoadmap: StoredRoadmap = {
      id: 'rdm_test_123',
      assessmentId: 'asmt_123',
      jobId: 'job_456',
      jobTitle: 'Backend Engineer',
      jobCompany: 'Acme Cloud',
      repositoryId: 987,
      repositoryFullName: 'student/backend-repo',
      commitSha: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      assessmentVersion: 1,
      preferences: {
        targetRole: 'Backend Engineer',
        targetCompany: 'Acme Cloud',
        seniority: 'mid',
        weeklyHours: 12,
      },
      skillGaps: [],
      recommendedProjects: [
        {
          id: 'proj_1',
          title: 'Relational REST API',
          track: 'backend',
          difficulty: 'foundational',
          sequenceOrder: 1,
          description: 'Build a relational API',
          estimatedEffort: '12 hours',
          prerequisites: [],
          skillsCovered: ['Node.js', 'PostgreSQL'],
          targetSkillGaps: ['PostgreSQL'],
          roleFitExplanation: 'Targeted for Backend role',
          milestones: [
            {
              id: 'm1',
              title: 'Database Schema',
              description: 'Create tables',
              acceptanceCriteria: ['Foreign key constraint present'],
              expectedEvidence: 'src/db/migrations/01.sql',
              isCompleted: false,
            },
            {
              id: 'm2',
              title: 'CRUD Routes',
              description: 'Add handlers',
              acceptanceCriteria: ['GET /posts returns 200'],
              expectedEvidence: 'src/routes/posts.ts',
              isCompleted: false,
            },
          ],
          learningResources: [],
          status: 'not_started',
        },
      ],
      overallProgressPct: 0,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    storage.saveRoadmap(sampleRoadmap);

    const retrieved = storage.getRoadmap('rdm_test_123');
    expect(retrieved).toBeDefined();
    expect(retrieved?.jobTitle).toBe('Backend Engineer');
    expect(retrieved?.overallProgressPct).toBe(0);

    // Update progress on milestone m1
    const updated = storage.updateRoadmapProgress('rdm_test_123', 'proj_1', 'm1', true);
    expect(updated).toBeDefined();
    expect(updated?.recommendedProjects[0].milestones[0].isCompleted).toBe(true);
    expect(updated?.recommendedProjects[0].milestones[0].completedAt).toBeDefined();
    expect(updated?.recommendedProjects[0].status).toBe('in_progress');
    // 1 of 2 milestones = 50%
    expect(updated?.overallProgressPct).toBe(50);

    // Complete m2 as well
    const completedAll = storage.updateRoadmapProgress('rdm_test_123', 'proj_1', 'm2', true);
    expect(completedAll?.overallProgressPct).toBe(100);
    expect(completedAll?.recommendedProjects[0].status).toBe('completed_and_verified');
  });

  it('exposes canonical career roles with defined core competencies', () => {
    expect(CANONICAL_CAREER_ROLES.length).toBeGreaterThanOrEqual(4);
    const backendRole = CANONICAL_CAREER_ROLES.find((r) => r.role === 'Backend Engineer');
    expect(backendRole).toBeDefined();
    expect(backendRole?.coreSkills).toContain('Node.js');
    expect(backendRole?.coreSkills).toContain('PostgreSQL');
  });
});
