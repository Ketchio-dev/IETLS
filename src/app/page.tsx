import Link from 'next/link';

import {
  LISTENING_ASSESSMENT_MODULE_ID,
  READING_ASSESSMENT_MODULE_ID,
  SPEAKING_ASSESSMENT_MODULE_ID,
} from '@/lib/assessment-modules/registry';
import {
  loadAssessmentDashboardPageData,
  loadDefaultAssessmentDashboardPageData,
} from '@/lib/server/assessment-workspace';

interface ModuleCardAction {
  href: string;
  label: string;
  variant: 'primary' | 'secondary';
}

interface ModuleCardStat {
  label: string;
  value: string;
}

interface ModuleCard {
  id: string;
  eyebrow: string;
  name: string;
  status: 'Full' | 'Alpha' | 'Placeholder';
  description: string;
  stats: ModuleCardStat[];
  actions: ModuleCardAction[];
}

function formatBand(value: number | null) {
  return value == null ? 'No data yet' : `Band ${value.toFixed(1)}`;
}

export default async function HomePage() {
  const [writingDashboard, readingDashboard, speakingDashboard, listeningDashboard] = await Promise.all([
    loadDefaultAssessmentDashboardPageData(),
    loadAssessmentDashboardPageData(READING_ASSESSMENT_MODULE_ID),
    loadAssessmentDashboardPageData(SPEAKING_ASSESSMENT_MODULE_ID),
    loadAssessmentDashboardPageData(LISTENING_ASSESSMENT_MODULE_ID),
  ]);

  const moduleCards: ModuleCard[] = [
    {
      id: 'writing',
      eyebrow: 'Established workflow',
      name: 'Writing',
      status: 'Full',
      description: 'Timed academic writing practice with persistent reports, score trends, and a dedicated dashboard.',
      stats: [
        { label: 'Saved attempts', value: String(writingDashboard.summary.totalAttempts) },
        { label: 'Prompt bank', value: String(writingDashboard.prompts.length) },
        { label: 'Average band', value: formatBand(writingDashboard.summary.averageBand) },
      ],
      actions: [
        { href: '/writing', label: 'Open practice', variant: 'primary' },
        { href: '/dashboard', label: 'View dashboard', variant: 'secondary' },
      ],
    },
    {
      id: 'reading',
      eyebrow: 'Imported drill bank',
      name: 'Reading',
      status: 'Full',
      description: 'Passage-based reading drills with imported sets, deterministic scoring, and evidence-backed review.',
      stats: [
        { label: 'Passages', value: String(readingDashboard.availableSets.length) },
        { label: 'Attempts', value: String(readingDashboard.dashboardSummary.totalAttempts) },
        {
          label: 'Latest import',
          value: readingDashboard.importSummary.latestImportedAt ? 'Ready' : 'Missing',
        },
      ],
      actions: [
        { href: '/reading', label: 'Open practice', variant: 'primary' },
        { href: '/reading/dashboard', label: 'View dashboard', variant: 'secondary' },
      ],
    },
    {
      id: 'speaking',
      eyebrow: 'Alpha module',
      name: 'Speaking',
      status: 'Alpha',
      description: 'Transcript-first speaking practice that validates the workflow before full audio capture lands.',
      stats: [
        { label: 'Sessions', value: String(speakingDashboard.summary.totalSessions) },
        { label: 'Best band', value: formatBand(speakingDashboard.summary.bestBand) },
        { label: 'Audio-backed', value: String(speakingDashboard.summary.sessionsWithAudio) },
      ],
      actions: [
        { href: '/speaking', label: 'Open alpha', variant: 'primary' },
        { href: '/speaking/dashboard', label: 'View dashboard', variant: 'secondary' },
      ],
    },
    {
      id: 'listening',
      eyebrow: 'Future seam',
      name: 'Listening',
      status: 'Placeholder',
      description: 'Route coverage is in place, but scripts, audio, and answer-timing validation are still future work.',
      stats: listeningDashboard.statusCards.slice(0, 3).map((card) => ({
        label: card.label,
        value: card.value,
      })),
      actions: [{ href: '/listening', label: 'Open placeholder', variant: 'secondary' }],
    },
  ];

  return (
    <main className="app-shell">
      <section className="hero panel module-hub-hero">
        <div>
          <p className="eyebrow">IELTS Academic Platform</p>
          <h1>Choose the right practice track from one shared hub</h1>
          <p className="hero-copy">
            Start with Writing, switch into Reading drills, review Speaking alpha progress, and keep
            Listening clearly marked as upcoming work.
          </p>
          <div className="hero-actions">
            <Link className="primary-button dashboard-link-button" href="/writing">
              Start writing
            </Link>
            <Link className="secondary-link-button" href="/reading">
              Open reading bank
            </Link>
          </div>
        </div>
        <div className="hero-metrics">
          <div className="metric-card">
            <span>Modules</span>
            <strong>4 tracks</strong>
          </div>
          <div className="metric-card">
            <span>Writing saved</span>
            <strong>{writingDashboard.summary.totalAttempts}</strong>
          </div>
          <div className="metric-card">
            <span>Reading passages</span>
            <strong>{readingDashboard.availableSets.length}</strong>
          </div>
          <div className="metric-card">
            <span>Speaking status</span>
            <strong>Alpha</strong>
          </div>
        </div>
      </section>

      <section className="module-hub-grid" aria-label="IELTS module hub">
        {moduleCards.map((moduleCard) => (
          <article className="panel module-card" key={moduleCard.id}>
            <div className="module-card-header">
              <div>
                <p className="eyebrow">{moduleCard.eyebrow}</p>
                <h2>{moduleCard.name}</h2>
              </div>
              <span className="status-badge" data-status={moduleCard.status}>
                {moduleCard.status}
              </span>
            </div>

            <p className="summary-copy">{moduleCard.description}</p>

            <div className="module-stat-grid">
              {moduleCard.stats.map((stat) => (
                <div className="module-stat-card" key={`${moduleCard.id}-${stat.label}`}>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </div>
              ))}
            </div>

            <div className="module-card-actions">
              {moduleCard.actions.map((action) => (
                <Link
                  className={
                    action.variant === 'primary'
                      ? 'primary-button dashboard-link-button'
                      : 'secondary-link-button'
                  }
                  href={action.href}
                  key={`${moduleCard.id}-${action.href}`}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
