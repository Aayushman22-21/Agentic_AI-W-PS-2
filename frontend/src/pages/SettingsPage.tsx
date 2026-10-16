import React, { useState } from 'react';
import {
  Shield,
  Database,
  Terminal,
  Upload,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
  const [resumeText, setResumeText] = useState('');
  const [parsedResume, setParsedResume] = useState<any | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const handleTestResumeParse = async () => {
    if (!resumeText.trim()) return;
    setIsParsing(true);
    try {
      const res = await api.parseResume(resumeText);
      setParsedResume(res);
    } catch (err: any) {
      alert(`Resume parse error: ${err.message}`);
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Settings & Integrations</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
          Configure GitHub API tokens, webhook endpoints, HMAC SHA-256 verification secrets, and Supabase database connection.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GitHub Webhook Setup & Tunneling Guide */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold uppercase font-mono tracking-wider text-slate-800">
              GitHub Push Webhook Setup
            </h2>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            In your GitHub repository settings under <strong>Webhooks → Add webhook</strong>:
          </p>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <span className="text-slate-400 block text-[11px] mb-1">Payload URL</span>
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded text-slate-800 flex items-center justify-between">
                <span>https://your-public-domain.com/api/webhooks/github</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px] mb-1">Content type</span>
              <div className="bg-slate-50 border border-slate-200 p-2 rounded text-slate-800">
                <span>application/json</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px] mb-1">Secret (HMAC SHA-256)</span>
              <div className="bg-slate-50 border border-slate-200 p-2 rounded text-slate-800">
                <span>your-secure-webhook-secret-here</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded border border-slate-200 text-xs text-slate-700 space-y-1">
            <div className="flex items-center space-x-1.5 font-semibold text-slate-800">
              <Terminal className="w-3.5 h-3.5 text-slate-600" />
              <span>Local Development Tunneling:</span>
            </div>
            <p className="font-mono text-[11px] text-slate-600">
              ngrok http 4000<br />
              or: cloudflared tunnel --url http://localhost:4000
            </p>
          </div>
        </div>

        {/* Supabase & Credentials Config */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold uppercase font-mono tracking-wider text-slate-800">
              Supabase PostgreSQL Storage
            </h2>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            The application includes durable file-backed persistence out-of-the-box and full Supabase PostgreSQL schemas.
          </p>

          <div className="bg-slate-50 p-3.5 rounded border border-slate-200 text-xs font-mono text-slate-700 space-y-2">
            <div className="flex items-center space-x-1.5 font-bold text-slate-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Storage Engine Active: Durable JSON + Supabase Schema</span>
            </div>
            <p className="text-[11px] text-slate-600">
              Database schema migration is provided in:<br />
              <code className="text-slate-800 font-semibold">supabase/migrations/001_initial_schema.sql</code>
            </p>
            <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
              To connect your live Supabase cloud instance, set <code>SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code> in <code>.env</code>.
            </p>
          </div>

          <div className="bg-slate-50 p-3.5 rounded border border-slate-200 text-xs space-y-1.5">
            <span className="font-semibold text-slate-800 block">GitHub API Rate Limits:</span>
            <p className="text-slate-600 text-[11px]">
              Unauthenticated: 60 requests/hour.<br />
              With <code>GITHUB_TOKEN</code> set in <code>.env</code>: 5,000 requests/hour.
            </p>
          </div>
        </div>
      </div>

      {/* Optional Resume Parser Testing Section */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Upload className="w-5 h-5 text-slate-700" />
            <h2 className="text-sm font-bold uppercase font-mono tracking-wider text-slate-800">
              Optional Resume Claims Extraction
            </h2>
          </div>
          <span className="text-[10px] font-mono uppercase bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-semibold">
            Unverified Claims
          </span>
        </div>

        <p className="text-xs text-slate-600">
          Paste plain text or test resume content. As per specification, resume skills represent self-reported claims
          and are explicitly kept separate from verified code evidence.
        </p>

        <div className="space-y-3">
          <textarea
            rows={4}
            placeholder="Paste sample resume text (e.g. John Doe, Skills: React, Python, PostgreSQL, Docker)..."
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-slate-400"
          />

          <button
            onClick={handleTestResumeParse}
            disabled={isParsing || !resumeText.trim()}
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs font-medium rounded transition-colors disabled:opacity-50"
          >
            {isParsing ? 'Extracting Skills...' : 'Extract Self-Reported Skills'}
          </button>
        </div>

        {parsedResume && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded space-y-3 font-mono text-xs">
            <div className="flex items-center space-x-2 text-amber-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{parsedResume.disclaimer}</span>
            </div>

            <div>
              <span className="text-slate-500 text-[11px] block mb-1">
                Extracted Self-Reported Skills ({parsedResume.extractedSkills.length}):
              </span>
              <div className="flex flex-wrap gap-1">
                {parsedResume.extractedSkills.map((sk: string, i: number) => (
                  <span key={i} className="bg-white border border-slate-300 px-2 py-0.5 rounded text-slate-800 font-semibold">
                    {sk}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
