import React, { useState, useEffect } from 'react';
import {
  Compass,
  Clock,
  ArrowRight,
  ExternalLink,
  Layers,
  AlertCircle,
  BookOpen,
  TrendingUp,
  GitCommit,
  RotateCcw,
  Sparkles,
  Code,
  ListChecks,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Briefcase,
} from 'lucide-react';
import {
  StoredAssessment,
  DiscoveredJob,
  StoredRoadmap,
  AvailableCareerRole,
  SeniorityLevel,
  ProjectProgressStatus,
  PageView,
} from '../types';
import { api } from '../services/api';

interface CareerRoadmapPageProps {
  activeAssessment: StoredAssessment | null;
  activeJob: DiscoveredJob | null;
  onNavigate: (page: PageView) => void;
  onSelectSkillForEvidence?: (skill: string) => void;
}

export const CareerRoadmapPage: React.FC<CareerRoadmapPageProps> = ({
  activeAssessment,
  activeJob,
  onNavigate,
  onSelectSkillForEvidence,
}) => {
  const [roadmap, setRoadmap] = useState<StoredRoadmap | null>(null);
  const [careerRoles, setCareerRoles] = useState<AvailableCareerRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [targetCompany, setTargetCompany] = useState<string>('');
  const [seniority, setSeniority] = useState<SeniorityLevel>('mid');
  const [weeklyHours, setWeeklyHours] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(false);
  const [reassessing, setReassessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [activeProfileTab, setActiveProfileTab] = useState<'all' | 'demonstrated' | 'partial' | 'missing' | 'review'>('all');

  // Load available roles and current active roadmap
  useEffect(() => {
    loadCareerRoles();
    loadActiveRoadmap();
  }, [activeAssessment?.id, activeJob?.id]);

  const loadCareerRoles = async () => {
    try {
      const data = await api.getRoadmapRoles();
      const combined = [...data.canonicalRoles, ...data.discoveredRoles];
      setCareerRoles(combined);
      if (combined.length > 0 && !selectedRole) {
        // Default to active job title or first canonical role
        const matched = combined.find(
          (r) => activeJob && r.role.toLowerCase() === activeJob.title.toLowerCase()
        );
        setSelectedRole(matched ? matched.role : activeJob?.title || combined[0].role);
      }
    } catch (err) {
      console.warn('Failed to load career roles:', err);
    }
  };

  const loadActiveRoadmap = async () => {
    setLoading(true);
    setError(null);
    try {
      const found = await api.getLatestRoadmap(activeAssessment?.id, activeJob?.id);
      setRoadmap(found);
      if (found) {
        setSelectedRole(found.preferences.targetRole);
        setTargetCompany(found.preferences.targetCompany || '');
        setSeniority(found.preferences.seniority);
        setWeeklyHours(found.preferences.weeklyHours || 10);
        // Expand first project by default
        if (found.recommendedProjects.length > 0) {
          setExpandedProjects({ [found.recommendedProjects[0].id]: true });
        }
      }
    } catch {
      // No roadmap generated yet, which is expected before generation
      setRoadmap(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRoadmap = async () => {
    if (!activeAssessment) {
      setError('An authentic repository assessment is required to generate a personalized roadmap. Please assess a repository first.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const newRoadmap = await api.generateRoadmap({
        assessmentId: activeAssessment.id,
        jobId: activeJob?.id || activeAssessment.jobId,
        targetRole: selectedRole || activeJob?.title || 'Backend Engineer',
        targetCompany: targetCompany || activeJob?.company,
        seniority,
        weeklyHours,
      });

      setRoadmap(newRoadmap);
      if (newRoadmap.recommendedProjects.length > 0) {
        setExpandedProjects({ [newRoadmap.recommendedProjects[0].id]: true });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate roadmap');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMilestone = async (projectId: string, milestoneId: string, currentStatus: boolean) => {
    if (!roadmap) return;
    try {
      const updated = await api.updateRoadmapProgress(roadmap.id, {
        projectId,
        milestoneId,
        isCompleted: !currentStatus,
      });
      setRoadmap(updated);
    } catch (err: any) {
      console.error('Failed to toggle milestone:', err);
    }
  };

  const handleUpdateProjectStatus = async (projectId: string, newStatus: ProjectProgressStatus) => {
    if (!roadmap) return;
    try {
      const updated = await api.updateRoadmapProgress(roadmap.id, {
        projectId,
        projectStatus: newStatus,
      });
      setRoadmap(updated);
    } catch (err: any) {
      console.error('Failed to update project status:', err);
    }
  };

  const handleReassessRoadmap = async () => {
    if (!roadmap) return;
    setReassessing(true);
    try {
      const updated = await api.reassessRoadmap(roadmap.id);
      setRoadmap(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to reassess roadmap');
    } finally {
      setReassessing(false);
    }
  };

  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  // Group skills from assessment for current profile
  const demonstratedSkills = activeAssessment?.assessedSkills.filter((s) => s.status === 'demonstrated') || [];
  const partialSkills = activeAssessment?.assessedSkills.filter((s) => s.status === 'partially_demonstrated') || [];
  const missingSkills = activeAssessment?.assessedSkills.filter((s) => s.status === 'not_demonstrated_in_scope') || [];
  const needsReviewSkills = activeAssessment?.assessedSkills.filter((s) => s.status === 'needs_review') || [];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded bg-indigo-50 text-indigo-700 font-mono text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-4 h-4" /> Career Roadmap
            </span>
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded font-mono">
              Evidence-Driven Progression
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">
            Personalised Engineering Roadmap & Projects
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Translates your code-verified portfolio evidence into a ranked skill-gap analysis,
            sequencing practical, milestone-driven projects to prepare for your target role.
          </p>
        </div>

        {roadmap && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleReassessRoadmap}
              disabled={reassessing}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
              title="Re-evaluate roadmap against latest repository commit"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${reassessing ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
              <span>{reassessing ? 'Reassessing...' : 'Reassess Evidence'}</span>
            </button>
          </div>
        )}
      </div>

      {/* SECTION A: CAREER GOAL SELECTOR */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center space-x-2">
            <Briefcase className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider font-mono">
              A. Target Career Goal & Learning Parameters
            </h2>
          </div>
          {activeAssessment && (
            <span className="text-xs font-mono text-slate-500">
              Grounded on: <strong className="text-slate-700">{activeAssessment.repositoryFullName}</strong> @{' '}
              <code className="text-indigo-600">{activeAssessment.commitSha.substring(0, 7)}</code> (v{activeAssessment.version})
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Target Role */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Target Role <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full text-xs rounded border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-slate-50 py-2 px-3"
            >
              <optgroup label="Canonical Engineering Tracks">
                {careerRoles
                  .filter((r) => r.category !== 'backend' || r.description.includes('Specializes in'))
                  .map((r) => (
                    <option key={r.role} value={r.role}>
                      {r.role}
                    </option>
                  ))}
              </optgroup>
              {careerRoles.some((r) => r.description.includes('dynamically discovered')) && (
                <optgroup label="From Discovered Job Postings">
                  {careerRoles
                    .filter((r) => r.description.includes('dynamically discovered'))
                    .map((r) => (
                      <option key={r.role} value={r.role}>
                        {r.role}
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Target Company */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Target Company (Optional)
            </label>
            <input
              type="text"
              value={targetCompany}
              onChange={(e) => setTargetCompany(e.target.value)}
              placeholder={activeJob?.company || 'e.g. Cloudflare, Acme'}
              className="w-full text-xs rounded border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-slate-50 py-2 px-3"
            />
          </div>

          {/* Seniority Level */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Seniority Level
            </label>
            <select
              value={seniority}
              onChange={(e) => setSeniority(e.target.value as SeniorityLevel)}
              className="w-full text-xs rounded border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-slate-50 py-2 px-3"
            >
              <option value="entry">Entry-Level / Junior (Foundational Focus)</option>
              <option value="mid">Mid-Level (Production Depth & Tests)</option>
              <option value="senior">Senior (Architecture & CI/CD)</option>
            </select>
          </div>

          {/* Weekly Available Hours */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Weekly Learning Time
            </label>
            <select
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(Number(e.target.value))}
              className="w-full text-xs rounded border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-slate-50 py-2 px-3"
            >
              <option value={5}>5 hours / week (Paced)</option>
              <option value={10}>10 hours / week (Standard)</option>
              <option value={15}>15 hours / week (Accelerated)</option>
              <option value={20}>20+ hours / week (Immersive)</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="text-xs text-slate-500 font-mono">
            {activeJob ? (
              <span>
                Matching against real job: <strong className="text-slate-800">{activeJob.title}</strong> at{' '}
                <strong className="text-slate-800">{activeJob.company}</strong>
              </span>
            ) : (
              <span>Select an active target job from Job Discovery to anchor requirements.</span>
            )}
          </div>

          <button
            onClick={handleGenerateRoadmap}
            disabled={loading || !activeAssessment}
            className="w-full sm:w-auto px-5 py-2 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                <span>Computing Evidence Gaps...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{roadmap ? 'Regenerate Career Roadmap' : 'Generate Career Roadmap'}</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* SECTION F: ROADMAP UPDATES & VERSIONING BANNER (When Roadmap exists) */}
      {roadmap && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-slate-200 text-xs shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-mono font-bold">
              v{roadmap.version}
            </div>
            <div>
              <div className="font-semibold text-white flex items-center gap-2 font-mono">
                <span>Roadmap Version {roadmap.version}</span>
                <span className="text-slate-400 font-normal">•</span>
                <span className="text-slate-400 font-normal">
                  Target: {roadmap.preferences.targetRole} ({roadmap.preferences.seniority})
                </span>
              </div>
              <div className="text-slate-400 mt-0.5 font-mono text-[11px] flex items-center gap-2">
                <span>Pinned Repo: {roadmap.repositoryFullName}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <GitCommit className="w-3 h-3 text-slate-400" />
                  <code>{roadmap.commitSha.substring(0, 7)}</code>
                </span>
                <span>•</span>
                <span>Updated: {new Date(roadmap.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {roadmap.reassessmentNote && (
            <div className="bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded max-w-md text-emerald-300 text-[11px] font-mono">
              {roadmap.reassessmentNote}
            </div>
          )}
        </div>
      )}

      {/* SECTION E: VERIFIED MILESTONE PROGRESS TRACKER */}
      {roadmap && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider font-mono">
                E. Verified Milestone Progress Meter
              </h2>
            </div>
            <div className="text-xs font-mono text-slate-500">
              Completion: <strong className="text-slate-900 text-sm font-bold">{roadmap.overallProgressPct}%</strong> of project milestones
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
            <div
              className="bg-emerald-600 h-full transition-all duration-500 rounded-full"
              style={{ width: `${roadmap.overallProgressPct}%` }}
            />
          </div>

          <div className="mt-2 text-[11px] text-slate-500 font-mono flex items-center justify-between">
            <span>Progress is strictly calculated from verified milestone acceptance criteria, not arbitrary proficiency estimates.</span>
            <span>
              {roadmap.recommendedProjects.reduce(
                (acc, p) => acc + p.milestones.filter((m) => m.isCompleted).length,
                0
              )}{' '}
              of {roadmap.recommendedProjects.reduce((acc, p) => acc + p.milestones.length, 0)} Milestones Completed
            </span>
          </div>
        </div>
      )}

      {/* 2-COLUMN LAYOUT: SKILL PROFILE & PRIORITY GAPS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SECTION B: CURRENT SKILL PROFILE (5 COLS) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-slate-600" />
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider font-mono">
                B. Current Skill Profile
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {activeAssessment?.assessedSkills.length || 0} evaluated
            </span>
          </div>

          {/* Profile Filter Tabs */}
          <div className="flex border-b border-slate-200 text-xs font-mono">
            <button
              onClick={() => setActiveProfileTab('all')}
              className={`pb-2 px-2.5 font-medium ${
                activeProfileTab === 'all'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              All ({activeAssessment?.assessedSkills.length || 0})
            </button>
            <button
              onClick={() => setActiveProfileTab('demonstrated')}
              className={`pb-2 px-2.5 font-medium ${
                activeProfileTab === 'demonstrated'
                  ? 'border-b-2 border-emerald-600 text-emerald-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Demonstrated ({demonstratedSkills.length})
            </button>
            <button
              onClick={() => setActiveProfileTab('partial')}
              className={`pb-2 px-2.5 font-medium ${
                activeProfileTab === 'partial'
                  ? 'border-b-2 border-amber-600 text-amber-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Partial ({partialSkills.length})
            </button>
            <button
              onClick={() => setActiveProfileTab('missing')}
              className={`pb-2 px-2.5 font-medium ${
                activeProfileTab === 'missing'
                  ? 'border-b-2 border-slate-600 text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Not in Scope ({missingSkills.length})
            </button>
            {needsReviewSkills.length > 0 && (
              <button
                onClick={() => setActiveProfileTab('review')}
                className={`pb-2 px-2.5 font-medium ${
                  activeProfileTab === 'review'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Review ({needsReviewSkills.length})
              </button>
            )}
          </div>

          {/* Objective Disclaimer Notice */}
          <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
            <span>
              Skills marked <em>not demonstrated in analysed scope</em> indicate no verifiable implementation was found in scanned repository files. This does <strong>not</strong> imply a lack of ability.
            </span>
          </div>

          {/* Skill List */}
          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {activeAssessment?.assessedSkills
              .filter((s) => {
                if (activeProfileTab === 'demonstrated') return s.status === 'demonstrated';
                if (activeProfileTab === 'partial') return s.status === 'partially_demonstrated';
                if (activeProfileTab === 'missing') return s.status === 'not_demonstrated_in_scope';
                if (activeProfileTab === 'review') return s.status === 'needs_review';
                return true;
              })
              .map((s) => (
                <div
                  key={s.skill}
                  className="p-3 rounded border border-slate-200 bg-slate-50/50 hover:bg-white transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-slate-900">{s.skill}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                        s.status === 'demonstrated'
                          ? 'bg-emerald-100 text-emerald-800'
                          : s.status === 'partially_demonstrated'
                          ? 'bg-amber-100 text-amber-800'
                          : s.status === 'needs_review'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {s.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 line-clamp-2">{s.explanation}</p>

                  {s.evidence.length > 0 && (
                    <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span className="text-[10px] font-mono text-slate-500">
                        {s.evidence.length} code citation(s)
                      </span>
                      <button
                        onClick={() => {
                          if (onSelectSkillForEvidence) onSelectSkillForEvidence(s.skill);
                          onNavigate('evidence');
                        }}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-mono flex items-center gap-1"
                      >
                        <span>View in Evidence Explorer</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}

            {(!activeAssessment || activeAssessment.assessedSkills.length === 0) && (
              <div className="text-center py-8 text-xs text-slate-500 font-mono">
                No repository assessment loaded. Run an assessment on your GitHub repository to view your skill profile.
              </div>
            )}
          </div>
        </div>

        {/* SECTION C: PRIORITY SKILL GAPS (7 COLS) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider font-mono">
                C. Ranked Skill Gaps & Transparent Priority
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-500">
              Scoring Model: 0 - 100
            </span>
          </div>

          <p className="text-xs text-slate-600">
            Ranked using a transparent scoring formula based on: <strong>Job Relevance (40%)</strong>,{' '}
            <strong>Evidence Gap Severity (35%)</strong>, <strong>Prerequisite Dependency (15%)</strong>, and{' '}
            <strong>Project Feasibility (10%)</strong>.
          </p>

          {/* Gap Cards */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {roadmap?.skillGaps.map((gap) => (
              <div
                key={gap.skill}
                className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-indigo-200 transition-colors shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded bg-slate-100 text-slate-700 flex items-center justify-center font-mono text-xs font-bold shrink-0">
                      #{gap.priorityRank}
                    </span>
                    <div>
                      <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                        <span>{gap.skill}</span>
                        {gap.isExplicitRequirement ? (
                          <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded font-mono">
                            Explicit Requirement
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                            Inferred Requirement
                          </span>
                        )}
                      </h3>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Source: {gap.jobSource}
                      </span>
                    </div>
                  </div>

                  {/* Priority Score Pill */}
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 block">
                      Score: {gap.priorityScore}/100
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                      Priority Rank
                    </span>
                  </div>
                </div>

                {/* Why it matters & Supporting Text */}
                <div className="mt-2.5 space-y-1.5 text-xs text-slate-700">
                  <p className="bg-slate-50 p-2 rounded text-[11px] text-slate-600 font-mono border border-slate-100">
                    "{gap.supportingRequirementText}"
                  </p>
                  <p className="text-[11px] text-slate-600">
                    <strong>Evidence Status:</strong> {gap.assessmentReason}
                  </p>
                </div>

                {/* Score Breakdown Footer */}
                <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-500">
                  <div className="flex items-center gap-2">
                    <span>Relevance: {gap.priorityBreakdown.jobRelevanceWeight}/40</span>
                    <span>•</span>
                    <span>Gap: {gap.priorityBreakdown.evidenceGapSeverity}/35</span>
                    <span>•</span>
                    <span>Prereq: {gap.priorityBreakdown.prerequisiteValue}/15</span>
                    <span>•</span>
                    <span>Feasibility: {gap.priorityBreakdown.feasibilityBonus}/10</span>
                  </div>
                  {gap.prerequisites.length > 0 && (
                    <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Prereq: {gap.prerequisites.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {!roadmap && (
              <div className="text-center py-12 text-xs text-slate-500 font-mono">
                Click <strong>"Generate Career Roadmap"</strong> above to calculate ranked skill gaps for your target role.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION D: RECOMMENDED PRACTICAL PROJECTS */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Code className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider font-mono">
              D. Practical Project Catalogue & Milestone Progression
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Sequenced: Foundational → Intermediate → Advanced
          </span>
        </div>

        <p className="text-xs text-slate-600 max-w-3xl">
          Each recommended project targets your specific high-priority missing skills without generic fluff.
          Follow the milestones to build authentic code evidence that can be detected by the assessment engine.
        </p>

        {/* Project Cards */}
        <div className="space-y-6">
          {roadmap?.recommendedProjects.map((proj) => {
            const isExpanded = !!expandedProjects[proj.id];
            const completedCount = proj.milestones.filter((m) => m.isCompleted).length;
            const isAllCompleted = completedCount === proj.milestones.length && proj.milestones.length > 0;

            return (
              <div
                key={proj.id}
                className={`border rounded-lg transition-all ${
                  isAllCompleted
                    ? 'border-emerald-300 bg-emerald-50/20 shadow-xs'
                    : 'border-slate-200 bg-white shadow-xs'
                }`}
              >
                {/* Project Header Bar */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start space-x-3">
                    <span className="w-7 h-7 rounded bg-indigo-600 text-white flex items-center justify-center font-mono text-xs font-bold shrink-0 mt-0.5">
                      {proj.sequenceOrder}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-base text-slate-900">{proj.title}</h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-mono font-medium ${
                            proj.difficulty === 'foundational'
                              ? 'bg-blue-100 text-blue-800'
                              : proj.difficulty === 'intermediate'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {proj.difficulty}
                        </span>
                        <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {proj.estimatedEffort}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mt-1 max-w-3xl">{proj.description}</p>

                      {/* Targeted Gaps Badges */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-mono text-slate-400">Addresses Gaps:</span>
                        {proj.targetSkillGaps.map((skill) => (
                          <span
                            key={skill}
                            className="text-[10px] bg-rose-50 border border-rose-200 text-rose-700 px-2 py-0.5 rounded font-mono font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Status Dropdown */}
                  <div className="flex items-center space-x-3 shrink-0 self-end md:self-center">
                    <div className="text-right">
                      <select
                        value={proj.status}
                        onChange={(e) =>
                          handleUpdateProjectStatus(proj.id, e.target.value as ProjectProgressStatus)
                        }
                        className={`text-xs rounded font-mono py-1.5 px-3 border shadow-xs ${
                          proj.status === 'completed_and_verified'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                            : proj.status === 'in_progress'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : proj.status === 'submitted_for_verification'
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : 'bg-slate-50 text-slate-700 border-slate-300'
                        }`}
                      >
                        <option value="not_started">Status: Not Started</option>
                        <option value="in_progress">Status: In Progress</option>
                        <option value="submitted_for_verification">Status: Submitted</option>
                        <option value="completed_and_verified">Status: Completed & Verified</option>
                      </select>
                      <span className="text-[10px] font-mono text-slate-400 block mt-1">
                        {completedCount} / {proj.milestones.length} milestones
                      </span>
                    </div>

                    <button
                      onClick={() => toggleProjectExpansion(proj.id)}
                      className="p-2 rounded hover:bg-slate-100 text-slate-600 transition-colors"
                      title={isExpanded ? 'Collapse milestones' : 'Expand milestones'}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Milestones & Resources */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/70 p-5 space-y-5 rounded-b-lg">
                    {/* Role Fit Explanation */}
                    <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded text-xs text-indigo-900">
                      <strong className="font-semibold block mb-0.5">Why this matches your career goal:</strong>
                      {proj.roleFitExplanation}
                    </div>

                    {/* Milestones Checklist */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 uppercase font-mono tracking-wider flex items-center gap-1.5 mb-3">
                        <ListChecks className="w-4 h-4 text-slate-600" />
                        Measurable Milestones & Acceptance Criteria
                      </h4>

                      <div className="space-y-3">
                        {proj.milestones.map((m) => (
                          <div
                            key={m.id}
                            className={`p-3.5 rounded border transition-colors ${
                              m.isCompleted
                                ? 'bg-white border-emerald-300 shadow-2xs'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <label className="flex items-start space-x-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={m.isCompleted}
                                  onChange={() => handleToggleMilestone(proj.id, m.id, m.isCompleted)}
                                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 mt-0.5"
                                />
                                <div>
                                  <span
                                    className={`text-xs font-semibold ${
                                      m.isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                                    }`}
                                  >
                                    {m.title}
                                  </span>
                                  <p className="text-[11px] text-slate-600 mt-0.5">{m.description}</p>
                                </div>
                              </label>

                              {m.completedAt && (
                                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                                  Done {new Date(m.completedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>

                            {/* Acceptance Criteria */}
                            <div className="mt-3 pl-7 space-y-1.5">
                              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                                Acceptance Criteria:
                              </span>
                              <ul className="list-disc list-inside text-[11px] text-slate-700 space-y-0.5 font-sans">
                                {m.acceptanceCriteria.map((crit, cIdx) => (
                                  <li key={cIdx}>{crit}</li>
                                ))}
                              </ul>
                              <div className="mt-2 text-[10px] font-mono text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-100">
                                <strong>Expected Evidence:</strong> {m.expectedEvidence}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Official Learning Resources */}
                    {proj.learningResources.length > 0 && (
                      <div className="pt-2">
                        <h4 className="text-xs font-semibold text-slate-900 uppercase font-mono tracking-wider flex items-center gap-1.5 mb-2.5">
                          <BookOpen className="w-4 h-4 text-slate-600" />
                          Authoritative Learning Resources & Official Specs
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {proj.learningResources.map((res) => (
                            <a
                              key={res.url}
                              href={res.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2.5 bg-white border border-slate-200 rounded hover:border-indigo-300 hover:shadow-xs transition-all flex items-start justify-between group"
                            >
                              <div>
                                <span className="font-semibold text-xs text-indigo-600 group-hover:text-indigo-800 flex items-center gap-1">
                                  {res.title}
                                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-indigo-600" />
                                </span>
                                <p className="text-[11px] text-slate-600 mt-0.5">{res.description}</p>
                              </div>
                              <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded ml-2 shrink-0">
                                {res.type}
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {!roadmap && (
            <div className="text-center py-12 text-xs text-slate-500 font-mono">
              No roadmap generated yet. Select your career parameters and click <strong>"Generate Career Roadmap"</strong>.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
