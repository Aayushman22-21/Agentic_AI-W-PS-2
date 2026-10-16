/**
 * Code Evidence Assessment Engine
 * Inspects real source code at a pinned commit SHA against job requirements.
 * Enforces strict criteria: non-code files (README, docs, configs) NEVER count
 * as demonstrated technical proficiency.
 */

import { z } from 'zod';
import {
  AssessedSkillResult,
  AssessmentStatus,
  CodeEvidenceCitation,
  JobRequirementItem,
} from '../skills/gapAnalyzer.js';
import { validateCitation } from './citationValidator.js';

export const EvidenceCitationSchema = z.object({
  repository: z.string(),
  commitSha: z.string().regex(/^[0-9a-f]{7,40}$/i),
  filePath: z.string(),
  startLine: z.number().int().min(1),
  endLine: z.number().int().min(1),
  evidenceSnippet: z.string(),
  explanation: z.string(),
  isValidated: z.boolean(),
  validationError: z.string().optional(),
});

export const AssessedSkillSchema = z.object({
  skill: z.string(),
  status: z.enum(['demonstrated', 'partially_demonstrated', 'not_demonstrated_in_scope', 'needs_review']),
  explanation: z.string(),
  evidence: z.array(EvidenceCitationSchema),
  confidence: z.enum(['high', 'medium', 'low']),
  limitations: z.string(),
  recommendedNextStep: z.string(),
  isExplicitRequirement: z.boolean(),
});

export interface RepositorySourceFile {
  path: string;
  content: string;
}

export interface CodeAnalysisInput {
  repository: string;
  commitSha: string;
  files: RepositorySourceFile[];
  requirements: JobRequirementItem[];
}

/**
 * Checks if a file path is documentation, markdown, or non-functional meta-file.
 */
export function isDocumentationOrMetaFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  const ext = lower.split('.').pop() || '';
  const name = lower.split('/').pop() || '';

  // Documentation / markdown / text
  if (['md', 'markdown', 'txt', 'rst', 'adoc', 'pdf', 'png', 'jpg', 'svg'].includes(ext)) {
    return true;
  }

  // Common meta filenames
  if (
    name.startsWith('readme') ||
    name.startsWith('license') ||
    name.startsWith('changelog') ||
    name.startsWith('contributing') ||
    name === '.gitignore' ||
    name === '.env.example'
  ) {
    return true;
  }

  return false;
}

/**
 * Rule definitions for identifying authentic code implementation of specific technical skills.
 */
interface SkillCodePattern {
  skill: string;
  fileExtensions: string[];
  // Must match real code constructs, not just comments or keywords in text
  patterns: Array<{
    regex: RegExp;
    weight: 'full' | 'partial';
    description: string;
  }>;
}

const SKILL_PATTERNS: SkillCodePattern[] = [
  {
    skill: 'TypeScript',
    fileExtensions: ['ts', 'tsx'],
    patterns: [
      { regex: /(?:interface\s+\w+|type\s+\w+\s*=|:\s*(?:string|number|boolean|Record<|Array<|Promise<))/i, weight: 'full', description: 'Strong TypeScript type definitions or interfaces' },
      { regex: /import\s+type\s+/i, weight: 'partial', description: 'Type import statement' },
    ],
  },
  {
    skill: 'JavaScript',
    fileExtensions: ['js', 'jsx', 'mjs', 'cjs'],
    patterns: [
      { regex: /(?:function\s+\w+|\bconst\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|\bclass\s+\w+)/, weight: 'full', description: 'JavaScript function or class declaration' },
    ],
  },
  {
    skill: 'Python',
    fileExtensions: ['py'],
    patterns: [
      { regex: /(?:def\s+\w+\s*\(|class\s+\w+[\w\s,()]*:)/, weight: 'full', description: 'Python class or function definition' },
    ],
  },
  {
    skill: 'React',
    fileExtensions: ['jsx', 'tsx', 'js'],
    patterns: [
      { regex: /(?:use(?:State|Effect|Context|Reducer|Memo|Callback)\s*\(|<[A-Z]\w+[^>]*>|React\.FC)/, weight: 'full', description: 'React hooks or JSX component structure' },
      { regex: /import\s+.*\bfrom\s+['"]react['"]/, weight: 'partial', description: 'React module import' },
    ],
  },
  {
    skill: 'Express.js',
    fileExtensions: ['js', 'ts'],
    patterns: [
      { regex: /(?:app|router)\.(?:get|post|put|delete|patch|use)\s*\(/i, weight: 'full', description: 'Express HTTP route definition or middleware mount' },
      { regex: /import\s+.*express|require\(['"]express['"]\)/i, weight: 'partial', description: 'Express package import' },
    ],
  },
  {
    skill: 'FastAPI',
    fileExtensions: ['py'],
    patterns: [
      { regex: /@(?:app|router)\.(?:get|post|put|delete|patch)\s*\(/i, weight: 'full', description: 'FastAPI route decorator and endpoint function' },
    ],
  },
  {
    skill: 'PostgreSQL',
    fileExtensions: ['sql', 'ts', 'js', 'py'],
    patterns: [
      { regex: /(?:SELECT\s+.+\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE|JOIN\s+.+\s+ON|pg_query|Pool\s*\(|create_engine\(.*postgresql)/i, weight: 'full', description: 'PostgreSQL schema DDL, relational joins, or connection pool' },
    ],
  },
  {
    skill: 'MongoDB',
    fileExtensions: ['ts', 'js', 'py'],
    patterns: [
      { regex: /(?:mongoose\.Schema|\.aggregate\s*\(|\.find\s*\(|\.insertOne\s*\(|\.findOneAndUpdate\s*\()/i, weight: 'full', description: 'MongoDB collection queries or Mongoose schema definition' },
    ],
  },
  {
    skill: 'REST API',
    fileExtensions: ['ts', 'js', 'py', 'go', 'java'],
    patterns: [
      { regex: /(?:res\.status\(\d+\)\.json|return\s+jsonify|\.(?:get|post|put|delete)\s*\(['"]\/|HttpStatus\.)/i, weight: 'full', description: 'REST endpoint request handling with structured HTTP status response' },
    ],
  },
  {
    skill: 'GraphQL',
    fileExtensions: ['ts', 'js', 'py', 'graphql', 'gql'],
    patterns: [
      { regex: /(?:type\s+Query\s*\{|type\s+Mutation\s*\{|gql`|buildSchema\s*\()/i, weight: 'full', description: 'GraphQL schema type definitions or resolver operations' },
    ],
  },
  {
    skill: 'Docker',
    fileExtensions: ['dockerfile', 'yml', 'yaml'],
    patterns: [
      { regex: /(?:FROM\s+[\w/:.-]+\s+AS|ENTRYPOINT\s*\[|EXPOSE\s+\d+|services:\s*\n\s+\w+:)/i, weight: 'full', description: 'Dockerfile multi-stage build instructions or Docker Compose services' },
    ],
  },
  {
    skill: 'CI/CD',
    fileExtensions: ['yml', 'yaml'],
    patterns: [
      { regex: /(?:on:\s*(?:push|pull_request)|jobs:\s*\n\s+\w+:\s*\n\s+runs-on:)/i, weight: 'full', description: 'GitHub Actions workflow pipeline trigger and jobs configuration' },
    ],
  },
  {
    skill: 'Machine Learning',
    fileExtensions: ['py', 'ipynb'],
    patterns: [
      { regex: /(?:\.fit\s*\(.*,\s*.*\)|\.predict\s*\(|train_test_split\s*\(|RandomForest|LogisticRegression|GradientBoosting)/i, weight: 'full', description: 'Model fitting, prediction, and dataset partitioning pipeline' },
    ],
  },
  {
    skill: 'PyTorch',
    fileExtensions: ['py'],
    patterns: [
      { regex: /(?:nn\.Module|torch\.optim|loss\.backward\(\)|optimizer\.step\(\)|DataLoader\()/i, weight: 'full', description: 'PyTorch neural network module definition and training loop' },
    ],
  },
  {
    skill: 'Unit Testing',
    fileExtensions: ['test.ts', 'test.js', 'spec.ts', 'spec.js', 'test.py'],
    patterns: [
      { regex: /(?:describe\s*\(|test\s*\(|it\s*\(|expect\(.*\.to|def\s+test_\w+\()/i, weight: 'full', description: 'Automated test suite assertions with describe/it or pytest functions' },
    ],
  },
];

/**
 * Analyzes repository files at pinned commit to assess job requirements.
 */
export function analyzeRepositoryCode(input: CodeAnalysisInput): AssessedSkillResult[] {
  const { repository, commitSha, files, requirements } = input;
  const results: AssessedSkillResult[] = [];

  // Filter out documentation files from code evidence pool
  const codeFiles = files.filter((f) => !isDocumentationOrMetaFile(f.path));

  for (const req of requirements) {
    const skillName = req.skill;
    const rule = SKILL_PATTERNS.find((p) => p.skill.toLowerCase() === skillName.toLowerCase());

    const citations: CodeEvidenceCitation[] = [];
    let hasFullEvidence = false;
    let hasPartialEvidence = false;
    let primaryExplanation = '';

    if (rule) {
      for (const file of codeFiles) {
        const ext = file.path.split('.').pop()?.toLowerCase() || '';
        const isTargetExt = rule.fileExtensions.some((target) => {
          if (target.includes('.')) return file.path.toLowerCase().endsWith(target);
          return ext === target || file.path.toLowerCase().endsWith(target);
        });

        if (!isTargetExt) continue;

        const lines = file.content.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          for (const pattern of rule.patterns) {
            if (pattern.regex.test(line)) {
              // Expand line context (1 line before and up to 3 lines after)
              const startLine = Math.max(1, i);
              const endLine = Math.min(lines.length, i + 3);
              const snippet = lines.slice(startLine - 1, endLine).join('\n');

              const citation: CodeEvidenceCitation = {
                repository,
                commitSha,
                filePath: file.path,
                startLine,
                endLine,
                evidenceSnippet: snippet,
                explanation: pattern.description,
                isValidated: false,
              };

              // Validate citation against file content
              const validation = validateCitation(citation, file.content);
              citation.isValidated = validation.isValid;
              citation.validationError = validation.error;

              if (validation.isValid) {
                citations.push(citation);
                if (pattern.weight === 'full') {
                  hasFullEvidence = true;
                  primaryExplanation = `Demonstrated in ${file.path} (L${startLine}-${endLine}): ${pattern.description}.`;
                } else {
                  hasPartialEvidence = true;
                  if (!primaryExplanation) {
                    primaryExplanation = `Partial usage found in ${file.path} (L${startLine}-${endLine}): ${pattern.description}.`;
                  }
                }
              }

              if (citations.length >= 3) break; // Limit to 3 strong citations per skill
            }
          }
          if (citations.length >= 3) break;
        }
        if (citations.length >= 3) break;
      }
    } else {
      // Generic code inspection for skills without hardcoded regex patterns
      const token = skillName.toLowerCase().replace(/[^\w]/g, '');
      for (const file of codeFiles) {
        if (isDocumentationOrMetaFile(file.path)) continue;
        const lines = file.content.split(/\r?\n/);

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const cleanLine = line.toLowerCase();

          // Check for import or package usage in code
          if (
            (cleanLine.includes('import ') || cleanLine.includes('require(') || cleanLine.includes('from ')) &&
            cleanLine.includes(token)
          ) {
            const startLine = Math.max(1, i);
            const endLine = Math.min(lines.length, i + 2);
            const snippet = lines.slice(startLine - 1, endLine).join('\n');

            const citation: CodeEvidenceCitation = {
              repository,
              commitSha,
              filePath: file.path,
              startLine,
              endLine,
              evidenceSnippet: snippet,
              explanation: `Referenced in import/module statement for ${skillName}`,
              isValidated: false,
            };

            const validation = validateCitation(citation, file.content);
            citation.isValidated = validation.isValid;
            citation.validationError = validation.error;

            if (validation.isValid) {
              citations.push(citation);
              hasPartialEvidence = true;
              primaryExplanation = `Partially demonstrated via dependency/import in ${file.path} (L${startLine}-${endLine}).`;
              break;
            }
          }
        }
        if (citations.length > 0) break;
      }
    }

    // Determine status
    let status: AssessmentStatus = 'not_demonstrated_in_scope';
    let confidence: 'high' | 'medium' | 'low' = 'low';
    let limitations = '';
    let recommendedNextStep = '';

    if (hasFullEvidence) {
      status = 'demonstrated';
      confidence = 'high';
      limitations = 'Evaluated within inspected repository scope at this commit.';
      recommendedNextStep = `Deepen experience with production-scale edge cases and end-to-end testing for ${skillName}.`;
    } else if (hasPartialEvidence) {
      status = 'partially_demonstrated';
      confidence = 'medium';
      limitations = 'Only configuration, imports, or basic structures found; full business logic was not identified.';
      recommendedNextStep = `Build a complete, standalone feature utilizing ${skillName} with robust error handling and automated tests.`;
    } else {
      status = 'not_demonstrated_in_scope';
      confidence = 'high';
      primaryExplanation = `No code-level implementation of ${skillName} was found in inspected repository files.`;
      limitations = 'Inspected files contained no verifiable implementation. Skill may exist in uninspected repositories or private work.';
      recommendedNextStep = `Implement a working module or project showcasing ${skillName} in your public portfolio.`;
    }

    const assessedResult: AssessedSkillResult = {
      skill: skillName,
      status,
      explanation: primaryExplanation,
      evidence: citations,
      confidence,
      limitations,
      recommendedNextStep,
      isExplicitRequirement: req.isExplicit,
    };

    // Validate with Zod schema
    const validated = AssessedSkillSchema.parse(assessedResult);
    results.push(validated);
  }

  return results;
}
