/**
 * Programmatic Citation Validator
 * Validates that file exists at pinned commit, line range is valid,
 * and citation snippet accurately matches the source lines.
 */

import { CodeEvidenceCitation } from '../skills/gapAnalyzer.js';

export interface CitationValidationResult {
  isValid: boolean;
  error?: string;
  matchedSnippet?: string;
  actualLineCount?: number;
}

/**
 * Validates a code citation against the raw source code of the file.
 */
export function validateCitation(
  citation: CodeEvidenceCitation,
  fileContent: string | null | undefined
): CitationValidationResult {
  if (fileContent === null || fileContent === undefined) {
    return {
      isValid: false,
      error: `Cited file '${citation.filePath}' does not exist at commit ${citation.commitSha}.`,
    };
  }

  // Normalize line breaks
  const lines = fileContent.split(/\r?\n/);
  const totalLines = lines.length;

  if (citation.startLine < 1) {
    return {
      isValid: false,
      error: `Invalid startLine ${citation.startLine}. Line numbers must be 1-indexed (>= 1).`,
      actualLineCount: totalLines,
    };
  }

  if (citation.endLine < citation.startLine) {
    return {
      isValid: false,
      error: `Invalid line range [${citation.startLine}, ${citation.endLine}]: endLine cannot precede startLine.`,
      actualLineCount: totalLines,
    };
  }

  if (citation.startLine > totalLines) {
    return {
      isValid: false,
      error: `Start line ${citation.startLine} exceeds total file lines (${totalLines}).`,
      actualLineCount: totalLines,
    };
  }

  // Clamp endLine if needed or validate bounds
  const effectiveEndLine = Math.min(citation.endLine, totalLines);
  const slice = lines.slice(citation.startLine - 1, effectiveEndLine);
  const sourceSnippet = slice.join('\n');

  // Verify snippet correspondence (non-empty & matches source lines loosely)
  const normSource = sourceSnippet.replace(/\s+/g, ' ').trim();
  const normSnippet = (citation.evidenceSnippet || '').replace(/\s+/g, ' ').trim();

  // If snippet is provided, check if it exists in or overlaps the source lines
  if (normSnippet.length > 0 && !normSource.includes(normSnippet) && !normSnippet.includes(normSource)) {
    // Check line-by-line inclusion for partial tolerance (e.g. comment differences)
    const someLineMatches = slice.some((line) => {
      const cleanLine = line.trim();
      return cleanLine.length > 5 && normSnippet.includes(cleanLine);
    });

    if (!someLineMatches) {
      return {
        isValid: false,
        error: `Cited snippet does not match file contents at lines ${citation.startLine}-${citation.endLine}.`,
        matchedSnippet: sourceSnippet,
        actualLineCount: totalLines,
      };
    }
  }

  return {
    isValid: true,
    matchedSnippet: sourceSnippet,
    actualLineCount: totalLines,
  };
}

/**
 * Validates a collection of citations against a map of file contents
 */
export function validateAllCitations(
  citations: CodeEvidenceCitation[],
  fileContentsMap: Map<string, string>
): CodeEvidenceCitation[] {
  return citations.map((citation) => {
    const content = fileContentsMap.get(citation.filePath);
    const result = validateCitation(citation, content);
    return {
      ...citation,
      isValidated: result.isValid,
      validationError: result.error,
      evidenceSnippet: result.matchedSnippet || citation.evidenceSnippet,
    };
  });
}
