import Link from 'next/link';

import { WritingPracticeShell } from '@/components/writing/writing-practice-shell';
import { loadDefaultAssessmentPracticePageData } from '@/lib/server/assessment-workspace';

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function WritingPage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await Promise.resolve(searchParams)) ?? {};
  const pageData = await loadDefaultAssessmentPracticePageData({
    promptId: getSingleSearchParam(resolvedSearchParams.promptId),
    attemptId: getSingleSearchParam(resolvedSearchParams.attemptId),
  });
  const promptCount = pageData.prompts?.length ?? 0;
  const historyCount = pageData.initialHistory?.length ?? 0;

  return (
    <main className="app-shell">
      <nav className="page-breadcrumb page-breadcrumb--writing" aria-label="Breadcrumb">
        <Link href="/" className="breadcrumb-link">Home</Link>
        <span className="breadcrumb-sep" aria-hidden="true">/</span>
        <span className="breadcrumb-current">Writing practice</span>
      </nav>

      <header className="practice-page-header practice-page-header--writing" aria-label="Writing practice overview">
        <div className="practice-page-header-text">
          <p className="eyebrow practice-page-eyebrow">Primary practice track</p>
          <h1 className="practice-page-title">Writing practice</h1>
          <p className="practice-page-subtitle">
            Timed essays with persistent reports, band tracking, and a dedicated dashboard.
          </p>
        </div>
        <div className="practice-page-meta" aria-label="Session snapshot">
          <span className="practice-meta-chip" data-module="writing">
            <strong>{promptCount}</strong> {promptCount === 1 ? 'prompt' : 'prompts'}
          </span>
          {historyCount > 0 ? (
            <span className="practice-meta-chip" data-module="writing">
              <strong>{historyCount}</strong> recent {historyCount === 1 ? 'attempt' : 'attempts'}
            </span>
          ) : null}
          <Link href="/dashboard" className="practice-meta-link" data-module="writing">
            View dashboard
          </Link>
        </div>
      </header>

      <WritingPracticeShell {...pageData} />
    </main>
  );
}
