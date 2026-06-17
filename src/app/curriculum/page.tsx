import Link from 'next/link';

import { StudyPlanPanel } from '@/components/dashboard';
import {
  READING_ASSESSMENT_MODULE_ID,
} from '@/lib/assessment-modules/registry';
import {
  loadAssessmentDashboardPageData,
  loadDefaultAssessmentDashboardPageData,
} from '@/lib/server/assessment-workspace';
import { buildCurriculumPageData } from '@/lib/services/curriculum';
import { loadReviewDeckSummary } from '@/lib/services/review/application-service';

export default async function CurriculumPage() {
  const [writingDashboard, readingDashboard, reviewSummary] = await Promise.all([
    loadDefaultAssessmentDashboardPageData(),
    loadAssessmentDashboardPageData(READING_ASSESSMENT_MODULE_ID),
    loadReviewDeckSummary(),
  ]);
  const curriculum = buildCurriculumPageData({
    writing: writingDashboard,
    reading: readingDashboard,
    review: {
      dueCount: reviewSummary.dueCount,
      totalTracked: reviewSummary.totalTracked,
      nextDueAt: reviewSummary.nextDueAt,
    },
  });
  const primaryStep = curriculum.primaryModule.currentStep;
  const primaryHref = primaryStep?.actionHref ?? curriculum.primaryModule.href;

  return (
    <main className="app-shell">
      <nav className="page-breadcrumb" aria-label="Breadcrumb">
        <Link className="breadcrumb-link" href="/">Home</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Curriculum</span>
      </nav>

      <section className="hero panel dashboard-hero curriculum-hero">
        <div>
          <p className="eyebrow">IELTS curriculum</p>
          <h1>{curriculum.headline}</h1>
          <p className="hero-copy">{curriculum.summary}</p>
          <div className="dashboard-actions">
            <Link className="primary-button dashboard-link-button" href={primaryHref}>
              Start current step
            </Link>
            <Link className="secondary-link-button" href={curriculum.primaryModule.dashboardHref}>
              Open {curriculum.primaryModule.label} dashboard
            </Link>
          </div>
        </div>
        <aside className="curriculum-current-card" aria-label="Current curriculum step">
          <span className="band-chip">{curriculum.primaryModule.label}</span>
          <h2>{primaryStep?.title ?? 'Plan ready'}</h2>
          <p>{primaryStep?.detail ?? curriculum.primaryModule.plan.summary}</p>
          {primaryStep?.completionSignal ? (
            <p className="summary-copy">
              <strong>Finish when:</strong> {primaryStep.completionSignal}
            </p>
          ) : null}
        </aside>
      </section>

      <section className="curriculum-today-section">
        <article className="panel student-plan-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Today</p>
              <h2>Do these in order</h2>
            </div>
            <span className="section-tag section-tag--muted">
              {curriculum.todaySteps.length} step{curriculum.todaySteps.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="history-list curriculum-today-list">
            {curriculum.todaySteps.map((step, index) => (
              <article className="history-card curriculum-step-card" key={`${step.moduleId}-${step.id}`}>
                <div className="history-card-header">
                  <strong>{index + 1}. {step.title}</strong>
                  <span>{step.moduleLabel}</span>
                </div>
                <p>{step.detail}</p>
                <ul className="plain-list compact-list">
                  {step.actions.slice(0, 3).map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
                {step.completionSignal ? (
                  <p className="summary-copy">
                    <strong>Finish when:</strong> {step.completionSignal}
                  </p>
                ) : null}
                {step.actionHref && step.actionLabel ? (
                  <div className="hero-actions">
                    <Link className="primary-button dashboard-link-button" href={step.actionHref}>
                      {step.actionLabel}
                    </Link>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="workspace-column curriculum-path-section" aria-labelledby="curriculum-path-heading">
        <div className="panel primary-section-header">
          <p className="eyebrow">Full path</p>
          <h2 id="curriculum-path-heading">Use this when you want to look ahead.</h2>
          <p className="summary-copy">
            The app still keeps the complete Reading and Writing plan here, but your main work starts with today&apos;s
            two cards above.
          </p>
        </div>
        <div className="curriculum-path-grid">
          {curriculum.modules.map((module) => (
            <StudyPlanPanel
              key={module.id}
              plan={module.plan}
              title={`${module.label} path`}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
