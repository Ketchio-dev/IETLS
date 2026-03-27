import Link from 'next/link';

import { WritingDashboard } from '@/components/writing/writing-dashboard';
import { loadDefaultAssessmentDashboardPageData } from '@/lib/server/assessment-workspace';

export default async function DashboardPage() {
  const pageData = await loadDefaultAssessmentDashboardPageData();

  return (
    <main className="app-shell">
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
