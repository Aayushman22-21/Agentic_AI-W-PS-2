import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  XCircle,
  FileCode2,
  Sparkles,
  Info,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { StoredAssessment, PageView, AssessmentStatus } from '../types';

interface SkillAssessmentPageProps {
  assessment: StoredAssessment | null;
  onNavigate: (page: PageView) => void;
  onSelectSkillForEvidence: (skillName: string) => void;
}

export const SkillAssessmentPage: React.FC<SkillAssessmentPageProps> = ({
  assessment,
  onNavigate,
  onSelectSkillForEvidence,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');

  if (!assessment) {
    return (
      <div className="bg-white p-8 rounded-lg border border-slate-200 text-center">
        <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h2 className="text-base font-semibold text-slate-800">No Assessment Loaded</h2>
        <p className="text-xs text-slate-500 mt-1">Select a target job and repository to generate a code evidence evaluation.</p>
        <button
          onClick={() => onNavigate('jobs')}
          className="mt-4 px-3.5 py-1.5 bg-slate-900 text-white rounded text-xs font-medium"
        >
          Go to Job Discovery
        </button>
      </div>
    );
  }

  const { matchScore, assessedSkills } = assessment;

  const filteredSkills = assessedSkills.filter((s) => {
    if (filterStatus === 'all') return true;
    return s.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              Version v{assessment.version}
            </span>
            <span className="text-xs font-mono text-slate-500">
              Commit: <code className="text-emerald-700 font-semibold">{assessment.commitSha.substring(0, 7)}</code>
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">{assessment.repositoryFullName}</h1>
          <p className="text-xs text-slate-500 font-mono">Assessed on {new Date(assessment.createdAt).toLocaleString()}</p>
        </div>

        <button
          onClick={() => onNavigate('evidence')}
          className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          <FileCode2 className="w-4 h-4 text-emerald-400" />
          <span>Open Evidence Explorer</span>
        </button>
      </div>

      {/* Match Score & Transparent Calculation Banner */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
              Demonstrated Code Match Score
            </span>
            <div className="flex items-baseline space-x-3 mt-1">
              <span className="text-4xl font-black text-emerald-600 font-mono">
                {matchScore.overallDemonstratedPct}%
              </span>
              <span className="text-xs text-slate-500">
                ({matchScore.demonstratedCount} full + {matchScore.partiallyDemonstratedCount} partial of {matchScore.totalRequirementsCount} requirements)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="bg-emerald-50 border border-emerald-200 rounded p-2">
              <span className="text-emerald-700 font-bold block">{matchScore.demonstratedCount}</span>
              <span className="text-emerald-600 text-[10px]">Demonstrated</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded p-2">
              <span className="text-amber-700 font-bold block">{matchScore.partiallyDemonstratedCount}</span>
              <span className="text-amber-600 text-[10px]">Partial</span>
            </div>
            <div className="bg-slate-100 border border-slate-200 rounded p-2">
              <span className="text-slate-700 font-bold block">{matchScore.notDemonstratedCount}</span>
              <span className="text-slate-500 text-[10px]">Missing</span>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded p-2">
              <span className="text-blue-700 font-bold block">{matchScore.needsReviewCount}</span>
              <span className="text-blue-600 text-[10px]">Review</span>
            </div>
          </div>
        </div>

        {/* Transparent Score Explanation */}
        <div className="bg-slate-50 p-3.5 rounded border border-slate-200 text-xs text-slate-700 space-y-2 font-mono">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{matchScore.scoreExplanation}</p>
          </div>
          <div className="flex items-start space-x-2 text-slate-500 text-[11px] pt-1 border-t border-slate-200">
            <span className="font-semibold text-amber-700 shrink-0">Disclaimer:</span>
            <span>{matchScore.hiringDisclaimer}</span>
          </div>
        </div>
      </div>

      {/* Bonus Skills Found in Portfolio */}
      {matchScore.portfolioBonusSkills.length > 0 && (
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="text-xs font-semibold text-emerald-900 block">Bonus Portfolio Skills (Not in Target Job)</span>
              <p className="text-[11px] text-emerald-700">
                Skills identified in your code/topics that demonstrate versatility beyond the selected role:
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {matchScore.portfolioBonusSkills.map((s, i) => (
              <span key={i} className="text-[10px] font-mono bg-white text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-medium">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Skills Assessment List with Filter Tabs */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-1">
            {[
              { id: 'all', label: 'All Skills' },
              { id: 'demonstrated', label: 'Demonstrated' },
              { id: 'partially_demonstrated', label: 'Partially Demonstrated' },
              { id: 'not_demonstrated_in_scope', label: 'Missing in Scope' },
              { id: 'needs_review', label: 'Needs Review' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  filterStatus === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-400 font-mono">Showing {filteredSkills.length} items</span>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredSkills.map((skillItem, index) => {
            const statusConfig: Record<
              AssessmentStatus,
              { bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
            > = {
              demonstrated: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', icon: CheckCircle2 },
              partially_demonstrated: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', icon: AlertCircle },
              not_demonstrated_in_scope: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', icon: XCircle },
              needs_review: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', icon: HelpCircle },
            };

            const conf = statusConfig[skillItem.status];
            const Icon = conf.icon;

            return (
              <div key={index} className="p-5 hover:bg-slate-50/50 transition-colors space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <div className={`p-1 rounded ${conf.bg} ${conf.text} border ${conf.border}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{skillItem.skill}</h3>
                      <span className="text-[10px] font-mono text-slate-400">
                        {skillItem.isExplicitRequirement ? 'Explicitly required' : 'Inferred requirement'} • Confidence: {skillItem.confidence}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-mono uppercase px-2.5 py-0.5 rounded border font-semibold ${conf.bg} ${conf.text} ${conf.border}`}
                  >
                    {skillItem.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed font-mono bg-slate-50 p-2.5 rounded border border-slate-200">
                  {skillItem.explanation}
                </p>

                {/* Evidence citations count and link */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pt-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-500 font-mono">
                      Citations: <strong className="text-slate-800">{skillItem.evidence.length} validated line ranges</strong>
                    </span>
                    {skillItem.evidence.length > 0 && (
                      <button
                        onClick={() => {
                          onSelectSkillForEvidence(skillItem.skill);
                          onNavigate('evidence');
                        }}
                        className="inline-flex items-center space-x-1 text-emerald-700 hover:text-emerald-800 font-semibold"
                      >
                        <span>Inspect in Code Viewer</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">Next Step:</span> {skillItem.recommendedNextStep}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
