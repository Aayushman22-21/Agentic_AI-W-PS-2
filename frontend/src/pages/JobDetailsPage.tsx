import React from 'react';
import {
  ArrowLeft,
  ExternalLink,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  GitBranch,
} from 'lucide-react';
import { DiscoveredJob, PageView } from '../types';

interface JobDetailsPageProps {
  job: DiscoveredJob | null;
  onNavigate: (page: PageView) => void;
}

export const JobDetailsPage: React.FC<JobDetailsPageProps> = ({ job, onNavigate }) => {
  if (!job) {
    return (
      <div className="bg-white p-8 rounded-lg border border-slate-200 text-center">
        <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h2 className="text-base font-semibold text-slate-800">No Job Selected</h2>
        <p className="text-xs text-slate-500 mt-1">Please select a job from the discovery page.</p>
        <button
          onClick={() => onNavigate('jobs')}
          className="mt-4 px-3.5 py-1.5 bg-slate-900 text-white rounded text-xs font-medium"
        >
          Browse Jobs
        </button>
      </div>
    );
  }

  const explicitReqs = job.requirements.filter((r) => r.isExplicit);
  const inferredReqs = job.requirements.filter((r) => !r.isExplicit);

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate('jobs')}
          className="inline-flex items-center space-x-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Jobs</span>
        </button>

        <button
          onClick={() => onNavigate('github_repos')}
          className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          <GitBranch className="w-4 h-4" />
          <span>Select Repository & Assess Code</span>
        </button>
      </div>

      {/* Role Summary Card */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                {job.source}
              </span>
              {job.isRemote && (
                <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-medium">
                  Remote Eligible
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-2">{job.title}</h1>
            <p className="text-sm text-slate-600 font-medium mt-0.5">{job.company}</p>

            <div className="flex items-center space-x-2 text-xs text-slate-400 mt-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{job.location}</span>
              <span>•</span>
              <span className="font-mono">Updated: {new Date(job.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>

          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded bg-slate-50 hover:bg-slate-100 font-mono transition-colors"
            >
              <span>Original Job Posting</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Requirements Breakdown Card */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">Extracted Technical Requirements</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Normalized against our comprehensive skill taxonomy. Stated requirements are prioritized over inferred mentions.
          </p>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Explicit Requirements */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-semibold uppercase font-mono tracking-wider text-slate-800">
                Explicit Requirements ({explicitReqs.length})
              </h3>
            </div>
            <div className="space-y-2">
              {explicitReqs.map((req, i) => (
                <div
                  key={i}
                  className="bg-slate-50 border border-slate-200 p-2.5 rounded flex items-center justify-between"
                >
                  <span className="text-xs font-semibold text-slate-900">{req.skill}</span>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                    Explicit
                  </span>
                </div>
              ))}
              {explicitReqs.length === 0 && (
                <p className="text-xs text-slate-400 italic">No explicit requirement tags found.</p>
              )}
            </div>
          </div>

          {/* Inferred Requirements */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-semibold uppercase font-mono tracking-wider text-slate-800">
                Inferred Requirements ({inferredReqs.length})
              </h3>
            </div>
            <div className="space-y-2">
              {inferredReqs.map((req, i) => (
                <div
                  key={i}
                  className="bg-slate-50 border border-slate-200 p-2.5 rounded flex items-center justify-between"
                >
                  <span className="text-xs font-medium text-slate-700">{req.skill}</span>
                  <span className="text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                    Inferred
                  </span>
                </div>
              ))}
              {inferredReqs.length === 0 && (
                <p className="text-xs text-slate-400 italic">No additional inferred skills.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Raw Description Section */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h3 className="text-xs font-semibold uppercase font-mono tracking-wider text-slate-500 mb-2">
          Original Job Description
        </h3>
        <div className="bg-slate-50 p-4 rounded border border-slate-200 text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
          {job.rawDescription || 'No raw description available.'}
        </div>
      </div>
    </div>
  );
};
