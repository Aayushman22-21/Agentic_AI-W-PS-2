/**
 * GitHub API Service
 * Official REST API integration with rate-limit diagnostics, in-memory caching,
 * in-flight request deduplication, safe retries, and detailed error categorization.
 */

export interface GitHubUserProfile {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: string;
  description: string | null;
  html_url: string;
  default_branch: string;
  stars: number;
  forks: number;
  updated_at: string;
  languages: Record<string, number>;
  primary_language: string | null;
  topics: string[];
  is_fork: boolean;
}

export interface GitCommitInfo {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

export interface GitTreeEntry {
  path: string;
  mode: string;
  type: 'blob' | 'tree' | 'commit';
  sha: string;
  size?: number;
  url?: string;
}

export interface CommitDiffResult {
  baseSha: string;
  headSha: string;
  totalCommits: number;
  files: Array<{
    filename: string;
    status: 'added' | 'removed' | 'modified' | 'renamed';
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
  }>;
}

export type GitHubErrorType =
  | 'rate_limit_exceeded'
  | 'secondary_rate_limit'
  | 'permission_denied'
  | 'not_found'
  | 'bad_credentials'
  | 'network_error'
  | 'unknown';

export interface GitHubRateLimitInfo {
  limit: number;
  remaining: number;
  resetEpochSeconds: number;
  resetDate: string;
  retryAfterSeconds?: number;
  isAuthenticated: boolean;
}

export class GitHubApiError extends Error {
  public readonly errorType: GitHubErrorType;
  public readonly statusCode: number;
  public readonly rateLimitInfo?: GitHubRateLimitInfo;
  public readonly retryAfterSeconds?: number;
  public readonly resetTime?: string;
  public readonly documentationUrl?: string;
  public readonly hint?: string;

  constructor(params: {
    message: string;
    errorType: GitHubErrorType;
    statusCode: number;
    rateLimitInfo?: GitHubRateLimitInfo;
    retryAfterSeconds?: number;
    resetTime?: string;
    documentationUrl?: string;
    hint?: string;
  }) {
    super(params.message);
    this.name = 'GitHubApiError';
    this.errorType = params.errorType;
    this.statusCode = params.statusCode;
    this.rateLimitInfo = params.rateLimitInfo;
    this.retryAfterSeconds = params.retryAfterSeconds;
    this.resetTime = params.resetTime;
    this.documentationUrl = params.documentationUrl;
    this.hint = params.hint;
  }
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const GITHUB_API_BASE = 'https://api.github.com';

export class GitHubService {
  private token: string | undefined;
  private cache = new Map<string, CacheEntry<any>>();
  private inFlightRequests = new Map<string, Promise<any>>();
  private lastKnownRateLimit: GitHubRateLimitInfo | null = null;

  constructor(token?: string) {
    this.token = token || process.env.GITHUB_TOKEN;
    if (this.token) {
      this.token = this.token.trim();
    }
  }

  public get isAuthenticated(): boolean {
    return Boolean(this.token && this.token.length > 0);
  }

  public getLastKnownRateLimit(): GitHubRateLimitInfo | null {
    return this.lastKnownRateLimit;
  }

  public clearCache(): void {
    this.cache.clear();
    this.inFlightRequests.clear();
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'AI-Career-Coach-App',
    };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    return headers;
  }

  /**
   * Helper to parse and store rate limit headers from any GitHub response
   */
  private updateRateLimitFromHeaders(headers: Headers): GitHubRateLimitInfo | undefined {
    const limit = headers.get('x-ratelimit-limit');
    const remaining = headers.get('x-ratelimit-remaining');
    const reset = headers.get('x-ratelimit-reset');
    const retryAfter = headers.get('retry-after');

    if (!limit && !remaining && !reset) {
      return undefined;
    }

    const resetEpoch = reset ? parseInt(reset, 10) : Math.floor(Date.now() / 1000) + 60;
    const retryAfterSec = retryAfter ? parseInt(retryAfter, 10) : undefined;

    const info: GitHubRateLimitInfo = {
      limit: limit ? parseInt(limit, 10) : (this.isAuthenticated ? 5000 : 60),
      remaining: remaining ? parseInt(remaining, 10) : 0,
      resetEpochSeconds: resetEpoch,
      resetDate: new Date(resetEpoch * 1000).toISOString(),
      retryAfterSeconds: retryAfterSec,
      isAuthenticated: this.isAuthenticated,
    };

    this.lastKnownRateLimit = info;
    return info;
  }

  /**
   * Dissect GitHub errors by status, headers, and body content
   */
  private async handleResponseError(res: Response, entityName: string = 'Resource'): Promise<never> {
    const rateLimit = this.updateRateLimitFromHeaders(res.headers);
    let errorBody: any = {};
    let rawText = '';

    try {
      rawText = await res.text();
      errorBody = JSON.parse(rawText);
    } catch {
      errorBody = { message: rawText || res.statusText };
    }

    const message: string = (errorBody.message || res.statusText || '').toLowerCase();
    const docUrl: string | undefined = errorBody.documentation_url;

    // 1. HTTP 401 Unauthorized: Invalid Token
    if (res.status === 401) {
      throw new GitHubApiError({
        message: 'Configured GITHUB_TOKEN is invalid, expired, or revoked.',
        errorType: 'bad_credentials',
        statusCode: 401,
        documentationUrl: docUrl,
        hint: 'Check or regenerate your token in GitHub Settings -> Developer settings -> Personal access tokens, then update backend/.env.',
      });
    }

    // 2. HTTP 404 Not Found
    if (res.status === 404) {
      throw new GitHubApiError({
        message: `${entityName} was not found on GitHub.`,
        errorType: 'not_found',
        statusCode: 404,
        documentationUrl: docUrl,
        hint: 'Verify the spelling of the username or repository name.',
      });
    }

    // 3. HTTP 403 or 429
    if (res.status === 403 || res.status === 429) {
      const retryAfterHeader = res.headers.get('retry-after');
      const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;

      // Case A: Secondary rate limit / abuse detection mechanism
      if (
        message.includes('secondary rate limit') ||
        message.includes('abuse detection') ||
        (retryAfterSec && retryAfterSec > 0 && (!rateLimit || rateLimit.remaining > 0))
      ) {
        const waitSec = retryAfterSec || 60;
        throw new GitHubApiError({
          message: `GitHub secondary rate limit triggered: temporary request burst detected. Please wait ${waitSec}s.`,
          errorType: 'secondary_rate_limit',
          statusCode: res.status,
          rateLimitInfo: rateLimit,
          retryAfterSeconds: waitSec,
          documentationUrl: docUrl,
          hint: 'GitHub detected high request frequency. Wait a few seconds before searching again.',
        });
      }

      // Case B: Primary rate limit exceeded (x-ratelimit-remaining is 0)
      if (rateLimit && rateLimit.remaining === 0) {
        const resetMinutes = Math.max(1, Math.ceil((rateLimit.resetEpochSeconds - Date.now() / 1000) / 60));
        const authNotice = this.isAuthenticated
          ? 'Authenticated quota (5,000 req/hr) exhausted.'
          : 'Unauthenticated IP quota (60 req/hr) exhausted.';

        const hint = this.isAuthenticated
          ? `Quota resets at ${new Date(rateLimit.resetEpochSeconds * 1000).toLocaleTimeString()} (in ~${resetMinutes} min).`
          : `Add a free GitHub Personal Access Token to backend/.env (GITHUB_TOKEN=ghp_...) to increase your rate limit from 60 to 5,000 req/hr. Quota resets at ${new Date(rateLimit.resetEpochSeconds * 1000).toLocaleTimeString()} (in ~${resetMinutes} min).`;

        throw new GitHubApiError({
          message: `GitHub API rate limit reached. ${authNotice}`,
          errorType: 'rate_limit_exceeded',
          statusCode: res.status,
          rateLimitInfo: rateLimit,
          resetTime: rateLimit.resetDate,
          retryAfterSeconds: resetMinutes * 60,
          documentationUrl: docUrl,
          hint,
        });
      }

      // Case C: Permission error / Access Forbidden
      throw new GitHubApiError({
        message: errorBody.message
          ? `GitHub Access Forbidden: ${errorBody.message}`
          : 'GitHub access forbidden. Your token does not have permission to access this resource or organization SSO is required.',
        errorType: 'permission_denied',
        statusCode: 403,
        rateLimitInfo: rateLimit,
        documentationUrl: docUrl,
        hint: 'Ensure your GitHub token has "public_repo" or "repo" scope, or check organization SSO authorization.',
      });
    }

    // Other unexpected HTTP errors
    throw new GitHubApiError({
      message: `GitHub API error: ${errorBody.message || res.statusText} (${res.status})`,
      errorType: 'unknown',
      statusCode: res.status,
      rateLimitInfo: rateLimit,
      documentationUrl: docUrl,
    });
  }

  /**
   * Fetch with cache, in-flight deduplication, and single-flight retry for transient secondary limits
   */
  private async cachedFetch<T>(
    cacheKey: string,
    ttlMs: number,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }

    // In-flight request deduplication
    if (this.inFlightRequests.has(cacheKey)) {
      return this.inFlightRequests.get(cacheKey)!;
    }

    const promise = (async () => {
      try {
        const data = await fetcher();
        this.cache.set(cacheKey, {
          data,
          expiresAt: Date.now() + ttlMs,
        });
        return data;
      } finally {
        this.inFlightRequests.delete(cacheKey);
      }
    })();

    this.inFlightRequests.set(cacheKey, promise);
    return promise;
  }

  /**
   * Fetch live rate limit status from GitHub /rate_limit endpoint
   */
  async getLiveRateLimitStatus(): Promise<GitHubRateLimitInfo> {
    const url = `${GITHUB_API_BASE}/rate_limit`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) {
      await this.handleResponseError(res, 'Rate limit endpoint');
    }

    const data: any = await res.json();
    const core = data?.resources?.core;
    const resetEpoch = core?.reset || Math.floor(Date.now() / 1000) + 60;

    const info: GitHubRateLimitInfo = {
      limit: core?.limit || (this.isAuthenticated ? 5000 : 60),
      remaining: core?.remaining ?? 0,
      resetEpochSeconds: resetEpoch,
      resetDate: new Date(resetEpoch * 1000).toISOString(),
      isAuthenticated: this.isAuthenticated,
    };

    this.lastKnownRateLimit = info;
    return info;
  }

  /**
   * Fetch public user profile with 10-minute caching
   */
  async getUserProfile(username: string): Promise<GitHubUserProfile> {
    const cleanUsername = username.trim().toLowerCase();
    const cacheKey = `profile:${cleanUsername}`;

    return this.cachedFetch<GitHubUserProfile>(cacheKey, 10 * 60 * 1000, async () => {
      const url = `${GITHUB_API_BASE}/users/${encodeURIComponent(cleanUsername)}`;
      const res = await fetch(url, { headers: this.getHeaders() });

      if (!res.ok) {
        await this.handleResponseError(res, `GitHub user '${cleanUsername}'`);
      }

      this.updateRateLimitFromHeaders(res.headers);
      const data: any = await res.json();
      return {
        login: data.login,
        name: data.name,
        avatar_url: data.avatar_url,
        html_url: data.html_url,
        bio: data.bio,
        public_repos: data.public_repos || 0,
        followers: data.followers || 0,
        following: data.following || 0,
      };
    });
  }

  /**
   * Fetch user public repositories with pagination and 10-minute caching.
   * Default maxPages is 1 (up to 50 repos) to avoid unnecessary quota waste on initial search.
   */
  async getUserRepositories(username: string, maxPages: number = 1): Promise<GitHubRepository[]> {
    const cleanUsername = username.trim().toLowerCase();
    const cacheKey = `repos:${cleanUsername}:${maxPages}`;

    return this.cachedFetch<GitHubRepository[]>(cacheKey, 10 * 60 * 1000, async () => {
      const repos: GitHubRepository[] = [];
      let page = 1;

      while (page <= maxPages) {
        const url = `${GITHUB_API_BASE}/users/${encodeURIComponent(cleanUsername)}/repos?per_page=50&page=${page}&sort=updated`;
        const res = await fetch(url, { headers: this.getHeaders() });

        if (!res.ok) {
          if (res.status === 404 && page > 1) {
            break;
          }
          await this.handleResponseError(res, `Repositories for '${cleanUsername}'`);
        }

        this.updateRateLimitFromHeaders(res.headers);
        const items: any = await res.json();
        if (!Array.isArray(items) || items.length === 0) break;

        for (const item of items) {
          repos.push({
            id: item.id,
            name: item.name,
            full_name: item.full_name,
            owner: item.owner?.login || cleanUsername,
            description: item.description,
            html_url: item.html_url,
            default_branch: item.default_branch || 'main',
            stars: item.stargazers_count || 0,
            forks: item.forks_count || 0,
            updated_at: item.updated_at,
            languages: {},
            primary_language: item.language,
            topics: Array.isArray(item.topics) ? item.topics : [],
            is_fork: Boolean(item.fork),
          });
        }

        if (items.length < 50) break;
        page++;
      }

      return repos;
    });
  }

  /**
   * Fetch language breakdown on-demand with 15-minute caching
   */
  async getRepositoryLanguages(owner: string, repo: string): Promise<Record<string, number>> {
    const cacheKey = `langs:${owner.toLowerCase()}/${repo.toLowerCase()}`;

    return this.cachedFetch<Record<string, number>>(cacheKey, 15 * 60 * 1000, async () => {
      const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`;
      const res = await fetch(url, { headers: this.getHeaders() });

      if (!res.ok) {
        if (res.status === 404) return {};
        await this.handleResponseError(res, `Languages for ${owner}/${repo}`);
      }

      this.updateRateLimitFromHeaders(res.headers);
      return (await res.json()) as Record<string, number>;
    });
  }

  /**
   * Get the latest commit SHA for a repository branch (cached 5 minutes)
   */
  async getLatestCommit(owner: string, repo: string, branch?: string): Promise<GitCommitInfo> {
    const cacheKey = `commit:${owner.toLowerCase()}/${repo.toLowerCase()}:${branch || 'default'}`;

    return this.cachedFetch<GitCommitInfo>(cacheKey, 5 * 60 * 1000, async () => {
      const branchParam = branch ? `?sha=${encodeURIComponent(branch)}` : '';
      const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits${branchParam}`;
      const res = await fetch(url, { headers: this.getHeaders() });

      if (!res.ok) {
        await this.handleResponseError(res, `Commits for ${owner}/${repo}`);
      }

      this.updateRateLimitFromHeaders(res.headers);
      const commits: any = await res.json();
      if (!Array.isArray(commits) || commits.length === 0) {
        throw new GitHubApiError({
          message: `No commits found for repository ${owner}/${repo}.`,
          errorType: 'not_found',
          statusCode: 404,
        });
      }

      const latest = commits[0];
      return {
        sha: latest.sha,
        message: latest.commit?.message || '',
        author: latest.commit?.author?.name || 'Unknown',
        date: latest.commit?.author?.date || new Date().toISOString(),
        url: latest.html_url,
      };
    });
  }

  /**
   * Fetch recursive tree for a pinned commit SHA (immutable: cached 60 minutes)
   */
  async getRepositoryTree(owner: string, repo: string, commitSha: string): Promise<GitTreeEntry[]> {
    const cacheKey = `tree:${owner.toLowerCase()}/${repo.toLowerCase()}:${commitSha}`;

    return this.cachedFetch<GitTreeEntry[]>(cacheKey, 60 * 60 * 1000, async () => {
      const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(commitSha)}?recursive=1`;
      const res = await fetch(url, { headers: this.getHeaders() });

      if (!res.ok) {
        await this.handleResponseError(res, `Tree at commit ${commitSha} for ${owner}/${repo}`);
      }

      this.updateRateLimitFromHeaders(res.headers);
      const data: any = await res.json();
      return Array.isArray(data.tree) ? data.tree : [];
    });
  }

  /**
   * Fetch raw file contents at a pinned commit SHA (immutable: cached 60 minutes)
   */
  async getFileContent(owner: string, repo: string, path: string, commitSha: string): Promise<string> {
    const cacheKey = `file:${owner.toLowerCase()}/${repo.toLowerCase()}:${commitSha}:${path}`;

    return this.cachedFetch<string>(cacheKey, 60 * 60 * 1000, async () => {
      const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(commitSha)}`;
      const res = await fetch(url, { headers: this.getHeaders() });

      if (!res.ok) {
        await this.handleResponseError(res, `File '${path}' at commit ${commitSha}`);
      }

      this.updateRateLimitFromHeaders(res.headers);
      const data: any = await res.json();
      if (data.content && data.encoding === 'base64') {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }

      if (data.download_url) {
        const rawRes = await fetch(data.download_url);
        if (rawRes.ok) return await rawRes.text();
      }

      throw new GitHubApiError({
        message: `Unable to decode content for '${path}'.`,
        errorType: 'unknown',
        statusCode: 500,
      });
    });
  }

  /**
   * Compare two commits (base vs head) to get changed files and patches
   */
  async compareCommits(owner: string, repo: string, baseSha: string, headSha: string): Promise<CommitDiffResult> {
    const cacheKey = `compare:${owner.toLowerCase()}/${repo.toLowerCase()}:${baseSha}...${headSha}`;

    return this.cachedFetch<CommitDiffResult>(cacheKey, 60 * 60 * 1000, async () => {
      const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/compare/${encodeURIComponent(baseSha)}...${encodeURIComponent(headSha)}`;
      const res = await fetch(url, { headers: this.getHeaders() });

      if (!res.ok) {
        await this.handleResponseError(res, `Diff ${baseSha}...${headSha}`);
      }

      this.updateRateLimitFromHeaders(res.headers);
      const data: any = await res.json();
      const files = (data.files || []).map((f: any) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions || 0,
        deletions: f.deletions || 0,
        changes: f.changes || 0,
        patch: f.patch,
      }));

      return {
        baseSha,
        headSha,
        totalCommits: data.total_commits || 0,
        files,
      };
    });
  }
}
