import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GitHubService, GitHubApiError } from '../src/github/githubService.js';
import { ResumeParserService } from '../src/resume/resumeParser.js';

describe('GitHub Service: Diagnostics, Caching & Error Categorization', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('performs successful user search and caches results for subsequent calls', async () => {
    const service = new GitHubService();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({
        'x-ratelimit-limit': '60',
        'x-ratelimit-remaining': '58',
        'x-ratelimit-reset': '1792166400',
      }),
      json: async () => ({
        login: 'octocat',
        name: 'The Octocat',
        avatar_url: 'https://avatars.githubusercontent.com/u/583231',
        html_url: 'https://github.com/octocat',
        bio: 'Mona Lisa Octocat',
        public_repos: 8,
        followers: 1000,
        following: 10,
      }),
    } as any);

    global.fetch = fetchMock;

    // First call -> invokes fetch
    const profile1 = await service.getUserProfile('octocat');
    expect(profile1.login).toBe('octocat');
    expect(profile1.name).toBe('The Octocat');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Second call -> should be served from in-memory cache without calling fetch again!
    const profile2 = await service.getUserProfile('octocat');
    expect(profile2.login).toBe('octocat');
    expect(fetchMock).toHaveBeenCalledTimes(1); // Still 1! Cache hit!
  });

  it('correctly diagnoses exhausted primary rate limits (remaining: 0)', async () => {
    const service = new GitHubService();
    const resetTimeEpoch = Math.floor(Date.now() / 1000) + 1800; // in 30 minutes

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      headers: new Headers({
        'x-ratelimit-limit': '60',
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': String(resetTimeEpoch),
      }),
      text: async () => JSON.stringify({
        message: 'API rate limit exceeded for 192.0.2.1',
        documentation_url: 'https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting',
      }),
    } as any);

    try {
      await service.getUserProfile('test_user');
      expect.fail('Expected GitHubApiError was not thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(GitHubApiError);
      expect(err.errorType).toBe('rate_limit_exceeded');
      expect(err.statusCode).toBe(403);
      expect(err.rateLimitInfo?.remaining).toBe(0);
      expect(err.rateLimitInfo?.limit).toBe(60);
      expect(err.rateLimitInfo?.isAuthenticated).toBe(false);
      expect(err.hint).toContain('Add a free GitHub Personal Access Token');
    }
  });

  it('correctly diagnoses secondary rate limits (abuse detection / Retry-After)', async () => {
    const service = new GitHubService();

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      headers: new Headers({
        'retry-after': '60',
        'x-ratelimit-remaining': '45',
      }),
      text: async () => JSON.stringify({
        message: 'You have exceeded a secondary rate limit. Please wait a few minutes before you try again.',
        documentation_url: 'https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits',
      }),
    } as any);

    try {
      await service.getUserProfile('rapid_search_user');
      expect.fail('Expected GitHubApiError was not thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(GitHubApiError);
      expect(err.errorType).toBe('secondary_rate_limit');
      expect(err.retryAfterSeconds).toBe(60);
      expect(err.message).toContain('secondary rate limit triggered');
    }
  });

  it('distinguishes permission errors from rate limit errors', async () => {
    const service = new GitHubService();

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      headers: new Headers({
        'x-ratelimit-limit': '5000',
        'x-ratelimit-remaining': '4990', // Plenty of rate limit remaining!
      }),
      text: async () => JSON.stringify({
        message: 'Resource not accessible by personal access token',
        documentation_url: 'https://docs.github.com/rest/overview/permissions-required-for-fine-grained-personal-access-tokens',
      }),
    } as any);

    try {
      await service.getUserProfile('enterprise_org');
      expect.fail('Expected GitHubApiError was not thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(GitHubApiError);
      expect(err.errorType).toBe('permission_denied'); // NOT rate_limit_exceeded!
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain('Resource not accessible');
      expect(err.hint).toContain('scope');
    }
  });

  it('distinguishes 401 bad credentials when invalid GITHUB_TOKEN is provided', async () => {
    const service = new GitHubService('ghp_invalid_expired_token_12345');

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers(),
      text: async () => JSON.stringify({
        message: 'Bad credentials',
      }),
    } as any);

    try {
      await service.getUserProfile('some_user');
      expect.fail('Expected GitHubApiError was not thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(GitHubApiError);
      expect(err.errorType).toBe('bad_credentials');
      expect(err.statusCode).toBe(401);
      expect(err.hint).toContain('Check or regenerate your token');
    }
  });

  it('handles 404 user not found with clear diagnostic message', async () => {
    const service = new GitHubService();

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Headers(),
      text: async () => JSON.stringify({
        message: 'Not Found',
      }),
    } as any);

    try {
      await service.getUserProfile('nonexistent_user_99999');
      expect.fail('Expected GitHubApiError was not thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(GitHubApiError);
      expect(err.errorType).toBe('not_found');
      expect(err.statusCode).toBe(404);
      expect(err.message).toContain("GitHub user 'nonexistent_user_99999' was not found");
    }
  });

  it('fetches language statistics on-demand and caches them per repository', async () => {
    const service = new GitHubService();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      json: async () => ({ TypeScript: 25000, CSS: 5000 }),
    } as any);

    global.fetch = fetchMock;

    const langs1 = await service.getRepositoryLanguages('facebook', 'react');
    expect(langs1).toEqual({ TypeScript: 25000, CSS: 5000 });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Call again -> cached, no additional HTTP request
    const langs2 = await service.getRepositoryLanguages('facebook', 'react');
    expect(langs2).toEqual({ TypeScript: 25000, CSS: 5000 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('Resume Parsing & Claim Separation', () => {
  const parser = new ResumeParserService();

  it('extracts self-reported skills from text and flags isVerifiedCodeEvidence as false', () => {
    const sampleResume = `
      JOHN DOE - Software Engineer
      SKILLS:
      Languages: Python, TypeScript, SQL
      Frameworks: React, Django, Express.js
      Tools: Docker, Git, CI/CD
    `;

    const result = parser.parsePlainText(sampleResume);

    expect(result.isVerifiedCodeEvidence).toBe(false);
    expect(result.extractedSkills).toContain('Python');
    expect(result.extractedSkills).toContain('TypeScript');
    expect(result.extractedSkills).toContain('React');
    expect(result.extractedSkills).toContain('Docker');
    expect(result.disclaimer).toContain('Resume skills represent self-reported claims');
  });

  it('handles empty or sparse resume text gracefully', () => {
    const result = parser.parsePlainText('');
    expect(result.extractedSkills.length).toBe(0);
    expect(result.isVerifiedCodeEvidence).toBe(false);
  });
});
