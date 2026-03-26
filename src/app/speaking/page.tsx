import { SpeakingPracticeShell } from '@/components/speaking/speaking-practice-shell';
import { SPEAKING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import { loadAssessmentPracticePageData } from '@/lib/server/assessment-workspace';

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SpeakingPage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await Promise.resolve(searchParams)) ?? {};
  const pageData = await loadAssessmentPracticePageData(SPEAKING_ASSESSMENT_MODULE_ID, {
    promptId: getSingleSearchParam(resolvedSearchParams.promptId),
    sessionId: getSingleSearchParam(resolvedSearchParams.sessionId),
  });

  return <SpeakingPracticeShell {...pageData} />;
}
