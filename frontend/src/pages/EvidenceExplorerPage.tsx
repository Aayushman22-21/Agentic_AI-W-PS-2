import React, { useState } from 'react';
import {
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  GitCommit,
  Filter,
} from 'lucide-react';
import { StoredAssessment, PageView, CodeEvidenceCitation } from '../types';

interface EvidenceExplorerPageProps {
  assessment: StoredAssessment | null;
  selectedSkillFilter?: string | null;
  onNavigate: (page: PageView) => void;
}

export const EvidenceExplorerPage: React.FC<EvidenceExplorerPageProps> = ({
  assessment,
  selectedSkillFilter,
  onNavigate,
}) => {
  const [activeSkill, setActiveSkill] = useState<string>(selectedSkillFilter || 'all');

  if (!assessment) {
    return (
      <div className="bg-white p-8 rounded-lg border border-slate-200 text-center">
        <FileCode2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h2 className="text-base font-semibold text-slate-800">No Assessment Data</h2>
        <p className="text-xs text-slate-500 mt-1">Run an assessment to view code evidence citations.</p>
        <button
          onClick={() => onNavigate('jobs')}
          className="mt-4 px-3.5 py-1.5 bg-slate-900 text-white rounded text-xs font-medium"
        >
          Browse Jobs
        </button>
      </div>
    );
  }

  // Collect all citations across all skills
  const allCitations: Array<{
    skill: string;
    citation: CodeEvidenceCitation;
    status: string;
    nextStep: string;
  }> = [];

  for (const s of assessment.assessedSkills) {
    for (const c of s.evidence) {
      allCitations.push({
        skill: s.skill,
        citation: c,
        status: s.status,
        nextStep: s.recommendedNextStep,
      });
    }
  }

  const availableSkills = Array.from(new Set(allCitations.map((c) => c.skill)));
  const filteredCitations = allCitations.filter((item) => {
    if (activeSkill === 'all') return true;
    return item.skill.toLowerCase() === activeSkill.toLowerCase();
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              Verified Evidence Explorer
            </span>
            <span className="text-xs font-mono text-slate-500">
              Commit: <code className="text-emerald-700 font-semibold">{assessment.commitSha.substring(0, 7)}</code>
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">{assessment.repositoryFullName}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Every cited file, line range, and code snippet was validated against the pinned commit source tree.
          </p>
        </div>

        <button
          onClick={() => onNavigate('assessment')}
          className="text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 bg-slate-50 px-3 py-1.5 rounded"
        >
          ← Back to Assessment Overview
        </button>
      </div>

      {/* Filter by skill */}
      <div className="bg-slate-100 p-3 rounded-lg border border-slate-200 flex flex-wrap items-center gap-2 text-xs">
        <Filter className="w-3.5 h-3.5 text-slate-500 mr-1" />
        <span className="font-semibold text-slate-700">Filter by Demonstrated Skill:</span>
        <button
          onClick={() => setActiveSkill('all')}
          className={`px-2.5 py-1 rounded font-mono transition-colors ${
            activeSkill === 'all'
              ? 'bg-slate-900 text-white font-medium'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          All Citations ({allCitations.length})
        </button>
        {availableSkills.map((sk) => (
          <button
            key={sk}
            onClick={() => setActiveSkill(sk)}
            className={`px-2.5 py-1 rounded font-mono transition-colors ${
              activeSkill.toLowerCase() === sk.toLowerCase()
                ? 'bg-slate-900 text-white font-medium'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            {sk}
          </button>
        ))}
      </div>

      {/* Citations List */}
      <div className="space-y-4">
        {filteredCitations.length > 0 ? (
          filteredCitations.map((item, idx) => {
            const { citation, skill, nextStep } = item;
            const snippetLines = citation.evidenceSnippet.split('\n');

            return (
              <div
                key={idx}
                className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Citation Meta Bar */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-xs font-bold font-mono text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded">
                      {skill}
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-800">
                      {citation.filePath}
                    </span>
                    <span className="text-xs font-mono text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                      L{citation.startLine}-{citation.endLine}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs">
                    {citation.isValidated ? (
                      <span className="inline-flex items-center space-x-1 text-emerald-700 font-mono text-[11px] font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Validated Programmatically</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-amber-700 font-mono text-[11px] font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Validation Notice</span>
                      </span>
                    )}

                    <a
                      href={`https://github.com/${citation.repository}/blob/${citation.commitSha}/${citation.filePath}#L${citation.startLine}-L${citation.endLine}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-slate-600 hover:text-slate-900 font-mono"
                    >
                      <GitCommit className="w-3.5 h-3.5 text-slate-400" />
                      <span>GitHub Permalink</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  </div>
                </div>

                {/* Code Snippet Viewer with Line Numbers */}
                <div className="bg-slate-900 p-4 font-mono text-xs overflow-x-auto text-slate-200">
                  <div className="space-y-1">
                    {snippetLines.map((line, lIdx) => {
                      const lineNumber = citation.startLine + lIdx;
                      return (
                        <div key={lIdx} className="flex hover:bg-slate-800/80 px-1 py-0.5 rounded">
                          <span className="select-none text-slate-600 w-10 text-right pr-4 shrink-0">
                            {lineNumber}
                          </span>
                          <span className="text-slate-100 whitespace-pre">{line}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Explanation & Next Step */}
                <div className="p-4 bg-white border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-0.5">
                      Implementation Evidence Explanation
                    </span>
                    <p className="text-slate-700 font-mono">{citation.explanation}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-0.5">
                      Recommended Next Step
                    </span>
                    <p className="text-slate-700 font-mono">{nextStep}</p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white p-8 rounded-lg border border-slate-200 text-center text-slate-400">
            <p className="text-sm">No code citations found for the selected filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};
