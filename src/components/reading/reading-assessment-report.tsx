import Link from 'next/link';

import type { ReadingAssessmentReport } from '@/lib/services/reading/types';

import { formatQuestionType } from './reading-formatting';

function getTrapTypeLabel(type: string) {
  switch (type) {
    case 'multiple_choice':
      return 'distractor / paraphrase';
    case 'true_false_not_given':
      return 'scope / wording mismatch';
    case 'sentence_completion':
      return 'exact wording / word-limit';
    default:
      return 'evidence mismatch';
  }
}

function getEvidenceHintCopy(evidenceHint: string, isCorrect: boolean) {
  const trimmed = evidenceHint.trim();
  if (trimmed.length > 0) {
    return trimmed;
  }

  return isCorrect
    ? 'No evidence note was saved for this question. Recheck the closest supporting sentence in the passage before you move on.'
    : 'No evidence hint was saved for this question. Recheck the closest matching sentence in the passage before you answer again.';
}

function getExplanationCopy(explanation: string) {
  const trimmed = explanation.trim();
  return trimmed.length > 0
    ? trimmed
    : 'No extra explanation was saved for this question. Use the answer key and the passage evidence together on your next pass.';
}

function getNextAttemptStrategy(type: string) {
  switch (type) {
    case 'multiple_choice':
      return 'On your next attempt, eliminate any option that matches only one keyword and confirm the full idea in the passage before you choose.';
    case 'true_false_not_given':
      return 'On your next attempt, underline the exact clause boundary before you decide true, false, or not given.';
    case 'sentence_completion':
      return 'On your next attempt, copy the exact word form from the passage and count the allowed words before you lock the answer.';
    default:
      return 'On your next attempt, match your answer to one exact supporting sentence before you submit.';
  }
}

export function ReadingAssessmentReportPanel({ report }: { report: ReadingAssessmentReport }) {
  const strongestTakeaway = report.strengths[0] ?? 'Finish one full set to unlock stronger reading feedback.';
  const biggestRisk = report.risks[0] ?? 'The report will highlight your weakest area after the first scored set.';
  const nextStep = report.nextSteps[0] ?? 'Redo one missed question type, then match your answer against the exact passage sentence before scoring again.';
  const firstMissedReview = report.questionReviews.find((review) => !review.isCorrect);
  const nextAttemptStrategy = getNextAttemptStrategy(firstMissedReview?.type ?? report.accuracyByQuestionType[0]?.type ?? '');

  return (
    <article className="panel history-panel" aria-labelledby="reading-report-heading">
      <div className="section-heading reading-report-heading">
        <div>
          <p className="eyebrow">Score report</p>
          <h2 id="reading-report-heading">See what to fix next</h2>
          <aside className="report-note" role="note">
            Practice estimate — not an official IELTS score. Use it to guide study, not to predict your result.
          </aside>
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
          <span>Question types</span>
          <strong>{report.accuracyByQuestionType.length}</strong>
        </div>
      </div>

      <div className="dashboard-insight-grid" style={{ marginTop: '1rem' }}>
        <article className="history-card">
          <div className="history-card-header">
            <strong>What the answer key rewards</strong>
            <span>Keep it</span>
          </div>
          <p>{strongestTakeaway}</p>
        </article>
        <article className="history-card">
          <div className="history-card-header">
            <strong>What cost you marks</strong>
            <span>Fix it</span>
          </div>
          <p>{biggestRisk}</p>
        </article>
        <article className="history-card">
          <div className="history-card-header">
            <strong>Redo this first</strong>
            <span>Next move</span>
          </div>
          <p>{nextStep}</p>
          <p>
            <strong>On your next attempt:</strong> {nextAttemptStrategy}
          </p>
        </article>
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
              {!review.isCorrect ? (
                <>
                  <p>
                    <strong>Why the answer key rejects this:</strong> {getEvidenceHintCopy(review.evidenceHint, false)}
                  </p>
                  <p>
                    <strong>Common trap:</strong> {getTrapTypeLabel(review.type)}
                  </p>
                </>
              ) : (
                <p>
                  <strong>What proves this answer:</strong> {getEvidenceHintCopy(review.evidenceHint, true)}
                </p>
              )}
              <p>{getExplanationCopy(review.explanation)}</p>
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

      <div className="report-link-row">
        <Link className="secondary-link-button" href="/writing">
          Continue to Writing practice
        </Link>
      </div>
    </article>
  );
}
