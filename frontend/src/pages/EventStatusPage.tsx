import React, { useState, useEffect } from 'react';
import {
  Activity,
  Clock,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { WebhookDeliveryRecord, BackgroundJobRecord } from '../types';
import { api } from '../services/api';

export const EventStatusPage: React.FC = () => {
  const [deliveries, setDeliveries] = useState<WebhookDeliveryRecord[]>([]);
  const [jobs, setJobs] = useState<BackgroundJobRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [pollOwner, setPollOwner] = useState('facebook');
  const [pollRepo, setPollRepo] = useState('react');
  const [pollResult, setPollResult] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const delList = await api.getWebhookDeliveries();
      setDeliveries(delList);
      const jobList = await api.getBackgroundJobs();
      setJobs(jobList);
    } catch (err: any) {
      console.error('Error fetching event data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Polling status every 10s
    return () => clearInterval(interval);
  }, []);

  const handleManualPoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollOwner || !pollRepo) return;
    setIsPolling(true);
    setPollResult(null);
    try {
      const res = await api.triggerPoll(pollOwner.trim(), pollRepo.trim());
      if (res.newCommitFound) {
        setPollResult(`New commit detected for ${pollOwner}/${pollRepo}! Automated reassessment triggered.`);
      } else {
        setPollResult(`Repository ${pollOwner}/${pollRepo} inspected. Pinned commit is already up to date.`);
      }
      fetchData();
    } catch (err: any) {
      setPollResult(`Polling error: ${err.message}`);
    } finally {
      setIsPolling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-mono uppercase font-semibold text-emerald-700">Pipeline Active</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight mt-1">
            Repository Event Processing & Webhook Status
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 max-w-2xl">
            Live monitor for GitHub push webhooks, HMAC SHA-256 signature verifications, background reassessment queues,
            and scheduled polling fallbacks.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={isLoading}
          className="inline-flex items-center space-x-1.5 text-xs font-mono text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Pipeline</span>
        </button>
      </div>

      {/* Manual Polling Fallback Trigger */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-slate-600" />
          <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-slate-800">
            Scheduled Commit Polling Fallback
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          In environments without inbound webhook tunneling, the polling fallback actively queries the GitHub REST API
          for new commits and triggers reassessment when the commit SHA changes.
        </p>

        <form onSubmit={handleManualPoll} className="flex flex-wrap items-center gap-3 pt-1">
          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="text-slate-500">github.com/</span>
            <input
              type="text"
              required
              placeholder="owner"
              value={pollOwner}
              onChange={(e) => setPollOwner(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded text-xs w-28 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
            <span className="text-slate-500">/</span>
            <input
              type="text"
              required
              placeholder="repo"
              value={pollRepo}
              onChange={(e) => setPollRepo(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded text-xs w-36 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <button
            type="submit"
            disabled={isPolling}
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 text-xs font-medium rounded transition-colors disabled:opacity-50 inline-flex items-center space-x-1.5"
          >
            {isPolling ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            <span>Poll Remote Commits Now</span>
          </button>
        </form>

        {pollResult && (
          <div className="text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-800 mt-2">
            {pollResult}
          </div>
        )}
      </div>

      {/* Webhook Deliveries Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden space-y-0">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-emerald-600" />
            <h2 className="text-xs font-bold uppercase font-mono tracking-wider text-slate-800">
              Recorded Webhook Deliveries ({deliveries.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">Deduplicated by X-GitHub-Delivery</span>
        </div>

        <div className="overflow-x-auto">
          {deliveries.length > 0 ? (
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Delivery ID</th>
                  <th className="p-3">HMAC Signature</th>
                  <th className="p-3">Repository</th>
                  <th className="p-3">Commit SHA</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Received At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveries.map((del) => (
                  <tr key={del.deliveryId} className="hover:bg-slate-50/60">
                    <td className="p-3 font-semibold text-slate-800">{del.deliveryId}</td>
                    <td className="p-3">
                      {del.signatureValid ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-700 font-medium">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Valid SHA-256</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-red-600 font-medium">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Invalid / Rejected</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-700">{del.repositoryFullName || '—'}</td>
                    <td className="p-3 text-slate-500">
                      {del.afterSha ? del.afterSha.substring(0, 7) : '—'}
                    </td>
                    <td className="p-3">
                      {del.status === 'ignored_readme_only' ? (
                        <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                          Ignored (README-only)
                        </span>
                      ) : del.status === 'completed' ? (
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                          Reassessed
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[10px]">
                          {del.status}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-400">
                      {new Date(del.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-400">
              <p className="text-sm">No webhook deliveries received yet.</p>
              <p className="text-xs text-slate-400 mt-1">Configure your GitHub repo push webhook or use the polling fallback above.</p>
            </div>
          )}
        </div>
      </div>

      {/* Background Processing Queue */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-bold uppercase font-mono tracking-wider text-slate-800">
              Background Job Queue & Retries ({jobs.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">Max 3 attempts per job</span>
        </div>

        <div className="p-4 divide-y divide-slate-100 font-mono text-xs">
          {jobs.length > 0 ? (
            jobs.map((job) => (
              <div key={job.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-slate-800">{job.jobType}</span>
                    <span className="text-slate-400">({job.id})</span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Target: {job.payload?.repositoryFullName || 'Unknown'} • Commit: {job.payload?.afterSha?.substring(0, 7) || 'N/A'}
                  </p>
                  {job.lastError && (
                    <p className="text-red-600 text-[11px] mt-1">Notice: {job.lastError}</p>
                  )}
                </div>

                <div className="text-right">
                  <span
                    className={`text-[10px] uppercase px-2 py-0.5 rounded border font-semibold ${
                      job.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : job.status === 'failed'
                        ? 'bg-red-50 text-red-800 border-red-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {job.status}
                  </span>
                  <span className="block text-[10px] text-slate-400 mt-1">
                    Attempt {job.attempts} of {job.maxAttempts}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-slate-400">
              <p>No jobs queued in background worker.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
