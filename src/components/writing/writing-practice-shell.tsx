'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { writingAssessmentWorkspace } from '@/lib/assessment-modules/workspace';
import type {
  AssessmentReport,
  RecentAttemptSummary,
  SavedAssessmentSnapshot,
  WritingPrompt,
  WritingTaskType,
} from '@/lib/domain';
import { getSampleResponse } from '@/lib/fixtures/writing';
import {
  getPromptDifficulty,
  getPromptTheme,
  type PromptDifficulty,
  type PromptTheme,
} from '@/lib/services/writing/prompt-taxonomy';
import { buildPromptRecommendations } from '@/lib/services/writing/prompt-recommendations';
import { buildProgressSummary } from '@/lib/services/writing/progress-summary';

import { AssessmentReportPanel } from './assessment-report';
import { Task1VisualRenderer } from './task1-visual-renderer';

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
  const [response, setResponse] = useState(getSampleResponse(initialPromptSelection.id));
  const [secondsRemaining, setSecondsRemaining] = useState(initialPromptSelection.recommendedMinutes * 60);
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

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSecondsRemaining((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setSecondsRemaining(activePrompt.recommendedMinutes * 60);
    setResponse(getSampleResponse(activePrompt.id));
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

  const wordCount = useMemo(() => response.trim().split(/\s+/).filter(Boolean).length, [response]);
  const progressSummary = useMemo(() => buildProgressSummary(promptRecentAttempts), [promptRecentAttempts]);
  const timeSpentMinutes = activePrompt.recommendedMinutes - secondsRemaining / 60;
  const activeSavedAssessment = useMemo(
    () => promptSavedAssessments.find((attempt) => attempt.submissionId === activeAttemptId) ?? null,
    [activeAttemptId, promptSavedAssessments],
  );
  const activeTaskLabel = getTaskLabel(activePrompt.taskType);
  const wordsRemaining = Math.max(activePrompt.suggestedWordCount - wordCount, 0);
  const nextRevisionStep = report.nextSteps[0] ?? null;
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

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);

    try {
      const nextReportResponse = await fetch(writingAssessmentWorkspace.assessmentApiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptId: activePrompt.id,
          response,
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
  }

  function handleInspectAttempt(attempt: SavedAssessmentSnapshot) {
    setActiveAttemptId(attempt.submissionId);
    setReport(attempt.report);
  }

  function handlePromptChange(nextPromptId: string) {
    setSelectedPromptId(nextPromptId);
  }

  function handleTaskTypeChange(nextTaskType: WritingTaskType) {
    setSelectedTaskType(nextTaskType);
    setSelectedQuestionType('all');
    setSelectedDifficulty('all');
    setSelectedTheme('all');
    setSearchQuery('');
    const nextPrompt = prompts.find((item) => item.taskType === nextTaskType) ?? prompt;
    setSelectedPromptId(nextPrompt.id);
  }

  const formattedClock = `${String(Math.floor(secondsRemaining / 60)).padStart(2, '0')}:${String(
    secondsRemaining % 60,
  ).padStart(2, '0')}`;
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
            <Link className="secondary-link-button" href={writingAssessmentWorkspace.dashboardPath}>
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
            <strong>{formattedClock}</strong>
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
          <article className="panel" id="writing-editor">
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
          </article>

          <article className="panel">
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
                    onClick={() => handleTaskTypeChange(taskType)}
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
                    onClick={() => handlePromptChange(recommendedPrompt.prompt.id)}
                    type="button"
                  >
                    Jump to recommended prompt
                  </button>
                  {promptRecommendations.length > 1 ? (
                    <button
                      className="secondary-link-button"
                      onClick={() => setRecommendationIndex((current) => (current + 1) % promptRecommendations.length)}
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
                    onChange={(event) => setSelectedQuestionType(event.target.value)}
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
                    onChange={(event) => setSelectedDifficulty(event.target.value as 'all' | PromptDifficulty)}
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
                    onChange={(event) => setSelectedTheme(event.target.value as 'all' | PromptTheme)}
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
                    onChange={(event) => setSearchQuery(event.target.value)}
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
                    onClick={() => handlePromptChange(item.id)}
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
          </article>

          <article className="panel">
            <div className="editor-header">
              <div>
                <p className="eyebrow">Timed editor</p>
                <h2>Draft response</h2>
              </div>
              <button
                className="primary-button"
                disabled={isSubmitting || wordCount < activePrompt.suggestedWordCount}
                onClick={handleSubmit}
                type="button"
              >
                {isSubmitting ? 'Scoring…' : getSubmitLabel(activePrompt.taskType)}
              </button>
              <p className="summary-copy">Task 1 needs 150+ words. Task 2 needs 250+ words.</p>
            </div>
            <textarea
              aria-label="Essay response"
              className="essay-textarea"
              placeholder={getEditorPlaceholder(activePrompt.taskType)}
              onChange={(event) => setResponse(event.target.value)}
              value={response}
            />
            <div className="editor-footer">
              <span>
                {wordCount} words · {wordsRemaining > 0 ? `${wordsRemaining} more to unlock scoring` : 'minimum reached'}
              </span>
              <span>{getMinimumWordLabel(activePrompt.taskType, activePrompt.suggestedWordCount)}</span>
              <span>{timeSpentMinutes.toFixed(1)} min spent</span>
            </div>
            {error ? <p className="error-text">{error}</p> : null}
          </article>
        </div>

        <div className="workspace-column right-column">
          <section className="panel service-panel">
            <p className="eyebrow">Do this next</p>
            <h2>Turn this report into the next better draft</h2>
            <div className="service-list">
              <article>
                <h3>Fix first</h3>
                <p>{nextRevisionStep ? `${nextRevisionStep.title}: ${nextRevisionStep.description}` : 'Score one full draft to unlock the clearest next revision target.'}</p>
              </article>
              <article>
                <h3>Then decide</h3>
                <p>{nextMoveCopy}</p>
              </article>
              <article>
                <h3>Keep one strength</h3>
                <p>{report.strengths[0] ?? 'Keep the clearest paragraph structure or idea development from this draft stable while you revise.'}</p>
              </article>
            </div>
            <div className="hero-actions">
              <a className="secondary-link-button" href="#writing-editor">
                Revise this draft now
              </a>
              {recommendedPrompt ? (
                <button
                  className="secondary-link-button"
                  onClick={() => handlePromptChange(recommendedPrompt.prompt.id)}
                  type="button"
                >
                  Open next recommended prompt
                </button>
              ) : null}
            </div>
          </section>

          <AssessmentReportPanel report={report} />

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
                  <span>Inspecting: {new Date(activeSavedAssessment.createdAt).toLocaleString()}</span>
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
                        aria-label={`Inspect saved attempt from ${new Date(attempt.createdAt).toLocaleString()}`}
                        aria-pressed={isActive}
                        className={`history-card history-card-button${isActive ? ' is-active' : ''}`}
                        key={`${attempt.submissionId}-${index}`}
                        onClick={() => handleInspectAttempt(attempt)}
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
                          <span>{new Date(attempt.createdAt).toLocaleString()}</span>
                          <span>{isActive ? 'Viewing report' : 'Saved result'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
