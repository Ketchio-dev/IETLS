import Link from 'next/link';

import { ReadingDashboard } from '@/components/reading/reading-dashboard';
import { READING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import { loadAssessmentDashboardPageData } from '@/lib/server/assessment-workspace';

export default async function ReadingDashboardPage() {
  const pageData = await loadAssessmentDashboardPageData(READING_ASSESSMENT_MODULE_ID);
  const totalAttempts = pageData.dashboardSummary.totalAttempts;
  const setCount = pageData.availableSets.length;

  return (
    <main className="app-shell">
      <nav className="page-breadcrumb page-breadcrumb--reading" aria-label="Breadcrumb">
        <Link href="/" className="breadcrumb-link">Home</Link>
        <span className="breadcrumb-sep" aria-hidden="true">/</span>
        <Link href="/reading" className="breadcrumb-link">Reading</Link>
        <span className="breadcrumb-sep" aria-hidden="true">/</span>
        <span className="breadcrumb-current">Dashboard</span>
      </nav>

      <header className="dashboard-header-section dashboard-header-section--reading" aria-label="Reading dashboard overview">
        <div className="dashboard-header-text">
          <p className="eyebrow">Primary practice track</p>
          <h1 className="dashboard-header-title">Reading dashboard</h1>
          <p className="dashboard-header-subtitle">
            {totalAttempts > 0
              ? `${totalAttempts} ${totalAttempts === 1 ? 'attempt' : 'attempts'} tracked across ${setCount} imported ${setCount === 1 ? 'set' : 'sets'}.`
              : 'Bring your imported drills and first scored attempts here to track reading momentum.'}
          </p>
        </div>
        <div className="dashboard-header-actions">
          <Link href="/reading" className="primary-button dashboard-link-button dashboard-resume-cta dashboard-resume-cta--reading">
            Continue reading
          </Link>
          <Link href="/dashboard" className="secondary-link-button">
            Switch to writing
          </Link>
        </div>
      </header>

      <nav className="dashboard-tab-bar" aria-label="Dashboard navigation">
        <span className="dashboard-tab dashboard-tab--active dashboard-tab--active-reading">
          <span className="site-nav-dot site-nav-dot--reading" aria-hidden="true" />
          Reading dashboard
        </span>
        <Link href="/dashboard" className="dashboard-tab">
          <span className="site-nav-dot site-nav-dot--writing" aria-hidden="true" />
          Writing dashboard
        </Link>
      </nav>

      <ReadingDashboard {...pageData} />
    </main>
  );
}
