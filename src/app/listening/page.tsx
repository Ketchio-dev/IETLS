import { AssessmentPlaceholderShell } from '@/components/assessment/assessment-placeholder-shell';
import { LISTENING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import { loadAssessmentPracticePageData } from '@/lib/server/assessment-workspace';

export default async function ListeningPage() {
  const pageData = await loadAssessmentPracticePageData(LISTENING_ASSESSMENT_MODULE_ID, {});

  return <AssessmentPlaceholderShell {...pageData} />;
}
