import React from 'react';
import {
  LayoutDashboard,
  Briefcase,
  GitBranch,
  CheckCircle2,
  FileCode2,
  History,
  Activity,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { PageView } from '../types';

interface NavbarProps {
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
  activeJobTitle?: string;
  activeRepoName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  activeJobTitle,
  activeRepoName,
}) => {
  const navItems: Array<{ id: PageView; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'jobs', label: 'Job Discovery', icon: Briefcase },
    { id: 'github_repos', label: 'Repositories', icon: GitBranch },
    { id: 'assessment', label: 'Skill Assessment', icon: CheckCircle2 },
    { id: 'evidence', label: 'Evidence Explorer', icon: FileCode2 },
    { id: 'history', label: 'History & Diff', icon: History },
    { id: 'event_status', label: 'Event Processing', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate('dashboard')}>
            <div className="w-8 h-8 rounded bg-emerald-600 flex items-center justify-center text-white font-mono font-bold shadow-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <span className="font-semibold text-white text-base tracking-tight">AI Career Coach</span>
              <span className="text-xs text-slate-400 block -mt-1 font-mono">Code-Evidence Portfolio Evaluator</span>
            </div>
          </div>

          {/* Active Context Indicators */}
          {(activeJobTitle || activeRepoName) && (
            <div className="hidden lg:flex items-center space-x-2 text-xs font-mono bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
              {activeJobTitle && (
                <span className="text-emerald-400 truncate max-w-xs" title={activeJobTitle}>
                  Target: {activeJobTitle}
                </span>
              )}
              {activeJobTitle && activeRepoName && <span className="text-slate-500">•</span>}
              {activeRepoName && (
                <span className="text-blue-400 truncate max-w-xs" title={activeRepoName}>
                  Repo: {activeRepoName}
                </span>
              )}
            </div>
          )}

          {/* Nav Navigation */}
          <nav className="flex items-center space-x-1 overflow-x-auto py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
