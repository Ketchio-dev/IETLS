import Link from 'next/link';

import { WritingDashboard } from '@/components/writing/writing-dashboard';
import { loadDefaultAssessmentDashboardPageData } from '@/lib/server/assessment-workspace';

export default async function DashboardPage() {
  const pageData = await loadDefaultAssessmentDashboardPageData();
  const totalAttempts = pageData.summary?.totalAttempts ?? 0;
  const headline = pageData.studyPlan?.headline;

  return (
    <main className="app-shell">
      <nav className="page-breadcrumb page-breadcrumb--writing" aria-label="Breadcrumb">
        <Link href="/" className="breadcrumb-link">Home</Link>
        <span className="breadcrumb-sep" aria-hidden="true">/</span>
        <span className="breadcrumb-current">Writing dashboard</span>
      </nav>

      <header className="dashboard-header-section" aria-label="Dashboard overview">
        <div className="dashboard-header-text">
          <p className="eyebrow">Your progress</p>
          <h1 className="dashboard-header-title">Writing dashboard</h1>
          <p className="dashboard-header-subtitle">
            {totalAttempts > 0
              ? `${totalAttempts} ${totalAttempts === 1 ? 'attempt' : 'attempts'} tracked across your writing sessions.`
              : 'Start practising to see your progress here.'}
            {headline ? ` ${headline}.` : null}
          </p>
        </div>
        <div className="dashboard-header-actions">
          <Link href="/writing" className="primary-button dashboard-link-button dashboard-resume-cta">
            Continue writing
          </Link>
          <Link href="/reading" className="secondary-link-button">
            Switch to reading
          </Link>
        </div>
      </header>

      <nav className="dashboard-tab-bar" aria-label="Dashboard navigation">
        <Link href="/reading/dashboard" className="dashboard-tab">
          <span className="site-nav-dot site-nav-dot--reading" aria-hidden="true" />
          Reading dashboard
        </Link>
        <span className="dashboard-tab dashboard-tab--active">
          <span className="site-nav-dot site-nav-dot--writing" aria-hidden="true" />
          Writing dashboard
        </span>
      </nav>
      <WritingDashboard {...pageData} />
    </main>
  );
}
