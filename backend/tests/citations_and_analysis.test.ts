import { describe, it, expect } from 'vitest';
import { validateCitation } from '../src/analyzer/citationValidator.js';
import {
  analyzeRepositoryCode,
  isDocumentationOrMetaFile,
  AssessedSkillSchema,
} from '../src/analyzer/codeEvidenceEngine.js';

describe('Citation and Line-Range Validation', () => {
  const sampleCode = `import express from 'express';
const app = express();
const PORT = 3000;

app.get('/api/users', (req, res) => {
  res.json({ users: ['Alice', 'Bob'] });
});

app.listen(PORT);`;

  it('validates citations with correct line ranges and matching snippet', () => {
    const citation = {
      repository: 'test-user/test-repo',
      commitSha: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      filePath: 'src/server.ts',
      startLine: 5,
      endLine: 7,
      evidenceSnippet: "app.get('/api/users', (req, res) => {\n  res.json({ users: ['Alice', 'Bob'] });\n});",
      explanation: 'Express route handler',
      isValidated: false,
    };

    const result = validateCitation(citation, sampleCode);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects citations where startLine exceeds total lines', () => {
    const citation = {
      repository: 'test-user/test-repo',
      commitSha: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      filePath: 'src/server.ts',
      startLine: 50,
      endLine: 55,
      evidenceSnippet: 'non-existent',
      explanation: 'Invalid line range',
      isValidated: false,
    };

    const result = validateCitation(citation, sampleCode);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('exceeds total file lines');
  });

  it('rejects citations with invalid line range order (endLine < startLine)', () => {
    const citation = {
      repository: 'test-user/test-repo',
      commitSha: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      filePath: 'src/server.ts',
      startLine: 6,
      endLine: 2,
      evidenceSnippet: 'invalid',
      explanation: 'Backwards range',
      isValidated: false,
    };

    const result = validateCitation(citation, sampleCode);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('endLine cannot precede startLine');
  });

  it('rejects hallucinated snippets that do not match the file lines', () => {
    const citation = {
      repository: 'test-user/test-repo',
      commitSha: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      filePath: 'src/server.ts',
      startLine: 1,
      endLine: 3,
      evidenceSnippet: 'class MachineLearningModel extends DeepLearningNetwork {',
      explanation: 'Fake code',
      isValidated: false,
    };

    const result = validateCitation(citation, sampleCode);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Cited snippet does not match file contents');
  });
});

describe('Documentation and README-only Rules', () => {
  it('correctly identifies markdown, README, and doc files as non-code', () => {
    expect(isDocumentationOrMetaFile('README.md')).toBe(true);
    expect(isDocumentationOrMetaFile('docs/ARCHITECTURE.markdown')).toBe(true);
    expect(isDocumentationOrMetaFile('notes.txt')).toBe(true);
    expect(isDocumentationOrMetaFile('.gitignore')).toBe(true);
    expect(isDocumentationOrMetaFile('LICENSE')).toBe(true);

    expect(isDocumentationOrMetaFile('src/index.ts')).toBe(false);
    expect(isDocumentationOrMetaFile('app/models/user.py')).toBe(false);
    expect(isDocumentationOrMetaFile('Dockerfile')).toBe(false);
  });

  it('does NOT award technical skills from README text claims', () => {
    const files = [
      {
        path: 'README.md',
        content: '# My Project\nExpert in Machine Learning, PyTorch, Kubernetes, and PostgreSQL.',
      },
    ];

    const requirements = [
      { skill: 'Machine Learning', isExplicit: true },
      { skill: 'PyTorch', isExplicit: true },
    ];

    const results = analyzeRepositoryCode({
      repository: 'user/repo',
      commitSha: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      files,
      requirements,
    });

    for (const r of results) {
      expect(r.status).toBe('not_demonstrated_in_scope');
      expect(r.evidence.length).toBe(0);
      // Validated by schema
      expect(() => AssessedSkillSchema.parse(r)).not.toThrow();
    }
  });

  it('demonstrates skills when authentic code implementation is provided', () => {
    const files = [
      {
        path: 'src/db.ts',
        content: `import { Pool } from 'pg';\nexport const pool = new Pool();\nexport async function getUsers() {\n  return pool.query('SELECT * FROM users');\n}`,
      },
      {
        path: 'src/components/App.tsx',
        content: `import React, { useState } from 'react';\nexport const App = () => {\n  const [count, setCount] = useState(0);\n  return <button onClick={() => setCount(count + 1)}>{count}</button>;\n};`,
      },
    ];

    const requirements = [
      { skill: 'PostgreSQL', isExplicit: true },
      { skill: 'React', isExplicit: true },
      { skill: 'Docker', isExplicit: true },
    ];

    const results = analyzeRepositoryCode({
      repository: 'user/repo',
      commitSha: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      files,
      requirements,
    });

    const pgResult = results.find((r) => r.skill === 'PostgreSQL');
    const reactResult = results.find((r) => r.skill === 'React');
    const dockerResult = results.find((r) => r.skill === 'Docker');

    expect(pgResult?.status).toBe('demonstrated');
    expect(pgResult?.evidence.length).toBeGreaterThan(0);
    expect(pgResult?.evidence[0].isValidated).toBe(true);

    expect(reactResult?.status).toBe('demonstrated');
    expect(reactResult?.evidence.length).toBeGreaterThan(0);
    expect(reactResult?.evidence[0].isValidated).toBe(true);

    expect(dockerResult?.status).toBe('not_demonstrated_in_scope');
  });
});
