import React, { useState, useEffect } from 'react';
import {
  Search,
  GitBranch,
  Star,
  GitFork,
  ExternalLink,
  Code,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  AlertCircle,
  RefreshCw,
  Clock,
  KeyRound,
  Shield,
  HelpCircle,
} from 'lucide-react';
import {
  DiscoveredJob,
  GitHubRepository,
  GitHubUserProfile,
  StoredAssessment,
  PageView,
  GitHubRateLimitInfo,
} from '../types';
import { api, GitHubClientError } from '../services/api';

interface RepoSelectionPageProps {
  activeJob: DiscoveredJob | null;
  onAssessmentCompleted: (asmt: StoredAssessment) => void;
  onNavigate: (page: PageView) => void;
}

export const RepoSelectionPage: React.FC<RepoSelectionPageProps> = ({
  activeJob,
  onAssessmentCompleted,
  onNavigate,
}) => {
  const [username, setUsername] = useState('facebook');
  const [profile, setProfile] = useState<GitHubUserProfile | null>(null);
  const [repos, setRepos] = useState<GitHubRepository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepository | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAssessing, setIsAssessing] = useState(false);
  const [errorDetail, setErrorDetail] = useState<GitHubClientError | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<GitHubRateLimitInfo | null>(null);

  // Load rate limit quota on mount
  const refreshRateLimit = async () => {
    try {
      const info = await api.getGitHubRateLimitStatus();
      setRateLimitInfo(info);
    } catch {
      // Ignore initial background quota check failure
    }
  };

  useEffect(() => {
    refreshRateLimit();
  }, []);

  const handleFetchUser = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    setErrorDetail(null);

    try {
      const userProfile = await api.getGitHubProfile(username.trim());
      setProfile(userProfile);

      const userRepos = await api.getGitHubRepos(username.trim(), 1);
      setRepos(userRepos);
      if (userRepos.length > 0) {
        setSelectedRepo(userRepos[0]);
        setSelectedBranch(userRepos[0].default_branch);
      }
      refreshRateLimit();
    } catch (err: any) {
      if (err instanceof GitHubClientError) {
        setErrorDetail(err);
        if (err.rateLimit) {
          setRateLimitInfo(err.rateLimit);
        }
      } else {
        setErrorMessage(err.message || 'Failed to fetch GitHub data');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunAssessment = async () => {
    if (!activeJob) {
      alert('Please select a target job first.');
      onNavigate('jobs');
      return;
    }
    if (!selectedRepo) {
      alert('Please select a GitHub repository.');
      return;
    }

    setIsAssessing(true);
    setErrorMessage(null);
    setErrorDetail(null);
    try {
      const assessment = await api.runAssessment({
        jobId: activeJob.id,
        owner: selectedRepo.owner,
        repoName: selectedRepo.name,
        branch: selectedBranch || selectedRepo.default_branch,
      });

      onAssessmentCompleted(assessment);
      onNavigate('assessment');
    } catch (err: any) {
      if (err instanceof GitHubClientError) {
        setErrorDetail(err);
      } else {
        setErrorMessage(`Assessment failed: ${err.message}`);
      }
    } finally {
      setIsAssessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">GitHub Repository Discovery & Selection</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Inspect public GitHub repositories, retrieve language statistics, and pin your evaluation to a verifiable
            commit SHA. Language statistics and stars provide context, while code analysis provides verifiable proof.
          </p>
        </div>

        {activeJob ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded p-2.5 text-xs text-right">
            <span className="text-emerald-700 font-semibold block">Target Job Selected</span>
            <span className="text-slate-800 font-medium">{activeJob.title}</span>
            <span className="text-slate-500 block">({activeJob.requirements.length} requirements)</span>
          </div>
        ) : (
          <button
            onClick={() => onNavigate('jobs')}
            className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded hover:bg-emerald-100"
          >
            ← Select a Target Job First
          </button>
        )}
      </div>

      {/* Rate Limit Diagnostic Quota Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center space-x-2">
          {rateLimitInfo?.isAuthenticated ? (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
              <KeyRound className="w-3 h-3" />
              <span>Authenticated (GITHUB_TOKEN)</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold border border-slate-300">
              <Shield className="w-3 h-3 text-slate-500" />
              <span>Unauthenticated IP</span>
            </span>
          )}

          {rateLimitInfo && (
            <span className="text-slate-700">
              API Quota:{' '}
              <strong
                className={
                  rateLimitInfo.remaining === 0
                    ? 'text-red-600'
                    : rateLimitInfo.remaining < 15
                    ? 'text-amber-600'
                    : 'text-emerald-700'
                }
              >
                {rateLimitInfo.remaining} / {rateLimitInfo.limit}
              </strong>{' '}
              req/hr remaining
            </span>
          )}
        </div>

        <div className="flex items-center space-x-3 text-slate-500 text-[11px]">
          {rateLimitInfo?.resetDate && (
            <span className="flex items-center space-x-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Resets: {new Date(rateLimitInfo.resetDate).toLocaleTimeString()}</span>
            </span>
          )}

          {!rateLimitInfo?.isAuthenticated && (
            <button
              onClick={() => onNavigate('settings')}
              className="text-emerald-700 hover:text-emerald-800 underline font-sans text-xs"
            >
              How to add GITHUB_TOKEN (5,000 req/hr)
            </button>
          )}

          <button
            onClick={refreshRateLimit}
            title="Refresh quota status"
            className="text-slate-500 hover:text-slate-700 p-1 rounded"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* GitHub Username Input Form */}
      <form onSubmit={handleFetchUser} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            required
            placeholder="Enter public GitHub username or organization (e.g., vercel, facebook, octocat)..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 text-slate-900 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center space-x-2"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
          <span>Fetch Repositories</span>
        </button>
      </form>

      {/* Actionable Error Banner with Safe Retry & Clear Diagnostic Messaging */}
      {errorDetail && (
        <div
          className={`p-4 rounded-lg border text-xs space-y-2 ${
            errorDetail.errorType === 'rate_limit_exceeded'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : errorDetail.errorType === 'secondary_rate_limit'
              ? 'bg-orange-50 border-orange-200 text-orange-900'
              : errorDetail.errorType === 'permission_denied'
              ? 'bg-red-50 border-red-200 text-red-900'
              : errorDetail.errorType === 'bad_credentials'
              ? 'bg-red-50 border-red-200 text-red-900'
              : errorDetail.errorType === 'not_found'
              ? 'bg-slate-100 border-slate-200 text-slate-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start space-x-2.5">
              {errorDetail.errorType === 'permission_denied' || errorDetail.errorType === 'bad_credentials' ? (
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              ) : errorDetail.errorType === 'not_found' ? (
                <HelpCircle className="w-4 h-4 shrink-0 text-slate-500 mt-0.5" />
              ) : (
                <Clock className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              )}
              <div>
                <span className="font-bold block uppercase tracking-wider text-[11px]">
                  {errorDetail.errorType === 'rate_limit_exceeded'
                    ? 'Primary Rate Limit Exceeded'
                    : errorDetail.errorType === 'secondary_rate_limit'
                    ? 'Secondary Rate Limit (Burst Frequency)'
                    : errorDetail.errorType === 'permission_denied'
                    ? 'Access Forbidden / Permission Denied'
                    : errorDetail.errorType === 'bad_credentials'
                    ? 'Authentication Failed (Bad GITHUB_TOKEN)'
                    : errorDetail.errorType === 'not_found'
                    ? 'User or Repository Not Found'
                    : 'GitHub API Notice'}
                </span>
                <p className="mt-0.5">{errorDetail.message}</p>
                {errorDetail.hint && (
                  <p className="text-[11px] opacity-90 mt-1 font-mono">{errorDetail.hint}</p>
                )}
              </div>
            </div>

            {/* Retry Button */}
            {errorDetail.errorType !== 'not_found' && (
              <button
                onClick={() => handleFetchUser()}
                disabled={isLoading}
                className="shrink-0 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 px-3 py-1.5 rounded font-medium shadow-sm transition-colors inline-flex items-center space-x-1.5 text-xs"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Retry Search</span>
              </button>
            )}
          </div>
        </div>
      )}

      {errorMessage && !errorDetail && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => handleFetchUser()}
            className="text-xs underline font-medium text-red-800 hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Profile Overview (Preserved on Error) */}
      {profile && (
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center space-x-4">
          <img
            src={profile.avatar_url}
            alt={profile.login}
            className="w-12 h-12 rounded-full border border-slate-200"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-slate-900">{profile.name || profile.login}</h3>
              <a
                href={profile.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-400 hover:text-slate-600 font-mono"
              >
                @{profile.login}
              </a>
            </div>
            {profile.bio && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{profile.bio}</p>}
            <div className="flex items-center space-x-4 text-xs text-slate-400 mt-1 font-mono">
              <span>{profile.public_repos} public repos</span>
              <span>•</span>
              <span>{profile.followers} followers</span>
            </div>
          </div>
        </div>
      )}

      {/* Repositories Grid & Selection (Preserved on Error) */}
      {repos.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase font-mono tracking-wider text-slate-700">
              Select Repository for Code Evidence Assessment ({repos.length})
            </h2>
            {selectedRepo && (
              <button
                disabled={isAssessing}
                onClick={handleRunAssessment}
                className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 shadow-sm"
              >
                {isAssessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Pinned Commit...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Assess {selectedRepo.name}</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {repos.map((repo) => {
              const isSelected = selectedRepo?.id === repo.id;
              return (
                <div
                  key={repo.id}
                  onClick={() => {
                    setSelectedRepo(repo);
                    setSelectedBranch(repo.default_branch);
                  }}
                  className={`bg-white rounded-lg border p-5 shadow-sm cursor-pointer transition-all ${
                    isSelected
                      ? 'border-emerald-600 ring-1 ring-emerald-600 bg-emerald-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2 min-w-0">
                      <Code className="w-4 h-4 text-slate-500 shrink-0" />
                      <h4 className="text-xs font-semibold text-slate-900 truncate" title={repo.name}>
                        {repo.name}
                      </h4>
                    </div>
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-slate-400 hover:text-slate-600 ml-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 h-8">
                    {repo.description || 'No description provided.'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
                    <div className="flex items-center space-x-3">
                      {repo.primary_language && (
                        <span className="text-emerald-700 font-semibold">{repo.primary_language}</span>
                      )}
                      <span className="flex items-center space-x-1">
                        <Star className="w-3 h-3 text-amber-500" />
                        <span>{repo.stars}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <GitFork className="w-3 h-3 text-slate-400" />
                        <span>{repo.forks}</span>
                      </span>
                    </div>

                    <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      {repo.default_branch}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
