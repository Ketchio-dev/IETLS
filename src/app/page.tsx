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
import { isSpeakingAlphaEnabled } from '@/lib/server/module-flags';
import { buildCurriculumPageData } from '@/lib/services/curriculum';
import { loadReviewDeckSummary } from '@/lib/services/review/application-service';

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
  const speakingAlphaEnabled = isSpeakingAlphaEnabled();
  const [writingDashboard, readingDashboard, speakingDashboard, listeningDashboard, reviewSummary] = await Promise.all([
    loadDefaultAssessmentDashboardPageData(),
    loadAssessmentDashboardPageData(READING_ASSESSMENT_MODULE_ID),
    speakingAlphaEnabled ? loadAssessmentDashboardPageData(SPEAKING_ASSESSMENT_MODULE_ID) : Promise.resolve(null),
    loadAssessmentDashboardPageData(LISTENING_ASSESSMENT_MODULE_ID),
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

  const moduleCards: ModuleCard[] = [
    {
      id: 'reading',
      priority: 'primary',
      eyebrow: 'Ready now',
      name: 'Reading',
      status: 'Full',
      description: 'Timed passage practice with clear answer-key feedback, coaching, and saved set history.',
      stats: [
        { label: 'Passages', value: String(readingDashboard.availableSets.length) },
        { label: 'Attempts', value: String(readingDashboard.dashboardSummary.totalAttempts) },
        {
          label: 'Collections',
          value: String(readingDashboard.importSummary.detectedSourceFiles.length),
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
      eyebrow: 'Ready now',
      name: 'Writing',
      status: 'Full',
      description: 'Timed essay practice with an expanded prompt bank, AI-assisted practice estimates, and revision-first feedback.',
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
    ...(speakingAlphaEnabled && speakingDashboard
      ? [{
          id: 'speaking',
          priority: 'secondary' as const,
          eyebrow: 'Preview',
          name: 'Speaking',
          status: 'Alpha' as const,
          description:
            'Transcript-first speaking practice stays available as an experimental add-on while Reading and Writing lead the main flow.',
          stats: [
            { label: 'Sessions', value: String(speakingDashboard.summary.totalSessions) },
            { label: 'Best band', value: formatBand(speakingDashboard.summary.bestBand) },
            { label: 'Audio-backed', value: String(speakingDashboard.summary.sessionsWithAudio) },
          ],
          actions: [
            { href: '/speaking', label: 'Open alpha', variant: 'primary' as const },
            { href: '/speaking/dashboard', label: 'View dashboard', variant: 'secondary' as const },
          ],
        }]
      : []),
    {
      id: 'listening',
      priority: 'secondary',
      eyebrow: 'Coming next',
      name: 'Listening',
      status: 'Placeholder',
      description:
        'Listening practice is planned but not yet available. Reading and Writing are the main tracks for now.',
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
    { id: 'reading', label: 'Reading', status: 'Ready' },
    { id: 'writing', label: 'Writing', status: 'Ready' },
    ...(speakingAlphaEnabled ? [{ id: 'speaking', label: 'Speaking', status: 'Preview' } as const] : []),
    { id: 'listening', label: 'Listening', status: 'Coming soon' },
  ] as const;

  return (
    <main className="app-shell">
      <section className="hero panel home-hero module-hub-hero">
        <div className="hero-copy-stack">
          <p className="eyebrow">IELTS Academic Prep</p>
          <h1>Your Reading &amp; Writing command center.</h1>
          <p className="hero-copy">
            Follow a daily Reading and Writing path that updates from your saved attempts. Start with the current
            curriculum step, finish its signal, then come back for the next block.
          </p>
          <div className="hero-actions">
            <Link className="primary-button dashboard-link-button hero-cta-reading" href="/curriculum">
              Follow today&apos;s curriculum
            </Link>
            <Link className="secondary-link-button hero-cta-writing" href="/reading">
              Open reading practice
            </Link>
          </div>
          <div className="route-pill-row" aria-label="Route status summary">
            {routePills.map((route) => (
              <span className="route-pill" data-route={route.id} key={route.id}>
                <span>{route.label}</span>
                <strong>{route.status}</strong>
              </span>
            ))}
          </div>
        </div>
        <aside className="hero-focus-panel home-student-panel" aria-label="Today's IELTS lesson">
          <div className="hero-focus-header">
            <p className="eyebrow">Today&apos;s lesson</p>
            <h2>Do this next.</h2>
            <p className="summary-copy">{curriculum.primaryModule.currentStep?.detail ?? curriculum.summary}</p>
          </div>
          <div className="today-step-list">
            {curriculum.todaySteps.slice(0, 2).map((step, index) => (
              <article className="today-step-card" key={`${step.moduleId}-${step.id}`}>
                <span>{index + 1}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.moduleLabel}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="home-lesson-meta" aria-label="Current learning signals">
            <span>Reading {formatAccuracy(readingDashboard.dashboardSummary.averagePercentage)}</span>
            <span>Writing {formatBand(writingDashboard.summary.averageBand)}</span>
            <span>{readingDashboard.dashboardSummary.totalAttempts + writingDashboard.summary.totalAttempts} sessions</span>
            {reviewSummary.dueCount > 0 ? <span>{reviewSummary.dueCount} reviews due</span> : null}
          </div>
        </aside>
      </section>

      <nav className="quick-actions-strip" aria-label="Quick practice actions">
        <Link className="quick-action-card" href="/reading" data-quick="reading">
          <div className="quick-action-icon" aria-hidden="true"><ReadingIcon /></div>
          <div className="quick-action-text">
            <strong>Reading practice</strong>
            <span>{readingDashboard.availableSets.length} passages available</span>
          </div>
        </Link>
        <Link className="quick-action-card" href="/curriculum" data-quick="curriculum">
          <div className="quick-action-icon" aria-hidden="true"><WritingIcon /></div>
          <div className="quick-action-text">
            <strong>Today&apos;s curriculum</strong>
            <span>Follow the next Reading + Writing block</span>
          </div>
        </Link>
        <Link className="quick-action-card" href="/review" data-quick="reading">
          <div className="quick-action-icon" aria-hidden="true"><ReadingIcon /></div>
          <div className="quick-action-text">
            <strong>Spaced review</strong>
            <span>
              {reviewSummary.dueCount > 0
                ? `${reviewSummary.dueCount} item${reviewSummary.dueCount === 1 ? '' : 's'} due now`
                : `${reviewSummary.totalTracked} tracked`}
            </span>
          </div>
        </Link>
        <Link className="quick-action-card" href="/writing" data-quick="writing">
          <div className="quick-action-icon" aria-hidden="true"><WritingIcon /></div>
          <div className="quick-action-text">
            <strong>Writing practice</strong>
            <span>{writingDashboard.prompts.length} prompts ready</span>
          </div>
        </Link>
        <Link className="quick-action-card" href="/reading/dashboard" data-quick="reading">
          <div className="quick-action-icon" aria-hidden="true"><ReadingIcon /></div>
          <div className="quick-action-text">
            <strong>Reading dashboard</strong>
            <span>{readingDashboard.dashboardSummary.totalAttempts} attempts tracked</span>
          </div>
        </Link>
        <Link className="quick-action-card" href="/dashboard" data-quick="writing">
          <div className="quick-action-icon" aria-hidden="true"><WritingIcon /></div>
          <div className="quick-action-text">
            <strong>Writing dashboard</strong>
            <span>{formatBand(writingDashboard.summary.averageBand)}</span>
          </div>
        </Link>
      </nav>

      <section className="workspace-column" aria-labelledby="primary-ia-heading">
        <div className="panel primary-section-header">
          <p className="eyebrow">Main tracks</p>
          <h2 id="primary-ia-heading">Reading and Writing — your daily practice tracks.</h2>
          <p className="summary-copy">
            Use the curriculum route when you want the app to choose the next step for you, or open each track directly
            when you need a specific practice lane.
          </p>
        </div>
        <div className="module-hub-grid" aria-label="Primary IELTS practice modules">
          {renderModuleCards(primaryModuleCards)}
        </div>
      </section>

      <div className="section-divider" role="separator" aria-hidden="true">
        <span className="section-divider-label">More modules</span>
      </div>

      <section className="workspace-column secondary-section" aria-labelledby="secondary-ia-heading">
        <div className="panel secondary-section-header">
          <p className="eyebrow">More practice lanes</p>
          <h2 id="secondary-ia-heading">Speaking and Listening — available when you are ready.</h2>
          <p className="summary-copy">
            These stay accessible without getting in the way of the main Reading and Writing flow.
          </p>
        </div>
        <div className="module-hub-grid" aria-label="Secondary IELTS modules">
          {renderModuleCards(secondaryModuleCards)}
        </div>
      </section>
    </main>
  );
}
