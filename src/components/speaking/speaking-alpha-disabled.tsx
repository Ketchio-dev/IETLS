import Link from 'next/link';

export function SpeakingAlphaDisabled({ context }: { context: 'practice' | 'dashboard' }) {
  const heading = context === 'practice' ? 'Speaking alpha is disabled in this environment' : 'Speaking alpha dashboard is disabled in this environment';

  return (
    <main className="app-shell">
      <section className="hero panel">
        <div>
          <p className="eyebrow">Speaking alpha</p>
          <h1>{heading}</h1>
          <p className="hero-copy">
            Transcript-first Speaking stays opt-in for production until a real STT and audio-analysis pipeline is ready.
          </p>
          <div className="hero-actions">
            <Link className="secondary-link-button" href="/">
              Return home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
