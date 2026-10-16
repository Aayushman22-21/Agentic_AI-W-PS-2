import React, { useState } from 'react';
import {
  Search,
  ExternalLink,
  PlusCircle,
  Briefcase,
  Globe,
  MapPin,
  Check,
  RefreshCw,
} from 'lucide-react';
import { DiscoveredJob, PageView } from '../types';
import { api } from '../services/api';

interface JobDiscoveryPageProps {
  jobs: DiscoveredJob[];
  onRefreshJobs: () => void;
  onSelectJob: (job: DiscoveredJob) => void;
  onNavigate: (page: PageView) => void;
}

export const JobDiscoveryPage: React.FC<JobDiscoveryPageProps> = ({
  jobs,
  onRefreshJobs,
  onSelectJob,
  onNavigate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customCompany, setCustomCompany] = useState('');
  const [customLocation, setCustomLocation] = useState('Remote');
  const [customUrl, setCustomUrl] = useState('');
  const [customText, setCustomText] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const filteredJobs = jobs.filter(
    (j) =>
      j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.requirements.some((r) => r.skill.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDiscoverGreenhouse = async (board: string) => {
    setIsDiscovering(true);
    setStatusMessage(`Querying live Greenhouse API for board: ${board}...`);
    try {
      await api.discoverGreenhouse(board);
      setStatusMessage(`Successfully loaded live positions from Greenhouse (${board})`);
      onRefreshJobs();
    } catch (err: any) {
      setStatusMessage(`Greenhouse error: ${err.message}`);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleDiscoverLever = async (company: string) => {
    setIsDiscovering(true);
    setStatusMessage(`Querying live Lever API for company: ${company}...`);
    try {
      await api.discoverLever(company);
      setStatusMessage(`Successfully loaded live positions from Lever (${company})`);
      onRefreshJobs();
    } catch (err: any) {
      setStatusMessage(`Lever error: ${err.message}`);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleSaveCustomJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;

    try {
      const saved = await api.saveCustomJob({
        title: customTitle || 'Software Engineer',
        company: customCompany || 'Target Employer',
        location: customLocation,
        url: customUrl,
        text: customText,
      });
      setShowCustomModal(false);
      setCustomTitle('');
      setCustomCompany('');
      setCustomText('');
      onRefreshJobs();
      onSelectJob(saved);
      onNavigate('job_details');
    } catch (err: any) {
      alert(`Error saving job description: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Real Job and Internship Discovery</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Query live public job boards (Greenhouse & Lever) or paste real job postings. Technical requirements
            are automatically extracted and normalized into structured verification targets.
          </p>
        </div>
        <button
          onClick={() => setShowCustomModal(true)}
          className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Paste Job Description</span>
        </button>
      </div>

      {/* Live Discovery Action Bar */}
      <div className="bg-slate-100 p-4 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <Globe className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-slate-700">Live Public Job Boards:</span>
          <span className="text-slate-500">Query real endpoints:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            disabled={isDiscovering}
            onClick={() => handleDiscoverGreenhouse('cloudflare')}
            className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-800 rounded border border-slate-300 font-mono transition-colors disabled:opacity-50"
          >
            Greenhouse: Cloudflare
          </button>
          <button
            disabled={isDiscovering}
            onClick={() => handleDiscoverGreenhouse('figma')}
            className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-800 rounded border border-slate-300 font-mono transition-colors disabled:opacity-50"
          >
            Greenhouse: Figma
          </button>
          <button
            disabled={isDiscovering}
            onClick={() => handleDiscoverLever('netlify')}
            className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-800 rounded border border-slate-300 font-mono transition-colors disabled:opacity-50"
          >
            Lever: Netlify
          </button>
          <button
            disabled={isDiscovering}
            onClick={() => onRefreshJobs()}
            className="p-1 text-slate-600 hover:text-slate-900"
            title="Refresh saved jobs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isDiscovering ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="text-xs font-mono bg-blue-50 border border-blue-200 text-blue-800 p-2.5 rounded">
          {statusMessage}
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Filter by role title, company, or technical skill (e.g., React, TypeScript, Docker)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
        />
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredJobs.length > 0 ? (
          filteredJobs.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                    {job.source}
                  </span>
                  {job.url && (
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-slate-600"
                      title="Open Original Job Listing"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <h3 className="text-sm font-semibold text-slate-900 mt-2 line-clamp-1">{job.title}</h3>
                <p className="text-xs text-slate-500 font-medium">{job.company}</p>

                <div className="flex items-center space-x-2 text-xs text-slate-400 mt-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{job.location}</span>
                  {job.isRemote && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded font-medium">
                      Remote
                    </span>
                  )}
                </div>

                {/* Structured Requirements */}
                <div className="mt-4">
                  <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block mb-1.5">
                    Extracted Requirements ({job.requirements.length})
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-hidden">
                    {job.requirements.slice(0, 6).map((req, idx) => (
                      <span
                        key={idx}
                        className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${
                          req.isExplicit
                            ? 'bg-slate-100 text-slate-800 border-slate-300 font-semibold'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                        title={req.isExplicit ? 'Explicit requirement in posting' : 'Inferred from description'}
                      >
                        {req.skill}
                      </span>
                    ))}
                    {job.requirements.length > 6 && (
                      <span className="text-[10px] text-slate-400">+{job.requirements.length - 6} more</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    onSelectJob(job);
                    onNavigate('job_details');
                  }}
                  className="text-xs text-slate-600 hover:text-slate-900 font-medium"
                >
                  View Requirements
                </button>
                <button
                  onClick={() => {
                    onSelectJob(job);
                    onNavigate('github_repos');
                  }}
                  className="inline-flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs px-3 py-1.5 rounded font-medium transition-colors"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Assess Portfolio</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-lg border border-slate-200">
            <Briefcase className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm">No jobs match your search criteria.</p>
            <p className="text-xs text-slate-400 mt-1">Try querying a live public board or paste a custom description.</p>
          </div>
        )}
      </div>

      {/* Paste Custom Job Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-semibold text-slate-900">Paste Job Description</h3>
              <button
                onClick={() => setShowCustomModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveCustomJob} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Job Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Full Stack Engineer"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Company</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corp"
                    value={customCompany}
                    onChange={(e) => setCustomCompany(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Remote / San Francisco, CA"
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Listing URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://company.com/jobs/123"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Job Description Text</label>
                <textarea
                  required
                  rows={6}
                  placeholder="Paste the full job description or requirements section here..."
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 text-white px-4 py-1.5 text-xs font-medium rounded hover:bg-slate-800"
                >
                  Extract Requirements & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
