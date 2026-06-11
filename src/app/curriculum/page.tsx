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

export default async function CurriculumPage() {
  const [writingDashboard, readingDashboard] = await Promise.all([
    loadDefaultAssessmentDashboardPageData(),
    loadAssessmentDashboardPageData(READING_ASSESSMENT_MODULE_ID),
  ]);
  const curriculum = buildCurriculumPageData({
    writing: writingDashboard,
    reading: readingDashboard,
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

      <section className="hero panel dashboard-hero">
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
        <div className="hero-metrics">
          {curriculum.modules.map((module) => (
            <div className="metric-card" key={module.id}>
              <span>{module.label}</span>
              <strong>{module.completedSteps}/{module.totalSteps}</strong>
              <p>{module.currentStep?.title ?? 'Plan ready'}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="workspace-grid dashboard-grid">
        <div className="workspace-column left-column">
          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Today</p>
                <h2>Do these in order</h2>
              </div>
            </div>
            <div className="history-list">
              {curriculum.todaySteps.map((step, index) => (
                <article className="history-card" key={`${step.moduleId}-${step.id}`}>
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
        </div>

        <div className="workspace-column right-column">
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
