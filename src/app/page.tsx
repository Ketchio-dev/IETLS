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

function WritingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function ReadingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
  );
}

function SpeakingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
      <path d="M19 10v2a7 7 0 01-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function ListeningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0118 0v6" />
      <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
    </svg>
  );
}

const moduleIcons: Record<string, () => React.JSX.Element> = {
  writing: WritingIcon,
  reading: ReadingIcon,
  speaking: SpeakingIcon,
  listening: ListeningIcon,
};

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
      <section className="hero panel home-hero module-hub-hero">
        <div>
          <p className="eyebrow">IELTS Academic Platform</p>
          <h1>Your learning starts here. Pick a skill to practice.</h1>
          <p className="hero-copy">
            Four modules, one hub. Start with Writing, drill Reading passages, review Speaking progress,
            and watch Listening take shape as the platform grows.
          </p>
          <div className="hero-actions">
            <Link className="primary-button dashboard-link-button" href="/writing">
              Start writing practice
            </Link>
            <Link className="secondary-link-button" href="/reading">
              Open reading drills
            </Link>
          </div>
        </div>
        <div className="home-metric-row">
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
        </div>
      </section>

      <section className="module-hub-grid" aria-label="IELTS module hub">
        {moduleCards.map((moduleCard) => {
          const IconComponent = moduleIcons[moduleCard.id];

          return (
            <article className="panel module-card" data-module={moduleCard.id} key={moduleCard.id}>
              <div className="module-card-header">
                <div className="module-card-heading">
                  {IconComponent ? (
                    <div className="module-icon" aria-hidden="true">
                      <IconComponent />
                    </div>
                  ) : null}
                  <div>
                    <p className="eyebrow">{moduleCard.eyebrow}</p>
                    <h2>{moduleCard.name}</h2>
                  </div>
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
          );
        })}
      </section>
    </main>
  );
}
