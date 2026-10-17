import React from 'react';
import {
  Briefcase,
  GitBranch,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  History,
  Terminal,
  Compass,
} from 'lucide-react';

import { DiscoveredJob, StoredAssessment, PageView } from '../types';

interface DashboardPageProps {
  jobs: DiscoveredJob[];
  assessments: StoredAssessment[];
  onNavigate: (page: PageView) => void;
  onSelectJob: (job: DiscoveredJob) => void;
  onSelectAssessment: (asmt: StoredAssessment) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  jobs,
  assessments,
  onNavigate,
  onSelectJob,
  onSelectAssessment,
}) => {
  const latestAssessment = assessments[0];
  const uniqueRepos = Array.from(new Set(assessments.map((a) => a.repositoryFullName)));
  const avgScore =
    assessments.length > 0
      ? Math.round(
          assessments.reduce((acc, curr) => acc + curr.matchScore.overallDemonstratedPct, 0) /
            assessments.length
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">AI Career Coach Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Evaluate authentic GitHub portfolios against real job requirements. Every technical skill is verified
            with exact source citations, commit SHAs, and line ranges.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigate('roadmap')}
            className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
          >
            <Compass className="w-4 h-4 text-indigo-200" />
            <span>Career Roadmap</span>
          </button>
          <button
            onClick={() => onNavigate('jobs')}
            className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <Briefcase className="w-4 h-4" />
            <span>Discover Real Jobs</span>
          </button>
          <button
            onClick={() => onNavigate('github_repos')}
            className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <GitBranch className="w-4 h-4" />
            <span>Connect GitHub</span>
          </button>
        </div>
      </div>


      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Jobs In Scope</span>
            <Briefcase className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">{jobs.length}</div>
          <p className="text-xs text-slate-400 mt-1">Live board listings and custom targets</p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Assessed Repos</span>
            <GitBranch className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">{uniqueRepos.length}</div>
          <p className="text-xs text-slate-400 mt-1">Repositories evaluated at pinned commits</p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Assessments Run</span>
            <History className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">{assessments.length}</div>
          <p className="text-xs text-slate-400 mt-1">Historical versioned evaluations stored</p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Avg Code Coverage</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 font-mono">{avgScore}%</div>
          <p className="text-xs text-slate-400 mt-1">Weighted code evidence coverage</p>
        </div>
      </div>

      {/* Main Grid: Latest Assessment vs Active Target Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Latest Assessment Overview */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Latest Portfolio Assessment</h2>
              <p className="text-xs text-slate-500 mt-0.5">Most recent code-verified portfolio evaluation</p>
            </div>
            {latestAssessment && (
              <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded border border-slate-200">
                Version v{latestAssessment.version}
              </span>
            )}
          </div>

          <div className="p-6 flex-1">
            {latestAssessment ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-xs text-slate-500 uppercase font-mono tracking-wider">Target Job & Repo</span>
                    <h3 className="text-sm font-semibold text-slate-900 mt-0.5">{latestAssessment.repositoryFullName}</h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">Commit: {latestAssessment.commitSha.substring(0, 7)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 uppercase font-mono tracking-wider">Demonstrated Score</span>
                    <div className="text-3xl font-extrabold text-emerald-600 font-mono">
                      {latestAssessment.matchScore.overallDemonstratedPct}%
                    </div>
                  </div>
                </div>

                {/* Score breakdown pills */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-emerald-50 border border-emerald-200 rounded p-3">
                    <span className="text-xs text-emerald-700 font-medium block">Demonstrated</span>
                    <span className="text-xl font-bold text-emerald-800 font-mono">
                      {latestAssessment.matchScore.demonstratedCount}
                    </span>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded p-3">
                    <span className="text-xs text-amber-700 font-medium block">Partial Usage</span>
                    <span className="text-xl font-bold text-amber-800 font-mono">
                      {latestAssessment.matchScore.partiallyDemonstratedCount}
                    </span>
                  </div>
                  <div className="bg-slate-100 border border-slate-200 rounded p-3">
                    <span className="text-xs text-slate-600 font-medium block">Missing In Scope</span>
                    <span className="text-xl font-bold text-slate-800 font-mono">
                      {latestAssessment.matchScore.notDemonstratedCount}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded border border-slate-200 font-mono">
                  {latestAssessment.matchScore.scoreExplanation}
                </p>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => {
                      onSelectAssessment(latestAssessment);
                      onNavigate('assessment');
                    }}
                    className="inline-flex items-center space-x-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800"
                  >
                    <span>Inspect Full Assessment</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      onSelectAssessment(latestAssessment);
                      onNavigate('evidence');
                    }}
                    className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-700 hover:text-slate-900"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>View Cited Code Lines</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-700">No Assessments Run Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Select a job requirement and a public GitHub repository to perform your first code evidence analysis.
                </p>
                <button
                  onClick={() => onNavigate('jobs')}
                  className="mt-4 inline-flex items-center space-x-1.5 bg-slate-900 text-white px-3.5 py-2 rounded text-xs font-medium hover:bg-slate-800"
                >
                  <span>Select Target Job</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Target Jobs */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Target Roles</h2>
            <button
              onClick={() => onNavigate('jobs')}
              className="text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Browse all
            </button>
          </div>

          <div className="p-4 flex-1 divide-y divide-slate-100 overflow-y-auto max-h-[380px]">
            {jobs.length > 0 ? (
              jobs.map((job) => (
                <div key={job.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 hover:text-emerald-600 cursor-pointer"
                        onClick={() => {
                          onSelectJob(job);
                          onNavigate('job_details');
                        }}
                      >
                        {job.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">{job.company} • {job.location}</p>
                    </div>
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 uppercase">
                      {job.source}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {job.requirements.slice(0, 4).map((r, i) => (
                      <span key={i} className="text-[10px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                        {r.skill}
                      </span>
                    ))}
                    {job.requirements.length > 4 && (
                      <span className="text-[10px] text-slate-400">+{job.requirements.length - 4} more</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">No jobs loaded.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
