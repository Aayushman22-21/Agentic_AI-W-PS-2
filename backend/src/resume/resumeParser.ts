/**
 * Optional Resume Parser Module
 * Extracts self-reported resume skills while strictly separating
 * unverified claims from code-verified portfolio evidence.
 */

import pdfParse from 'pdf-parse';
import { extractSkillsFromText } from '../skills/taxonomy.js';

export interface ParsedResumeResult {
  textSnippet: string;
  extractedSkills: string[];
  skillsByCategory: Record<string, string[]>;
  isVerifiedCodeEvidence: false; // Explicitly enforce that resume claims are not code evidence
  disclaimer: string;
}

export class ResumeParserService {
  /**
   * Parse PDF buffer
   */
  async parsePdfBuffer(buffer: Buffer): Promise<ParsedResumeResult> {
    try {
      const data = await pdfParse(buffer);
      const text = data.text || '';
      return this.processExtractedText(text);
    } catch (err: any) {
      throw new Error(`Failed to parse PDF resume: ${err.message || 'Scanned or unsupported PDF format'}`);
    }
  }

  /**
   * Parse plain text resume
   */
  parsePlainText(text: string): ParsedResumeResult {
    return this.processExtractedText(text);
  }

  private processExtractedText(rawText: string): ParsedResumeResult {
    const cleanText = rawText.replace(/\s+/g, ' ').trim();
    const { skills, categorized } = extractSkillsFromText(cleanText);

    return {
      textSnippet: cleanText.substring(0, 500) + (cleanText.length > 500 ? '...' : ''),
      extractedSkills: skills,
      skillsByCategory: categorized,
      isVerifiedCodeEvidence: false,
      disclaimer: 'Resume skills represent self-reported claims. They are kept separate from code-verified evidence.',
    };
  }
}
