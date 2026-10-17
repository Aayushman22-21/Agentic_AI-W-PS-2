import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Briefcase,
  GitBranch,
  CheckCircle2,
  Compass,
  FileCode2,
  History,
  Activity,
  Settings,
  ShieldCheck,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';

import { PageView } from '../types';

interface NavbarProps {
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
  activeJobTitle?: string;
  activeRepoName?: string;
}

interface NavItem {
  id: PageView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  activeJobTitle,
  activeRepoName,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Core 5 primary navigation destinations requested in prompt
  const primaryNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'jobs', label: 'Job Discovery', icon: Briefcase },
    { id: 'github_repos', label: 'Repositories', icon: GitBranch },
    { id: 'assessment', label: 'Skill Assessment', icon: CheckCircle2 },
    { id: 'roadmap', label: 'Career Roadmap', icon: Compass },
  ];

  // Secondary tools and diagnostic destinations
  const secondaryNavItems: Array<NavItem & { description: string }> = [
    {
      id: 'evidence',
      label: 'Evidence Explorer',
      icon: FileCode2,
      description: 'Line-by-line verified code citations',
    },
    {
      id: 'history',
      label: 'History & Diff',
      icon: History,
      description: 'Versioned assessments across commits',
    },
    {
      id: 'event_status',
      label: 'Event Processing',
      icon: Activity,
      description: 'GitHub webhook deliveries & queue audit',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      description: 'API rate limits, tokens & secrets',
    },
  ];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMoreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavClick = (page: PageView) => {
    onNavigate(page);
    setMobileMenuOpen(false);
    setMoreDropdownOpen(false);
  };

  const isSecondaryActive = secondaryNavItems.some((item) => item.id === currentPage);
  const activeSecondaryItem = secondaryNavItems.find((item) => item.id === currentPage);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-200 sticky top-0 z-50 shadow-sm">
      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Left: Compact, Single-Line Brand */}
          <div
            className="flex items-center space-x-2.5 cursor-pointer shrink-0 select-none group py-1"
            onClick={() => handleNavClick('dashboard')}
            title="AI Career Coach - Dashboard"
          >
            <div className="w-7 h-7 rounded bg-emerald-600 flex items-center justify-center text-white shadow-xs group-hover:bg-emerald-500 transition-colors">
              <ShieldCheck className="w-4 h-4 text-emerald-100" />
            </div>
            <span className="font-semibold text-white text-base tracking-tight whitespace-nowrap">
              AI Career Coach
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* "More Tools" Dropdown Menu */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setMoreDropdownOpen((prev) => !prev)}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  isSecondaryActive || moreDropdownOpen
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
                title="Additional tools and diagnostic views"
              >
                <span>
                  {isSecondaryActive && activeSecondaryItem ? activeSecondaryItem.label : 'More'}
                </span>
                <ChevronDown
                  className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
                    moreDropdownOpen ? 'rotate-180 text-emerald-400' : ''
                  }`}
                />
              </button>

              {/* Dropdown Floating Panel */}
              {moreDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-64 bg-slate-900 border border-slate-700/80 rounded-lg shadow-xl py-1.5 z-50 text-slate-200 animate-in fade-in-50 zoom-in-95 duration-100">
                  <div className="px-3 py-1 text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800">
                    System & Tools
                  </div>
                  {secondaryNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full text-left px-3 py-2 text-xs flex items-start space-x-2.5 transition-colors ${
                          isActive
                            ? 'bg-slate-800/90 text-white font-medium'
                            : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            isActive ? 'text-emerald-400' : 'text-slate-400'
                          }`}
                        />
                        <div className="truncate">
                          <div className="leading-tight">{item.label}</div>
                          <div className="text-[10px] text-slate-400 font-sans leading-tight mt-0.5 truncate">
                            {item.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* Right Action: Mobile Hamburger Menu Toggle */}
          <div className="flex items-center space-x-2 lg:hidden">
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-700 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-emerald-400" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Subtle Dedicated Context Strip (Placed below the navigation so it never cramps the header) */}
      {(activeJobTitle || activeRepoName) && (
        <div className="bg-slate-950/70 border-t border-slate-800/70 text-[11px] font-mono text-slate-400 py-1 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <div className="flex items-center space-x-3 overflow-hidden">
              {activeJobTitle && (
                <div className="flex items-center space-x-1.5 truncate">
                  <span className="text-slate-500">Target:</span>
                  <span
                    className="text-emerald-400 font-medium truncate max-w-[200px] sm:max-w-xs md:max-w-md"
                    title={activeJobTitle}
                  >
                    {activeJobTitle}
                  </span>
                </div>
              )}
              {activeJobTitle && activeRepoName && <span className="text-slate-600">•</span>}
              {activeRepoName && (
                <div className="flex items-center space-x-1.5 truncate">
                  <span className="text-slate-500">Repository:</span>
                  <span
                    className="text-blue-400 font-medium truncate max-w-[180px] sm:max-w-xs md:max-w-sm"
                    title={activeRepoName}
                  >
                    {activeRepoName}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Navigation Shortcut */}
            <div className="hidden sm:flex items-center space-x-3 text-[10px]">
              <button
                onClick={() => handleNavClick('jobs')}
                className="text-slate-400 hover:text-slate-200 hover:underline transition-colors"
              >
                Change Role
              </button>
              <span className="text-slate-700">|</span>
              <button
                onClick={() => handleNavClick('github_repos')}
                className="text-slate-400 hover:text-slate-200 hover:underline transition-colors"
              >
                Switch Repo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Responsive Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-900 px-4 pt-3 pb-4 space-y-3 animate-in slide-in-from-top-2 duration-150">
          {/* Mobile Active Context Preview */}
          {(activeJobTitle || activeRepoName) && (
            <div className="bg-slate-950/80 rounded border border-slate-800 p-2.5 text-xs font-mono space-y-1">
              {activeJobTitle && (
                <div className="text-emerald-400 truncate">
                  <span className="text-slate-500">Target: </span>
                  {activeJobTitle}
                </div>
              )}
              {activeRepoName && (
                <div className="text-blue-400 truncate">
                  <span className="text-slate-500">Repo: </span>
                  {activeRepoName}
                </div>
              )}
            </div>
          )}

          {/* Primary Section */}
          <div className="space-y-1">
            <div className="text-[10px] font-mono uppercase text-slate-400 px-2 py-0.5">
              Core Navigation
            </div>
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-white border border-slate-700 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </button>
              );
            })}
          </div>

          {/* Secondary Tools Section */}
          <div className="space-y-1 pt-2 border-t border-slate-800/80">
            <div className="text-[10px] font-mono uppercase text-slate-400 px-2 py-0.5">
              Tools & Diagnostics
            </div>
            {secondaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-white border border-slate-700 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
