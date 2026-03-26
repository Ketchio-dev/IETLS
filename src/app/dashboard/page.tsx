import { WritingDashboard } from '@/components/writing/writing-dashboard';
import { getAssessmentModule } from '@/lib/assessment-modules/registry';

export default async function DashboardPage() {
  const writingModule = getAssessmentModule('writing');
  const pageData = await writingModule.loadDashboardPageData();

  return <WritingDashboard {...pageData} />;
}
