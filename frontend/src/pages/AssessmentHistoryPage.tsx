import React, { useState } from 'react';
import {
  History,
  GitCommit,
  ArrowRight,
  TrendingUp,
  FileCode2,
  Calendar,
} from 'lucide-react';
import { StoredAssessment, PageView } from '../types';

interface AssessmentHistoryPageProps {
  assessments: StoredAssessment[];
  onSelectAssessment: (asmt: StoredAssessment) => void;
  onNavigate: (page: PageView) => void;
}

export const AssessmentHistoryPage: React.FC<AssessmentHistoryPageProps> = ({
  assessments,
  onSelectAssessment,
  onNavigate,
}) => {
  const [selectedAsmtId, setSelectedAsmtId] = useState<string>(
    assessments[0]?.id || ''
  );

  if (assessments.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg border border-slate-200 text-center">
        <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h2 className="text-base font-semibold text-slate-800">No Assessment History Available</h2>
        <p className="text-xs text-slate-500 mt-1">Run an assessment or push a commit to generate versioned history.</p>
        <button
          onClick={() => onNavigate('jobs')}
          className="mt-4 px-3.5 py-1.5 bg-slate-900 text-white rounded text-xs font-medium"
        >
          Select Target Job
        </button>
      </div>
    );
  }

  const selectedAssessment = assessments.find((a) => a.id === selectedAsmtId) || assessments[0];

  // Find previous version for comparison
  const previousAssessment = assessments.find(
    (a) =>
      a.jobId === selectedAssessment.jobId &&
      a.repositoryId === selectedAssessment.repositoryId &&
      a.version === selectedAssessment.version - 1
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Assessment History & Code-Change Evolution</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Track portfolio progression over time. Each version is permanently pinned to a GitHub commit SHA,
            recording exact diffs when new code is pushed and re-evaluated.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Version Timeline */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase font-mono tracking-wider text-slate-500">
            Version Timeline ({assessments.length} total)
          </h2>

          <div className="space-y-2">
            {assessments.map((asmt) => {
              const isSelected = asmt.id === selectedAssessment.id;
              return (
                <div
                  key={asmt.id}
                  onClick={() => setSelectedAsmtId(asmt.id)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-emerald-600 ring-1 ring-emerald-600 bg-emerald-50/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-slate-900">
                      Version v{asmt.version}
                    </span>
                    <span className="text-sm font-bold font-mono text-emerald-600">
                      {asmt.matchScore.overallDemonstratedPct}%
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-medium truncate mt-1">
                    {asmt.repositoryFullName}
                  </p>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span className="flex items-center space-x-1">
                      <GitCommit className="w-3 h-3 text-slate-400" />
                      <span>{asmt.commitSha.substring(0, 7)}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{new Date(asmt.createdAt).toLocaleDateString()}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 2 Columns: Version Details & Diff against previous version */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold uppercase">
                  Version v{selectedAssessment.version} Inspection
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedAssessment.repositoryFullName}</h3>
                <p className="text-xs text-slate-500 font-mono">
                  Pinned Commit SHA: <span className="text-slate-800 font-semibold">{selectedAssessment.commitSha}</span>
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 font-mono block">Demonstrated Score</span>
                <span className="text-3xl font-black text-emerald-600 font-mono">
                  {selectedAssessment.matchScore.overallDemonstratedPct}%
                </span>
              </div>
            </div>

            {/* Change Comparison against previous version */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold font-mono uppercase text-slate-800 tracking-wider">
                  Comparison with Previous Assessment
                </h4>
              </div>

              {previousAssessment ? (
                <div className="space-y-2 text-xs font-mono">
                  <p className="text-slate-700">
                    Comparing <strong>v{selectedAssessment.version}</strong> ({selectedAssessment.commitSha.substring(0, 7)}) with{' '}
                    <strong>v{previousAssessment.version}</strong> ({previousAssessment.commitSha.substring(0, 7)}):
                  </p>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-white p-2.5 rounded border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">Previous Score (v{previousAssessment.version})</span>
                      <span className="text-base font-bold text-slate-700 font-mono">
                        {previousAssessment.matchScore.overallDemonstratedPct}%
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">Latest Score (v{selectedAssessment.version})</span>
                      <span className="text-base font-bold text-emerald-600 font-mono">
                        {selectedAssessment.matchScore.overallDemonstratedPct}%
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 pt-1">
                    {selectedAssessment.matchScore.scoreExplanation}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 font-mono">
                  This is the initial baseline assessment (v1). Future push webhooks or commit reassessments will display automated diff comparisons here.
                </p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() => {
                  onSelectAssessment(selectedAssessment);
                  onNavigate('assessment');
                }}
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                <span>View Full Skill Matrix</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  onSelectAssessment(selectedAssessment);
                  onNavigate('evidence');
                }}
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900"
              >
                <FileCode2 className="w-3.5 h-3.5" />
                <span>View Cited Code Lines</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
