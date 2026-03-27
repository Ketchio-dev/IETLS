import { SpeakingAlphaDisabled } from '@/components/speaking/speaking-alpha-disabled';
import { SpeakingDashboard } from '@/components/speaking/speaking-dashboard';
import { SPEAKING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import { isSpeakingAlphaEnabled } from '@/lib/server/module-flags';
import { loadAssessmentDashboardPageData } from '@/lib/server/assessment-workspace';

export default async function SpeakingDashboardPage() {
  if (!isSpeakingAlphaEnabled()) {
    return <SpeakingAlphaDisabled context="dashboard" />;
  }

  const pageData = await loadAssessmentDashboardPageData(SPEAKING_ASSESSMENT_MODULE_ID);

  return <SpeakingDashboard {...pageData} />;
}
