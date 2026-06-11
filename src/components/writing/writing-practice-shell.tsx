'use client';

import Link from 'next/link';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  AssessmentReport,
  ProgressSummary,
  RecentAttemptSummary,
  SavedAssessmentSnapshot,
  WritingPrompt,
  WritingTaskType,
} from '@/lib/domain';
import {
  buildReportCriterionCoachingPlan,
  type CriterionCoachingPlan,
} from '@/lib/services/writing/feedback-generator';
import {
  getPromptDifficulty,
  getPromptTheme,
  type PromptDifficulty,
  type PromptTheme,
} from '@/lib/services/writing/prompt-taxonomy';
import { buildPromptRecommendations } from '@/lib/services/writing/prompt-recommendations';
import type { PromptRecommendation } from '@/lib/services/writing/prompt-recommendations';
import { buildProgressSummary } from '@/lib/services/writing/progress-summary';
import { formatDateTime } from '@/components/dashboard/dashboard-formatting';

import { AssessmentReportPanel } from './assessment-report';
import { Task1VisualRenderer } from './task1-visual-renderer';

const WRITING_ASSESSMENT_API_PATH = '/api/writing/assessment';
const WRITING_DASHBOARD_PATH = '/dashboard';

interface Props {
  prompts: WritingPrompt[];
  prompt: WritingPrompt;
  initialReport: AssessmentReport;
  initialHistory: RecentAttemptSummary[];
  initialSavedAssessments: SavedAssessmentSnapshot[];
  initialPromptId?: string;
  initialAttemptId?: string;
  fallbackReports: Record<string, AssessmentReport>;
}

function formatRange(lower: number, upper: number) {
  return `Band ${lower.toFixed(1)}-${upper.toFixed(1)}`;
}

function getTaskLabel(taskType: WritingTaskType) {
  return taskType === 'task-1' ? 'Writing Task 1' : 'Writing Task 2';
}

function getTaskPromptHeading(taskType: WritingTaskType) {
  return `Choose a ${getTaskLabel(taskType)} prompt`;
}

function getQuestionTypeLabel(prompt: WritingPrompt) {
  return prompt.questionType ?? (prompt.taskType === 'task-1' ? 'Academic visual summary' : 'Essay prompt');
}

function getEditorPlaceholder(taskType: WritingTaskType) {
  return taskType === 'task-1'
    ? 'Write your full Task 1 response here…'
    : 'Write your full Task 2 response here…';
}

function getMinimumWordLabel(taskType: WritingTaskType, suggestedWordCount: number) {
  return `${getTaskLabel(taskType)}: at least ${suggestedWordCount} words`;
}

function getSubmitLabel(taskType: WritingTaskType) {
  return taskType === 'task-1' ? 'Score my response' : 'Score my essay';
}

function countWords(response: string) {
  return response.trim().split(/\s+/).filter(Boolean).length;
}

function getConfidenceBadge(confidence: AssessmentReport['confidence']) {
  switch (confidence) {
    case 'high':
      return 'Reliable estimate';
    case 'medium':
      return 'Estimate may shift';
    default:
      return 'Rough estimate';
  }
}

function formatCountdown(secondsRemaining: number) {
  return `${String(Math.floor(secondsRemaining / 60)).padStart(2, '0')}:${String(
    secondsRemaining % 60,
  ).padStart(2, '0')}`;
}

function WritingCountdownMetric({
  initialSeconds,
  onTick,
}: {
  initialSeconds: number;
  onTick: (secondsRemaining: number) => void;
}) {
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);

  useEffect(() => {
    onTick(initialSeconds);

    const interval = window.setInterval(() => {
      setSecondsRemaining((current) => {
        const next = Math.max(current - 1, 0);
        onTick(next);
        return next;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [initialSeconds, onTick]);

  return <strong>{formatCountdown(secondsRemaining)}</strong>;
}

function WritingSpentTimeLabel({
  initialSeconds,
  recommendedMinutes,
}: {
  initialSeconds: number;
  recommendedMinutes: number;
}) {
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSecondsRemaining((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [initialSeconds]);

  const timeSpentMinutes = Math.max(0, recommendedMinutes - secondsRemaining / 60);

  return <span>{timeSpentMinutes.toFixed(1)} min spent</span>;
}

const WritingPromptBankPanel = memo(function WritingPromptBankPanel({
  activePrompt,
  availableDifficulties,
  availableQuestionTypes,
  availableThemes,
  hasAdvancedPromptFilters,
  onDifficultyChange,
  onPromptChange,
  onQuestionTypeChange,
  onRecommendationAdvance,
  onSearchQueryChange,
  onTaskTypeChange,
  onThemeChange,
  promptRecommendations,
  recommendedPrompt,
  searchQuery,
  selectedDifficulty,
  selectedQuestionType,
  selectedTaskType,
  selectedTheme,
  taskPrompts,
  visiblePrompts,
}: {
  activePrompt: WritingPrompt;
  availableDifficulties: PromptDifficulty[];
  availableQuestionTypes: string[];
  availableThemes: PromptTheme[];
  hasAdvancedPromptFilters: boolean;
  onDifficultyChange: (difficulty: 'all' | PromptDifficulty) => void;
  onPromptChange: (promptId: string) => void;
  onQuestionTypeChange: (questionType: string) => void;
  onRecommendationAdvance: () => void;
  onSearchQueryChange: (query: string) => void;
  onTaskTypeChange: (taskType: WritingTaskType) => void;
  onThemeChange: (theme: 'all' | PromptTheme) => void;
  promptRecommendations: PromptRecommendation[];
  recommendedPrompt: PromptRecommendation | null;
  searchQuery: string;
  selectedDifficulty: 'all' | PromptDifficulty;
  selectedQuestionType: 'all' | string;
  selectedTaskType: WritingTaskType;
  selectedTheme: 'all' | PromptTheme;
  taskPrompts: WritingPrompt[];
  visiblePrompts: WritingPrompt[];
}) {
  return (
    <article className="panel" id="writing-editor">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Prompt bank</p>
          <h2>{getTaskPromptHeading(activePrompt.taskType)}</h2>
        </div>
        <span className="band-chip">{visiblePrompts.length} prompts</span>
      </div>
      <div className="task-switcher" role="tablist" aria-label="Writing task type">
        {(['task-1', 'task-2'] as const).map((taskType, index) => {
          const isActive = taskType === selectedTaskType;

          return (
            <button
              key={`${taskType}-${index}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`task-tab${isActive ? ' is-active' : ''}`}
              onClick={() => onTaskTypeChange(taskType)}
            >
              {getTaskLabel(taskType)}
            </button>
          );
        })}
      </div>
      {recommendedPrompt ? (
        <div className="prompt-recommendation-card" aria-label="Recommended next prompt">
          <div className="history-card-header">
            <strong>Recommended next: {recommendedPrompt.prompt.title}</strong>
            <span>{recommendedPrompt.reason}</span>
          </div>
          <p className="summary-copy">If you do not need a specific theme, start here instead of searching the full bank.</p>
          <div className="prompt-meta-row">
            <span className="band-chip">{recommendedPrompt.theme}</span>
            <span className="band-chip">{recommendedPrompt.difficulty}</span>
            <span className="band-chip">{recommendedPrompt.promptAttemptCount} prompt attempts</span>
          </div>
          <div className="hero-actions">
            <button
              className="secondary-link-button"
              onClick={() => onPromptChange(recommendedPrompt.prompt.id)}
              type="button"
            >
              Jump to recommended prompt
            </button>
            {promptRecommendations.length > 1 ? (
              <button
                className="secondary-link-button"
                onClick={onRecommendationAdvance}
                type="button"
              >
                Show another suggestion
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      <details className="prompt-filter-details" open={hasAdvancedPromptFilters}>
        <summary>Find a specific prompt</summary>
        <div className="prompt-filter-row">
          <label className="prompt-filter-field">
            <span>Question type</span>
            <select
              aria-label="Filter prompts by question type"
              className="prompt-filter-select"
              onChange={(event) => onQuestionTypeChange(event.target.value)}
              value={selectedQuestionType}
            >
              <option value="all">All question types</option>
              {availableQuestionTypes.map((questionType, index) => (
                <option key={`${questionType}-${index}`} value={questionType}>
                  {questionType}
                </option>
              ))}
            </select>
          </label>
          <label className="prompt-filter-field">
            <span>Difficulty</span>
            <select
              aria-label="Filter prompts by difficulty"
              className="prompt-filter-select"
              onChange={(event) => onDifficultyChange(event.target.value as 'all' | PromptDifficulty)}
              value={selectedDifficulty}
            >
              <option value="all">All difficulty levels</option>
              {availableDifficulties.map((difficulty, index) => (
                <option key={`${difficulty}-${index}`} value={difficulty}>
                  {difficulty}
                </option>
              ))}
            </select>
          </label>
          <label className="prompt-filter-field">
            <span>Theme</span>
            <select
              aria-label="Filter prompts by theme"
              className="prompt-filter-select"
              onChange={(event) => onThemeChange(event.target.value as 'all' | PromptTheme)}
              value={selectedTheme}
            >
              <option value="all">All themes</option>
              {availableThemes.map((theme, index) => (
                <option key={`${theme}-${index}`} value={theme}>
                  {theme}
                </option>
              ))}
            </select>
          </label>
          <label className="prompt-filter-field prompt-search-field">
            <span>Topic search</span>
            <input
              aria-label="Search prompts by topic"
              className="prompt-filter-input"
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="Search titles, prompts, or keywords"
              type="search"
              value={searchQuery}
            />
          </label>
        </div>
        <p className="summary-copy prompt-filter-summary">
          Showing {visiblePrompts.length} of {taskPrompts.length} {getTaskLabel(selectedTaskType).toLowerCase()} prompts.
        </p>
      </details>
      <div className="prompt-selector">
        {visiblePrompts.length === 0 ? (
          <p className="summary-copy prompt-empty-state">
            No prompts match this filter yet. Clear the search or switch question type to browse the full bank.
          </p>
        ) : visiblePrompts.map((item, index) => {
          const isActive = item.id === activePrompt.id;

          return (
            <button
              key={`${item.id}-${index}`}
              type="button"
              className={`history-card history-card-button prompt-card${isActive ? ' is-active' : ''}`}
              aria-pressed={isActive}
              onClick={() => onPromptChange(item.id)}
            >
              <div className="history-card-header">
                <strong>{item.title}</strong>
                <span>{getQuestionTypeLabel(item)}</span>
              </div>
              <div className="prompt-meta-row">
                <span className="band-chip">{getPromptDifficulty(item)}</span>
                <span className="band-chip">{getPromptTheme(item)}</span>
              </div>
              <p>{item.prompt}</p>
            </button>
          );
        })}
      </div>
    </article>
  );
});

const WritingActivePromptPanel = memo(function WritingActivePromptPanel({
  activePrompt,
}: {
  activePrompt: WritingPrompt;
}) {
  return (
    <article className="panel">
      <p className="eyebrow">Live prompt</p>
      <h2>{activePrompt.title}</h2>
      <div className="prompt-meta-row" aria-label="Active prompt metadata">
        <span className="band-chip">{getQuestionTypeLabel(activePrompt)}</span>
        <span className="band-chip">{getPromptDifficulty(activePrompt)}</span>
        <span className="band-chip">{getPromptTheme(activePrompt)}</span>
      </div>
      <p className="prompt-copy">{activePrompt.prompt}</p>
      {activePrompt.visual ? (
        <div className="visual-panel">
          <div className="visual-panel-header">
            <div>
              <p className="eyebrow">Structured visual task</p>
              <h3>{activePrompt.visual.title}</h3>
            </div>
            <span className="band-chip">{activePrompt.visual.type}</span>
          </div>
          <p className="summary-copy">{activePrompt.visual.summary}</p>
          <div className="visual-meta">
            {activePrompt.visual.xAxisLabel ? <span>X-axis: {activePrompt.visual.xAxisLabel}</span> : null}
            {activePrompt.visual.yAxisLabel ? <span>Y-axis: {activePrompt.visual.yAxisLabel}</span> : null}
            {activePrompt.visual.units ? <span>Units: {activePrompt.visual.units}</span> : null}
          </div>
          <Task1VisualRenderer visual={activePrompt.visual} />
        </div>
      ) : null}
      <details className="report-technical-details">
        <summary>Open planning hints and examiner focus</summary>
        <div className="tip-grid">
          <div>
            <h3>Planning hints</h3>
            <ul>
              {activePrompt.planningHints.map((item, index) => (
                <li key={`${activePrompt.id}-planning-${index}`}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>What examiners look for</h3>
            <ul>
              {activePrompt.rubricFocus.map((item, index) => (
                <li key={`${activePrompt.id}-rubric-${index}`}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </details>
    </article>
  );
});

const WritingRevisionPanel = memo(function WritingRevisionPanel({
  criterionCoaching,
  nextMoveCopy,
  onPromptChange,
  recommendedPrompt,
  report,
}: {
  criterionCoaching: CriterionCoachingPlan | null;
  nextMoveCopy: string;
  onPromptChange: (promptId: string) => void;
  recommendedPrompt: PromptRecommendation | null;
  report: AssessmentReport;
}) {
  return (
    <section className="panel service-panel">
      <p className="eyebrow">Do this next</p>
      <h2>Turn this report into the next better draft</h2>
      <article className="history-card inspection-card">
        <div className="history-card-header">
          <strong>{criterionCoaching ? `Fix ${criterionCoaching.criterion}` : 'Score one full draft'}</strong>
          <span>{criterionCoaching ? `Band ${criterionCoaching.currentBand.toFixed(1)} now` : 'Next move'}</span>
        </div>
        <p>
          {criterionCoaching
            ? criterionCoaching.fixNow
            : 'Score one full draft to unlock the clearest next revision target.'}
        </p>
      </article>
      {criterionCoaching ? (
        <details className="report-technical-details">
          <summary>Open revision checklist</summary>
          <article className="history-card inspection-card">
            <div className="history-card-header">
              <strong>Raise {criterionCoaching.criterion} next</strong>
              <span>Target Band {criterionCoaching.targetBand.toFixed(1)}</span>
            </div>
            <p>{criterionCoaching.whyItMatters}</p>
            <p className="summary-copy">
              <strong>Then decide:</strong> {nextMoveCopy}
            </p>
            <p className="summary-copy">
              <strong>Keep one strength:</strong>{' '}
              {report.strengths[0] ?? 'Keep the clearest paragraph structure or idea development from this draft stable while you revise.'}
            </p>
            <ul className="plain-list compact-list">
              {criterionCoaching.checklist.map((item, index) => (
                <li key={`${criterionCoaching.criterion}-practice-${index}`}>{item}</li>
              ))}
            </ul>
          </article>
        </details>
      ) : null}
      <div className="hero-actions">
        <a className="secondary-link-button" href="#writing-editor">
          Revise this draft now
        </a>
        {recommendedPrompt ? (
          <button
            className="secondary-link-button"
            onClick={() => onPromptChange(recommendedPrompt.prompt.id)}
            type="button"
          >
            Open next recommended prompt
          </button>
        ) : null}
      </div>
    </section>
  );
});

const WritingScoreGuidePanel = memo(function WritingScoreGuidePanel() {
  return (
    <section className="panel service-panel">
      <p className="eyebrow">How to read this score</p>
      <h2>Use the estimate as a practice guide, not an official result</h2>
      <div className="service-list">
        <article>
          <h3>Assessment report</h3>
          <p>The band is designed to help you compare drafts and spot revision priorities. It is not an official IELTS score.</p>
        </article>
        <article>
          <h3>What to trust most</h3>
          <p>Start with what lifted the estimate, what held it back, and the first revision target. Those explain the score faster than the exact band alone.</p>
        </article>
        <article>
          <h3>How to improve faster</h3>
          <p>Repeat the same prompt once or twice, then switch to a new theme after you fix the main weakness from the last report.</p>
        </article>
      </div>
    </section>
  );
});

const WritingSavedHistoryPanel = memo(function WritingSavedHistoryPanel({
  activeAttemptId,
  activeSavedAssessment,
  onInspectAttempt,
  progressSummary,
  promptSavedAssessments,
}: {
  activeAttemptId: string | null;
  activeSavedAssessment: SavedAssessmentSnapshot | null;
  onInspectAttempt: (attempt: SavedAssessmentSnapshot) => void;
  progressSummary: ProgressSummary;
  promptSavedAssessments: SavedAssessmentSnapshot[];
}) {
  return (
    <section className="panel history-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Recent attempts</p>
          <h2>Saved practice history</h2>
        </div>
        <span className="band-chip">{promptSavedAssessments.length} for this prompt</span>
      </div>
      <article className="history-card inspection-card">
        <div className="history-card-header">
          <strong>{progressSummary.label}</strong>
          <span>{progressSummary.attemptsConsidered} attempts used</span>
        </div>
        <p>{progressSummary.detail}</p>
        <div className="history-meta">
          <span>
            Latest range:{' '}
            {progressSummary.latestRange
              ? formatRange(progressSummary.latestRange.lower, progressSummary.latestRange.upper)
              : 'Not enough data'}
          </span>
          <span>Avg words: {progressSummary.averageWordCount}</span>
        </div>
        {activeSavedAssessment ? (
          <div className="history-meta inspection-meta">
            <span>Inspecting: {formatDateTime(activeSavedAssessment.createdAt)}</span>
            <span>{formatRange(activeSavedAssessment.report.overallBandRange.lower, activeSavedAssessment.report.overallBandRange.upper)}</span>
            <span>{getConfidenceBadge(activeSavedAssessment.report.confidence)}</span>
          </div>
        ) : null}
      </article>
      {promptSavedAssessments.length === 0 ? (
        <p className="summary-copy">Submit your first draft for this prompt to start building a reusable score history.</p>
      ) : (
        <>
          <p className="summary-copy">Select a saved attempt to inspect its full scorecard above.</p>
          <div className="history-list">
            {promptSavedAssessments.map((attempt, index) => {
              const isActive = attempt.submissionId === activeAttemptId;

              return (
                <button
                  aria-label={`Inspect saved attempt from ${formatDateTime(attempt.createdAt)}`}
                  aria-pressed={isActive}
                  className={`history-card history-card-button${isActive ? ' is-active' : ''}`}
                  key={`${attempt.submissionId}-${index}`}
                  onClick={() => onInspectAttempt(attempt)}
                  type="button"
                >
                  <div className="history-card-header">
                    <strong>{formatRange(attempt.report.overallBandRange.lower, attempt.report.overallBandRange.upper)}</strong>
                    <span>{getConfidenceBadge(attempt.report.confidence)}</span>
                  </div>
                  <p>{attempt.report.summary}</p>
                  <div className="history-meta">
                    <span>{attempt.wordCount} words</span>
                    <span>{attempt.timeSpentMinutes.toFixed(1)} min</span>
                  </div>
                  <div className="history-meta">
                    <span>{formatDateTime(attempt.createdAt)}</span>
                    <span>{isActive ? 'Viewing report' : 'Saved result'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
});

const WritingEditorPanel = memo(function WritingEditorPanel({
  activePrompt,
  initialResponse,
  isSubmitting,
  onResponseDraftChange,
  onSubmit,
  error,
  timerSeed,
  timerVersion,
}: {
  activePrompt: WritingPrompt;
  error: string | null;
  initialResponse: string;
  isSubmitting: boolean;
  onResponseDraftChange: (response: string, wordCount: number) => void;
  onSubmit: () => void;
  timerSeed: number;
  timerVersion: number;
}) {
  const [response, setResponse] = useState(initialResponse);
  const [wordCount, setWordCount] = useState(() => countWords(initialResponse));
  const wordsRemaining = Math.max(activePrompt.suggestedWordCount - wordCount, 0);

  return (
    <article className="panel">
      <div className="editor-header">
        <div>
          <p className="eyebrow">Timed editor</p>
          <h2>Draft response</h2>
        </div>
        <button
          className="primary-button"
          disabled={isSubmitting || wordCount < activePrompt.suggestedWordCount}
          onClick={onSubmit}
          type="button"
        >
          {isSubmitting ? 'Scoring…' : getSubmitLabel(activePrompt.taskType)}
        </button>
        <p className="summary-copy">Write to the minimum before scoring unlocks.</p>
      </div>
      <textarea
        aria-label="Essay response"
        className="essay-textarea"
        placeholder={getEditorPlaceholder(activePrompt.taskType)}
        onChange={(event) => {
          const nextResponse = event.target.value;
          const nextWordCount = countWords(nextResponse);

          setResponse(nextResponse);
          setWordCount((current) => (current === nextWordCount ? current : nextWordCount));
          onResponseDraftChange(nextResponse, nextWordCount);
        }}
        value={response}
      />
      <div className="editor-footer">
        <span>
          {wordCount} words · {wordsRemaining > 0 ? `${wordsRemaining} more to unlock scoring` : 'minimum reached'}
        </span>
        <span>{getMinimumWordLabel(activePrompt.taskType, activePrompt.suggestedWordCount)}</span>
        <WritingSpentTimeLabel
          key={`writing-spent-${timerVersion}`}
          initialSeconds={timerSeed}
          recommendedMinutes={activePrompt.recommendedMinutes}
        />
      </div>
      {error ? <p className="error-text">{error}</p> : null}
    </article>
  );
});

export function WritingPracticeShell({
  prompts,
  prompt,
  initialHistory,
  initialReport,
  initialSavedAssessments,
  initialPromptId,
  initialAttemptId,
  fallbackReports,
}: Props) {
  const initialPromptSelection = prompts.find((item) => item.id === initialPromptId) ?? prompt;
  const [selectedTaskType, setSelectedTaskType] = useState<WritingTaskType>(initialPromptSelection.taskType);
  const [selectedQuestionType, setSelectedQuestionType] = useState<'all' | string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | PromptDifficulty>('all');
  const [selectedTheme, setSelectedTheme] = useState<'all' | PromptTheme>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPromptId, setSelectedPromptId] = useState(initialPromptSelection.id);
  const initialResponse = '';
  const responseRef = useRef(initialResponse);
  const [editorResponseSeed, setEditorResponseSeed] = useState(initialResponse);
  const [editorResponseVersion, setEditorResponseVersion] = useState(0);
  const [wordCount, setWordCount] = useState(() => countWords(initialResponse));
  const secondsRemainingRef = useRef(initialPromptSelection.recommendedMinutes * 60);
  const [timerSeed, setTimerSeed] = useState(initialPromptSelection.recommendedMinutes * 60);
  const [timerVersion, setTimerVersion] = useState(0);
  const [report, setReport] = useState(initialReport);
  const [savedAssessments, setSavedAssessments] = useState(initialSavedAssessments);
  const [recentAttempts, setRecentAttempts] = useState(initialHistory);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(initialAttemptId ?? initialSavedAssessments[0]?.submissionId ?? null);
  const [recommendationIndex, setRecommendationIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activePrompt = useMemo(
    () => prompts.find((item) => item.id === selectedPromptId) ?? prompt,
    [prompt, prompts, selectedPromptId],
  );
  const taskPrompts = useMemo(
    () => prompts.filter((item) => item.taskType === selectedTaskType),
    [prompts, selectedTaskType],
  );
  const availableQuestionTypes = useMemo(
    () => Array.from(new Set(taskPrompts.map((item) => getQuestionTypeLabel(item)))),
    [taskPrompts],
  );
  const availableDifficulties = useMemo(
    () => Array.from(new Set(taskPrompts.map((item) => getPromptDifficulty(item)))),
    [taskPrompts],
  );
  const availableThemes = useMemo(
    () => Array.from(new Set(taskPrompts.map((item) => getPromptTheme(item)))).sort(),
    [taskPrompts],
  );
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const visiblePrompts = useMemo(() => {
    return taskPrompts.filter((item) => {
      const questionTypeLabel = getQuestionTypeLabel(item);
      const matchesQuestionType = selectedQuestionType === 'all' || questionTypeLabel === selectedQuestionType;
      const matchesDifficulty = selectedDifficulty === 'all' || getPromptDifficulty(item) === selectedDifficulty;
      const matchesTheme = selectedTheme === 'all' || getPromptTheme(item) === selectedTheme;
      if (!matchesQuestionType || !matchesDifficulty || !matchesTheme) {
        return false;
      }

      if (!normalizedSearchQuery) {
        return true;
      }

      const keywordText = Array.isArray(item.keywordTargets) ? item.keywordTargets.join(' ').toLowerCase() : '';
      const haystack = `${item.title} ${item.prompt} ${questionTypeLabel} ${keywordText}`.toLowerCase();
      return haystack.includes(normalizedSearchQuery);
    });
  }, [normalizedSearchQuery, selectedDifficulty, selectedQuestionType, selectedTheme, taskPrompts]);

  const promptSavedAssessments = useMemo(
    () => savedAssessments.filter((attempt) => attempt.promptId === activePrompt.id),
    [activePrompt.id, savedAssessments],
  );
  const promptRecentAttempts = useMemo(
    () => recentAttempts.filter((attempt) => attempt.promptId === activePrompt.id),
    [activePrompt.id, recentAttempts],
  );
  const promptRecommendations = useMemo(
    () =>
      buildPromptRecommendations(
        {
          prompts: visiblePrompts,
          savedAttempts: savedAssessments,
          taskType: selectedTaskType,
          excludePromptId: activePrompt.id,
        },
        3,
      ),
    [activePrompt.id, savedAssessments, selectedTaskType, visiblePrompts],
  );
  const recommendedPrompt = promptRecommendations[recommendationIndex % Math.max(promptRecommendations.length, 1)] ?? null;

  const handleTimerTick = useCallback((secondsRemaining: number) => {
    secondsRemainingRef.current = secondsRemaining;
  }, []);

  const resetWritingTimer = useCallback((secondsRemaining: number) => {
    secondsRemainingRef.current = secondsRemaining;
    setTimerSeed(secondsRemaining);
    setTimerVersion((current) => current + 1);
  }, []);

  useEffect(() => {
    resetWritingTimer(activePrompt.recommendedMinutes * 60);
    const nextResponse = '';
    responseRef.current = nextResponse;
    setEditorResponseSeed(nextResponse);
    setEditorResponseVersion((current) => current + 1);
    setWordCount(countWords(nextResponse));
    setError(null);

    const selectedForPrompt =
      promptSavedAssessments.find((attempt) => attempt.submissionId === activeAttemptId) ?? promptSavedAssessments[0];
    setActiveAttemptId(selectedForPrompt?.submissionId ?? null);
    setReport(selectedForPrompt?.report ?? fallbackReports[activePrompt.id] ?? initialReport);
  }, [
    activeAttemptId,
    activePrompt.id,
    activePrompt.recommendedMinutes,
    fallbackReports,
    initialReport,
    promptSavedAssessments,
    resetWritingTimer,
  ]);

  useEffect(() => {
    if (selectedQuestionType !== 'all' && !availableQuestionTypes.includes(selectedQuestionType)) {
      setSelectedQuestionType('all');
    }
  }, [availableQuestionTypes, selectedQuestionType]);

  useEffect(() => {
    if (selectedDifficulty !== 'all' && !availableDifficulties.includes(selectedDifficulty)) {
      setSelectedDifficulty('all');
    }
  }, [availableDifficulties, selectedDifficulty]);

  useEffect(() => {
    if (selectedTheme !== 'all' && !availableThemes.includes(selectedTheme)) {
      setSelectedTheme('all');
    }
  }, [availableThemes, selectedTheme]);

  useEffect(() => {
    if (!visiblePrompts.some((item) => item.id === selectedPromptId)) {
      setSelectedPromptId(visiblePrompts[0]?.id ?? (prompts.find((item) => item.taskType === selectedTaskType) ?? prompt).id);
    }
  }, [prompt, prompts, selectedPromptId, selectedTaskType, visiblePrompts]);

  useEffect(() => {
    setRecommendationIndex(0);
  }, [activePrompt.id, searchQuery, selectedDifficulty, selectedQuestionType, selectedTaskType, selectedTheme]);

  const progressSummary = useMemo(() => buildProgressSummary(promptRecentAttempts), [promptRecentAttempts]);
  const activeSavedAssessment = useMemo(
    () => promptSavedAssessments.find((attempt) => attempt.submissionId === activeAttemptId) ?? null,
    [activeAttemptId, promptSavedAssessments],
  );
  const activeTaskLabel = getTaskLabel(activePrompt.taskType);
  const criterionCoaching = useMemo(() => buildReportCriterionCoachingPlan(report), [report]);
  const hasAdvancedPromptFilters =
    selectedQuestionType !== 'all'
    || selectedDifficulty !== 'all'
    || selectedTheme !== 'all'
    || normalizedSearchQuery.length > 0;
  const nextMoveCopy =
    report.confidence === 'low'
      ? 'Repeat the same task once more so you can see whether the revision tightened the confidence. If it stays provisional after two revisions, switch prompts.'
      : recommendedPrompt
        ? `Repeat the same task once more to confirm the revision worked, then switch to “${recommendedPrompt.prompt.title}” to test the same skill under a new prompt.`
        : 'After one revision, switch to a new prompt only if the main weakness is no longer repeating.';

  const handleResponseDraftChange = useCallback((nextResponse: string, nextWordCount: number) => {
    responseRef.current = nextResponse;
    setWordCount((current) => (current === nextWordCount ? current : nextWordCount));
  }, []);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);
    const timeSpentMinutes = Math.max(0, activePrompt.recommendedMinutes - secondsRemainingRef.current / 60);

    try {
      const nextReportResponse = await fetch(WRITING_ASSESSMENT_API_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptId: activePrompt.id,
          response: responseRef.current,
          timeSpentMinutes,
        }),
      });

      const payload = (await nextReportResponse.json()) as {
        error?: string;
        report?: AssessmentReport;
        recentAttempts?: RecentAttemptSummary[];
        savedAssessments?: SavedAssessmentSnapshot[];
      };

      if (!nextReportResponse.ok || !payload.report) {
        throw new Error(payload.error ?? 'Unable to generate report');
      }

      setReport(payload.report);
      setRecentAttempts(payload.recentAttempts ?? initialHistory);
      setSavedAssessments(payload.savedAssessments ?? initialSavedAssessments);
      setActiveAttemptId(payload.savedAssessments?.[0]?.submissionId ?? null);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : 'Unexpected submission error',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    activePrompt.id,
    activePrompt.recommendedMinutes,
    initialHistory,
    initialSavedAssessments,
  ]);

  const handleInspectAttempt = useCallback((attempt: SavedAssessmentSnapshot) => {
    setActiveAttemptId(attempt.submissionId);
    setReport(attempt.report);
  }, []);

  const handlePromptChange = useCallback((nextPromptId: string) => {
    setSelectedPromptId(nextPromptId);
  }, []);

  const handleTaskTypeChange = useCallback((nextTaskType: WritingTaskType) => {
    setSelectedTaskType(nextTaskType);
    setSelectedQuestionType('all');
    setSelectedDifficulty('all');
    setSelectedTheme('all');
    setSearchQuery('');
    const nextPrompt = prompts.find((item) => item.taskType === nextTaskType) ?? prompt;
    setSelectedPromptId(nextPrompt.id);
  }, [prompt, prompts]);

  const handleQuestionTypeChange = useCallback((nextQuestionType: string) => {
    setSelectedQuestionType(nextQuestionType);
  }, []);

  const handleDifficultyChange = useCallback((nextDifficulty: 'all' | PromptDifficulty) => {
    setSelectedDifficulty(nextDifficulty);
  }, []);

  const handleThemeChange = useCallback((nextTheme: 'all' | PromptTheme) => {
    setSelectedTheme(nextTheme);
  }, []);

  const handleSearchQueryChange = useCallback((nextSearchQuery: string) => {
    setSearchQuery(nextSearchQuery);
  }, []);

  const handleRecommendationAdvance = useCallback(() => {
    setRecommendationIndex((current) => current + 1);
  }, []);

  return (
    <main className="app-shell">
      <section className="hero panel">
        <div>
          <p className="eyebrow">IELTS Academic • {activeTaskLabel}</p>
          <h1>Practice IELTS Writing with instant scoring feedback</h1>
          <p className="hero-copy">
            Practice under time pressure, review a structured score estimate, and keep a reusable
            history of your latest saved attempts.
          </p>
          <div className="hero-actions">
            <Link className="secondary-link-button" href={WRITING_DASHBOARD_PATH}>
              Open dashboard
            </Link>
            <p className="hero-action-copy">
              Review saved writing trends and a lightweight next-step study plan.
            </p>
          </div>
        </div>
        <div className="hero-metrics">
          <div className="metric-card">
            <span>Time left</span>
            <WritingCountdownMetric
              key={`writing-countdown-${timerVersion}`}
              initialSeconds={timerSeed}
              onTick={handleTimerTick}
            />
          </div>
          <div className="metric-card">
            <span>Word count</span>
            <strong>{wordCount}</strong>
          </div>
          <div className="metric-card">
            <span>Word target</span>
            <strong>{getMinimumWordLabel(activePrompt.taskType, activePrompt.suggestedWordCount)}</strong>
          </div>
        </div>
      </section>

      <section className="workspace-grid">
        <div className="workspace-column left-column">
          <details className="panel student-help-panel">
            <summary>
              <span>
                <span className="eyebrow">Start here</span>
                <strong>3-step writing loop</strong>
              </span>
              <span className="band-chip">Help</span>
            </summary>
            <div className="section-heading">
              <div>
                <p className="eyebrow">Start here</p>
                <h2>Follow the same 3-step loop every time</h2>
              </div>
            </div>
            <div className="quick-start-grid" aria-label="Writing practice quick start">
              <article className="quick-start-card">
                <strong>1. Pick a task</strong>
                <p>Start with the recommended prompt or open filters when you want a specific theme or question type.</p>
              </article>
              <article className="quick-start-card">
                <strong>2. Reach the minimum</strong>
                <p>{getMinimumWordLabel(activePrompt.taskType, activePrompt.suggestedWordCount)} before scoring unlocks.</p>
              </article>
              <article className="quick-start-card">
                <strong>3. Review and redraft</strong>
                <p>Use the estimate, next steps, and saved history to improve your next timed response.</p>
              </article>
            </div>
          </details>

          <details className="student-detail-panel">
            <summary>
              <span>
                <span className="eyebrow">Prompt bank</span>
                <strong>Change prompt or filters</strong>
              </span>
              <span className="band-chip">{visiblePrompts.length} prompts</span>
            </summary>
            <WritingPromptBankPanel
              activePrompt={activePrompt}
              availableDifficulties={availableDifficulties}
              availableQuestionTypes={availableQuestionTypes}
              availableThemes={availableThemes}
              hasAdvancedPromptFilters={hasAdvancedPromptFilters}
              onDifficultyChange={handleDifficultyChange}
              onPromptChange={handlePromptChange}
              onQuestionTypeChange={handleQuestionTypeChange}
              onRecommendationAdvance={handleRecommendationAdvance}
              onSearchQueryChange={handleSearchQueryChange}
              onTaskTypeChange={handleTaskTypeChange}
              onThemeChange={handleThemeChange}
              promptRecommendations={promptRecommendations}
              recommendedPrompt={recommendedPrompt}
              searchQuery={searchQuery}
              selectedDifficulty={selectedDifficulty}
              selectedQuestionType={selectedQuestionType}
              selectedTaskType={selectedTaskType}
              selectedTheme={selectedTheme}
              taskPrompts={taskPrompts}
              visiblePrompts={visiblePrompts}
            />
          </details>

          <WritingActivePromptPanel activePrompt={activePrompt} />

          <WritingEditorPanel
            activePrompt={activePrompt}
            error={error}
            initialResponse={editorResponseSeed}
            isSubmitting={isSubmitting}
            key={`writing-editor-${editorResponseVersion}`}
            onResponseDraftChange={handleResponseDraftChange}
            onSubmit={handleSubmit}
            timerSeed={timerSeed}
            timerVersion={timerVersion}
          />
        </div>

        <div className="workspace-column right-column">
          <WritingRevisionPanel
            criterionCoaching={criterionCoaching}
            nextMoveCopy={nextMoveCopy}
            onPromptChange={handlePromptChange}
            recommendedPrompt={recommendedPrompt}
            report={report}
          />

          <details className="student-detail-panel">
            <summary>
              <span>
                <span className="eyebrow">Score report</span>
                <strong>Open detailed feedback</strong>
              </span>
              <span className="band-chip">Band {report.overallBand.toFixed(1)}</span>
            </summary>
            <AssessmentReportPanel report={report} />
          </details>

          <details className="student-detail-panel">
            <summary>
              <span>
                <span className="eyebrow">Saved history</span>
                <strong>Open attempts and score guide</strong>
              </span>
              <span className="band-chip">{promptSavedAssessments.length} saved</span>
            </summary>
            <WritingScoreGuidePanel />
            <WritingSavedHistoryPanel
              activeAttemptId={activeAttemptId}
              activeSavedAssessment={activeSavedAssessment}
              onInspectAttempt={handleInspectAttempt}
              progressSummary={progressSummary}
              promptSavedAssessments={promptSavedAssessments}
            />
          </details>
        </div>
      </section>
    </main>
  );
}
