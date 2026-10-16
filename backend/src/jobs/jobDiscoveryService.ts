/**
 * Real Job and Internship Discovery Service
 * Queries live public job board APIs (Greenhouse & Lever) and provides
 * a structured fallback parser for pasted job descriptions.
 */

import { extractSkillsFromText, normalizeSkill } from '../skills/taxonomy.js';
import { JobRequirementItem } from '../skills/gapAnalyzer.js';

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

export class JobDiscoveryService {
  /**
   * Fetch live jobs from Greenhouse public board API
   * (e.g. board tokens: cloudflare, figma, automattic, hashicorp, etc.)
   */
  async fetchGreenhouseJobs(boardToken: string = 'cloudflare'): Promise<DiscoveredJob[]> {
    const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs?content=true`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Failed to fetch Greenhouse board '${boardToken}': ${res.statusText} (${res.status})`);
    }

    const data: any = await res.json();
    const jobsList: any[] = data.jobs || [];

    return jobsList.map((j) => {
      const content = j.content ? this.cleanHtml(j.content) : '';
      const requirements = this.extractStructuredRequirements(j.title + ' ' + content);

      return {
        id: `gh_${boardToken}_${j.id}`,
        source: 'greenhouse',
        company: boardToken.charAt(0).toUpperCase() + boardToken.slice(1),
        title: j.title || 'Untitled Role',
        location: j.location?.name || 'Multiple Locations',
        isRemote: Boolean(
          (j.location?.name || '').toLowerCase().includes('remote') ||
          (j.title || '').toLowerCase().includes('remote')
        ),
        url: j.absolute_url || `https://boards.greenhouse.io/${boardToken}/jobs/${j.id}`,
        updatedAt: j.updated_at || new Date().toISOString(),
        rawDescription: content,
        requirements,
      };
    });
  }

  /**
   * Fetch live jobs from Lever public postings API
   * (e.g. companies: figma, netlify, databricks, etc.)
   */
  async fetchLeverJobs(company: string = 'netlify'): Promise<DiscoveredJob[]> {
    const url = `https://api.lever.co/v0/postings/${encodeURIComponent(company)}?mode=json`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Failed to fetch Lever postings for '${company}': ${res.statusText} (${res.status})`);
    }

    const postings: any = await res.json();
    if (!Array.isArray(postings)) return [];

    return postings.map((p) => {
      const desc = p.descriptionPlain || this.cleanHtml(p.description || '');
      const requirements = this.extractStructuredRequirements(p.text + ' ' + desc);

      return {
        id: `lever_${company}_${p.id}`,
        source: 'lever',
        company: company.charAt(0).toUpperCase() + company.slice(1),
        title: p.text || 'Untitled Role',
        location: p.categories?.location || 'Remote',
        isRemote: Boolean(
          p.workplaceType === 'remote' ||
          (p.categories?.location || '').toLowerCase().includes('remote') ||
          (p.text || '').toLowerCase().includes('remote')
        ),
        url: p.hostedUrl || `https://jobs.lever.co/${company}/${p.id}`,
        updatedAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
        rawDescription: desc,
        requirements,
      };
    });
  }

  /**
   * Parse a pasted job description (fallback when external API is unreachable or for custom roles)
   */
  parsePastedJobDescription(input: {
    title: string;
    company: string;
    location?: string;
    url?: string;
    text: string;
  }): DiscoveredJob {
    const requirements = this.extractStructuredRequirements(input.title + ' ' + input.text);

    return {
      id: `manual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      source: 'manual',
      company: input.company || 'Custom Company',
      title: input.title || 'Software Engineering Role',
      location: input.location || 'Remote',
      isRemote: Boolean((input.location || '').toLowerCase().includes('remote') || input.title.toLowerCase().includes('remote')),
      url: input.url || '',
      updatedAt: new Date().toISOString(),
      rawDescription: input.text,
      requirements,
    };
  }

  /**
   * Distinguish explicitly stated requirements from inferred requirements
   */
  extractStructuredRequirements(fullText: string): JobRequirementItem[] {
    const { skills } = extractSkillsFromText(fullText);
    const items: JobRequirementItem[] = [];

    // Simple heuristic: check if skill occurs in sections labeled "Requirements", "Qualifications", "Must have"
    const lower = fullText.toLowerCase();
    const reqSectionMatch = lower.match(/(?:requirements|qualifications|what you need|must have|skills required)([\s\S]*?)(?:nice to have|preferred|benefits|what we offer|$)/i);
    const reqSection = reqSectionMatch ? reqSectionMatch[1] : '';

    for (const skill of skills) {
      const canonical = normalizeSkill(skill) || skill;
      const occursInReqSection = reqSection.length > 0 && reqSection.includes(canonical.toLowerCase());

      items.push({
        skill: canonical,
        isExplicit: occursInReqSection || !reqSectionMatch, // If no sections, mark as explicit match
        minimumLevel: 'competent',
      });
    }

    return items;
  }

  private cleanHtml(html: string): string {
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
