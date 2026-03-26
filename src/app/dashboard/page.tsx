import { WritingDashboard } from '@/components/writing/writing-dashboard';
import { loadAssessmentWorkspaceDashboardPageData } from '@/lib/server/assessment-module-registry';

export default async function DashboardPage() {
  const pageData = await loadAssessmentWorkspaceDashboardPageData();

  return <WritingDashboard {...pageData} />;
}
