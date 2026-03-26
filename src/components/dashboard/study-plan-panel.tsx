import { formatBandRange, formatCountLabel, formatTaskTypeList } from './dashboard-formatting';
import type { DashboardStudyPlan, DashboardStudyPlanStep } from './dashboard-types';

interface Props {
  plan: DashboardStudyPlan | null;
  title?: string;
  emptyMessage?: string;
}

function StudyPlanStepCard({ step }: { step: DashboardStudyPlanStep }) {
  return (
    <article className="history-card">
      <div className="section-heading">
        <div>
          <h3>{step.title}</h3>
          <p className="summary-copy">{step.detail}</p>
        </div>
        <div style={{ display: 'grid', gap: '0.5rem', justifyItems: 'end' }}>
          {step.sessionLabel ? <span className="band-chip">{step.sessionLabel}</span> : null}
          {step.criterion ? <span className="band-chip">{step.criterion}</span> : null}
        </div>
      </div>

      <div className="history-meta">
        <span>{formatTaskTypeList(step.taskTypes)}</span>
        <span>{formatBandRange(step.targetRange)}</span>
      </div>

      <ul className="plain-list compact-list">
        {step.actions.map((action) => (
          <li key={action}>{action}</li>
        ))}
      </ul>
    </article>
  );
}

export function StudyPlanPanel({
  plan,
  title = 'Recommended study plan',
  emptyMessage = 'Complete a few scored attempts to unlock a more specific study plan.',
}: Props) {
  return (
    <section className="panel" aria-label="Study plan">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Next best practice block</p>
          <h2>{title}</h2>
          <p className="summary-copy">{plan?.summary ?? emptyMessage}</p>
        </div>
        <div style={{ display: 'grid', gap: '0.5rem', justifyItems: 'end' }}>
          {plan ? <span className="band-chip">{plan.horizonLabel}</span> : null}
          {plan?.recommendedSessionLabel ? (
            <span className="band-chip">{plan.recommendedSessionLabel}</span>
          ) : null}
        </div>
      </div>

      {plan ? (
        <>
          <div className="history-list">
            {plan.steps.map((step) => (
              <StudyPlanStepCard key={step.id} step={step} />
            ))}
          </div>

          {plan.carryForward && plan.carryForward.length > 0 ? (
            <div style={{ marginTop: '1rem' }}>
              <div className="section-heading">
                <h3>Keep carrying forward</h3>
                <span className="band-chip">{formatCountLabel(plan.carryForward.length, 'habit')}</span>
              </div>
              <ul className="plain-list compact-list">
                {plan.carryForward.map((habit) => (
                  <li key={habit}>{habit}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
