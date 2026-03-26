import { WritingDashboard } from '@/components/writing/writing-dashboard';
import { loadWritingDashboardPageData } from '@/lib/services/writing/application-service';

export default async function DashboardPage() {
  const pageData = await loadWritingDashboardPageData();

  return <WritingDashboard {...pageData} />;
}
