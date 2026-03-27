import type { ReadingAssessmentReport } from '@/lib/services/reading/types';

import { formatQuestionType } from './reading-formatting';

export function ReadingAssessmentReportPanel({ report }: { report: ReadingAssessmentReport }) {
  return (
    <article className="panel history-panel" aria-labelledby="reading-report-heading">
      <div className="section-heading reading-report-heading">
        <div>
          <p className="eyebrow">Deterministic report</p>
          <h2 id="reading-report-heading">Reading drill review</h2>
          <p className="summary-copy">{report.summary}</p>
        </div>
        <div className="reading-report-score">
          <strong>{report.scoreLabel}</strong>
          <span>{report.percentage}% accuracy</span>
        </div>
      </div>

      <div className="hero-metrics">
        <div className="metric-card">
          <span>Accuracy</span>
          <strong>{report.percentage}%</strong>
        </div>
        <div className="metric-card">
          <span>Questions</span>
          <strong>{report.maxScore}</strong>
        </div>
        <div className="metric-card">
          <span>Question families</span>
          <strong>{report.accuracyByQuestionType.length}</strong>
        </div>
      </div>

      <div className="stack-sm" style={{ marginTop: '1rem' }}>
        <h3 className="subsection-title">Question-type accuracy</h3>
        <ul className="plain-list compact-list">
          {report.accuracyByQuestionType.map((entry) => (
            <li key={entry.type}>
              <strong>{formatQuestionType(entry.type)}</strong> — {entry.correct}/{entry.total} correct ({entry.accuracy}%)
            </li>
          ))}
        </ul>
      </div>

      <div className="stack-sm" style={{ marginTop: '1rem' }}>
        <h3 className="subsection-title">Answer review</h3>
        <div className="history-list">
          {report.questionReviews.map((review) => (
            <article
              className={`history-card reading-review-card ${review.isCorrect ? 'is-correct' : 'is-review-needed'}`}
              key={review.questionId}
            >
              <div className="history-card-header">
                <strong>{review.prompt}</strong>
                <span>{review.isCorrect ? 'Correct' : 'Review needed'}</span>
              </div>
              <p>
                <strong>Your answer:</strong> {review.userAnswer || 'Blank'}
              </p>
              <p>
                <strong>Accepted answers:</strong> {review.acceptedAnswers.join(', ')}
              </p>
              <p>
                <strong>Evidence:</strong> {review.evidenceHint}
              </p>
              <p>{review.explanation}</p>
            </article>
          ))}
        </div>
      </div>

      {report.warnings.length > 0 ? (
        <ul className="plain-list compact-list import-warning-list" style={{ marginTop: '1rem' }}>
          {report.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
