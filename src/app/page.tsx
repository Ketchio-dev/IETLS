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
  priority: 'primary' | 'secondary';
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

function formatAccuracy(value: number | null) {
  return value == null ? 'No data yet' : `${Math.round(value)}%`;
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

function renderModuleCards(moduleCards: ModuleCard[]) {
  return moduleCards.map((moduleCard) => {
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
  });
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
      id: 'reading',
      priority: 'primary',
      eyebrow: 'Primary practice track',
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
        { href: '/reading', label: 'Start reading practice', variant: 'primary' },
        { href: '/reading/dashboard', label: 'View dashboard', variant: 'secondary' },
      ],
    },
    {
      id: 'writing',
      priority: 'primary',
      eyebrow: 'Primary practice track',
      name: 'Writing',
      status: 'Full',
      description: 'Timed academic writing practice with persistent reports, score trends, and a dedicated dashboard.',
      stats: [
        { label: 'Saved attempts', value: String(writingDashboard.summary.totalAttempts) },
        { label: 'Prompt bank', value: String(writingDashboard.prompts.length) },
        { label: 'Average band', value: formatBand(writingDashboard.summary.averageBand) },
      ],
      actions: [
        { href: '/writing', label: 'Start writing practice', variant: 'primary' },
        { href: '/dashboard', label: 'View dashboard', variant: 'secondary' },
      ],
    },
    {
      id: 'speaking',
      priority: 'secondary',
      eyebrow: 'Experimental module',
      name: 'Speaking',
      status: 'Alpha',
      description:
        'Transcript-first speaking practice stays available as an experimental add-on while Reading and Writing lead the main flow.',
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
      priority: 'secondary',
      eyebrow: 'Secondary placeholder',
      name: 'Listening',
      status: 'Placeholder',
      description:
        'The route coverage remains in place, but scripts, audio, and answer-timing validation are still placeholder work.',
      stats: listeningDashboard.statusCards.slice(0, 3).map((card) => ({
        label: card.label,
        value: card.value,
      })),
      actions: [{ href: '/listening', label: 'Open placeholder', variant: 'secondary' }],
    },
  ];

  const primaryModuleCards = moduleCards.filter((moduleCard) => moduleCard.priority === 'primary');
  const secondaryModuleCards = moduleCards.filter((moduleCard) => moduleCard.priority === 'secondary');
  const routePills = [
    { id: 'reading', label: 'Reading', status: 'Core' },
    { id: 'writing', label: 'Writing', status: 'Core' },
    { id: 'speaking', label: 'Speaking', status: 'Explore' },
    { id: 'listening', label: 'Listening', status: 'Seam' },
  ] as const;

  return (
    <main className="app-shell">
      <section className="hero panel home-hero module-hub-hero">
        <div className="hero-copy-stack">
          <p className="eyebrow">IELTS Academic Reading + Writing</p>
          <div className="route-pill-row" aria-label="Route status summary">
            {routePills.map((route) => (
              <span className="route-pill" data-module={route.id} key={route.id}>
                <span>{route.label}</span>
                <strong>{route.status}</strong>
              </span>
            ))}
          </div>
          <h1>Start with Reading and Writing. Keep Speaking and Listening in reserve.</h1>
          <p className="hero-copy">
            The app now prioritizes passage drills and writing practice in the homepage flow and top
            navigation. Speaking remains experimental, and Listening stays a placeholder while the
            broader assessment seam evolves.
          </p>
          <div className="hero-actions">
            <Link className="primary-button dashboard-link-button" href="/reading">
              Start reading practice
            </Link>
            <Link className="secondary-link-button" href="/writing">
              Open writing practice
            </Link>
          </div>
        </div>
        <aside className="hero-focus-panel" aria-label="Current product focus">
          <div className="hero-focus-header">
            <p className="eyebrow">Current product focus</p>
            <h2>Put the production energy where the app is already strongest.</h2>
          </div>
          <div className="home-metric-row">
            <div className="metric-card">
              <span>Primary tracks</span>
              <strong>2 core routes</strong>
            </div>
            <div className="metric-card">
              <span>Reading passages</span>
              <strong>{readingDashboard.availableSets.length}</strong>
            </div>
            <div className="metric-card">
              <span>Writing prompts</span>
              <strong>{writingDashboard.prompts.length}</strong>
            </div>
          </div>
          <div className="focus-signal-grid" aria-label="Reading and writing focus signals">
            <article className="focus-signal-card" data-module="reading">
              <span className="focus-signal-label">Reading momentum</span>
              <strong>{formatAccuracy(readingDashboard.dashboardSummary.averagePercentage)}</strong>
              <p>Average accuracy across {readingDashboard.dashboardSummary.totalAttempts} recorded attempts.</p>
            </article>
            <article className="focus-signal-card" data-module="writing">
              <span className="focus-signal-label">Writing band</span>
              <strong>{formatBand(writingDashboard.summary.averageBand)}</strong>
              <p>{writingDashboard.studyPlan.headline}</p>
            </article>
            <article className="focus-signal-card" data-module="listening">
              <span className="focus-signal-label">Secondary routes</span>
              <strong>Kept live</strong>
              <p>Speaking stays alpha and Listening stays placeholder without crowding the main flow.</p>
            </article>
          </div>
        </aside>
      </section>

      <section className="workspace-column" aria-labelledby="primary-ia-heading">
        <div className="panel">
          <p className="eyebrow">Primary information architecture</p>
          <h2 id="primary-ia-heading">Reading and Writing stay at the center of the app.</h2>
          <p className="summary-copy">
            Use these two core workspaces for regular practice. They sit first in the navigation,
            lead the homepage, and carry the strongest production-ready workflows today.
          </p>
          <div className="section-tag-row" aria-label="Primary module highlights">
            <span className="section-tag">Reading leads with imported passage drills</span>
            <span className="section-tag">Writing keeps the scoring and report loop</span>
          </div>
        </div>
        <div className="module-hub-grid" aria-label="Primary IELTS practice modules">
          {renderModuleCards(primaryModuleCards)}
        </div>
      </section>

      <section className="workspace-column" aria-labelledby="secondary-ia-heading">
        <div className="panel">
          <p className="eyebrow">Secondary modules</p>
          <h2 id="secondary-ia-heading">Speaking and Listening remain available, but secondary.</h2>
          <p className="summary-copy">
            These routes stay registered for experimentation and future expansion without competing
            with the primary Reading and Writing journey.
          </p>
          <div className="section-tag-row" aria-label="Secondary module highlights">
            <span className="section-tag section-tag--muted">Speaking is still an alpha practice lane</span>
            <span className="section-tag section-tag--muted">Listening keeps the placeholder seam visible</span>
          </div>
        </div>
        <div className="module-hub-grid" aria-label="Secondary IELTS modules">
          {renderModuleCards(secondaryModuleCards)}
        </div>
      </section>
    </main>
  );
}
