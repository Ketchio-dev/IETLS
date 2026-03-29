import Link from 'next/link';

import { ReadingPracticeShell } from '@/components/reading/reading-practice-shell';
import { READING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import { loadAssessmentPracticePageData } from '@/lib/server/assessment-workspace';

export default async function ReadingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const pageData = await loadAssessmentPracticePageData(READING_ASSESSMENT_MODULE_ID, resolvedSearchParams);
  const passageCount = pageData.availableSets?.length ?? 0;
  const attemptCount = pageData.recentAttempts?.length ?? 0;

  return (
    <main className="app-shell">
      <nav className="page-breadcrumb page-breadcrumb--reading" aria-label="Breadcrumb">
        <Link href="/" className="breadcrumb-link">Home</Link>
        <span className="breadcrumb-sep" aria-hidden="true">/</span>
        <span className="breadcrumb-current">Reading practice</span>
      </nav>

      <header className="practice-page-header practice-page-header--reading" aria-label="Reading practice overview">
        <div className="practice-page-header-text">
          <p className="eyebrow practice-page-eyebrow">IELTS Academic Reading</p>
          <h1 className="practice-page-title">Practice IELTS Reading with scored practice sets</h1>
          <p className="practice-page-subtitle">
            Work through a full passage under time pressure, then use the score report and coaching notes to sharpen the next set.
          </p>
        </div>
        <div className="practice-page-meta" aria-label="Session snapshot">
          <span className="practice-meta-chip" data-module="reading">
            <strong>{passageCount}</strong> {passageCount === 1 ? 'set' : 'sets'}
          </span>
          {attemptCount > 0 ? (
            <span className="practice-meta-chip" data-module="reading">
              <strong>{attemptCount}</strong> recent {attemptCount === 1 ? 'attempt' : 'attempts'}
            </span>
          ) : null}
          <Link href="/reading/dashboard" className="practice-meta-link" data-module="reading">
            View dashboard
          </Link>
        </div>
      </header>

      <ReadingPracticeShell {...pageData} />
    </main>
  );
}
