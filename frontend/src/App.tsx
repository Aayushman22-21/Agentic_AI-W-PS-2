import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { JobDiscoveryPage } from './pages/JobDiscoveryPage';
import { JobDetailsPage } from './pages/JobDetailsPage';
import { RepoSelectionPage } from './pages/RepoSelectionPage';
import { SkillAssessmentPage } from './pages/SkillAssessmentPage';
import { EvidenceExplorerPage } from './pages/EvidenceExplorerPage';
import { AssessmentHistoryPage } from './pages/AssessmentHistoryPage';
import { EventStatusPage } from './pages/EventStatusPage';
import { SettingsPage } from './pages/SettingsPage';
import { PageView, DiscoveredJob, StoredAssessment } from './types';
import { api } from './services/api';

export function App() {
  const [currentPage, setCurrentPage] = useState<PageView>('dashboard');
  const [jobs, setJobs] = useState<DiscoveredJob[]>([]);
  const [assessments, setAssessments] = useState<StoredAssessment[]>([]);
  const [selectedJob, setSelectedJob] = useState<DiscoveredJob | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<StoredAssessment | null>(null);
  const [evidenceSkillFilter, setEvidenceSkillFilter] = useState<string | null>(null);

  const fetchInitialData = async () => {
    try {
      const jobList = await api.getJobs();
      setJobs(jobList);
      if (jobList.length > 0 && !selectedJob) {
        setSelectedJob(jobList[0]);
      }

      const asmtList = await api.getAllAssessments();
      setAssessments(asmtList);
      if (asmtList.length > 0 && !selectedAssessment) {
        setSelectedAssessment(asmtList[0]);
      }
    } catch (err) {
      console.error('Error fetching initial data:', err);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleAssessmentCompleted = (newAsmt: StoredAssessment) => {
    setSelectedAssessment(newAsmt);
    setAssessments((prev) => [newAsmt, ...prev]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        activeJobTitle={selectedJob?.title}
        activeRepoName={selectedAssessment?.repositoryFullName}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentPage === 'dashboard' && (
          <DashboardPage
            jobs={jobs}
            assessments={assessments}
            onNavigate={setCurrentPage}
            onSelectJob={(j) => setSelectedJob(j)}
            onSelectAssessment={(a) => setSelectedAssessment(a)}
          />
        )}

        {currentPage === 'jobs' && (
          <JobDiscoveryPage
            jobs={jobs}
            onRefreshJobs={fetchInitialData}
            onSelectJob={(j) => setSelectedJob(j)}
            onNavigate={setCurrentPage}
          />
        )}

        {currentPage === 'job_details' && (
          <JobDetailsPage
            job={selectedJob}
            onNavigate={setCurrentPage}
          />
        )}

        {currentPage === 'github_repos' && (
          <RepoSelectionPage
            activeJob={selectedJob}
            onAssessmentCompleted={handleAssessmentCompleted}
            onNavigate={setCurrentPage}
          />
        )}

        {currentPage === 'assessment' && (
          <SkillAssessmentPage
            assessment={selectedAssessment}
            onNavigate={setCurrentPage}
            onSelectSkillForEvidence={(sk) => setEvidenceSkillFilter(sk)}
          />
        )}

        {currentPage === 'evidence' && (
          <EvidenceExplorerPage
            assessment={selectedAssessment}
            selectedSkillFilter={evidenceSkillFilter}
            onNavigate={setCurrentPage}
          />
        )}

        {currentPage === 'history' && (
          <AssessmentHistoryPage
            assessments={assessments}
            onSelectAssessment={(a) => setSelectedAssessment(a)}
            onNavigate={setCurrentPage}
          />
        )}

        {currentPage === 'event_status' && (
          <EventStatusPage />
        )}

        {currentPage === 'settings' && (
          <SettingsPage />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-xs text-slate-500 font-mono text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>AI Career Coach • Verifiable Code Evidence Assessment System</span>
          <span>Portions of skill vocabularies adapted from JaweriaAsif745/Resume-github-job-analyzer (MIT License)</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
