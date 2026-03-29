import type { SavedAssessmentSnapshot, WritingPrompt, WritingTaskType } from '@/lib/domain';

import { getPromptDifficulty, getPromptTheme } from './prompt-taxonomy';

interface BuildRecommendationOptions {
  prompts: WritingPrompt[];
  savedAttempts: SavedAssessmentSnapshot[];
  taskType?: WritingTaskType;
  excludePromptId?: string | null;
}

export interface PromptRecommendation {
  prompt: WritingPrompt;
  theme: string;
  difficulty: string;
  promptAttemptCount: number;
  themeAttemptCount: number;
  reason: string;
}

function sortAttemptsDescending(savedAttempts: SavedAssessmentSnapshot[]) {
  return [...savedAttempts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function rankPromptRecommendations({
  prompts,
  savedAttempts,
  taskType,
  excludePromptId = null,
}: BuildRecommendationOptions): PromptRecommendation | null {
  const filteredPrompts = prompts.filter((prompt) => {
    if (taskType && prompt.taskType !== taskType) {
      return false;
    }

    if (excludePromptId && prompt.id === excludePromptId) {
      return false;
    }

    return true;
  });

  if (filteredPrompts.length === 0) {
    return null;
  }

  const orderedAttempts = sortAttemptsDescending(savedAttempts);
  const recentPromptIds = orderedAttempts.slice(0, 3).map((attempt) => attempt.promptId);
  const promptById = new Map(prompts.map((prompt) => [prompt.id, prompt] as const));
  const recentThemes = orderedAttempts
    .slice(0, 3)
    .map((attempt) => promptById.get(attempt.promptId))
    .filter((prompt): prompt is WritingPrompt => Boolean(prompt))
    .map((prompt) => getPromptTheme(prompt));

  const taskCounts = orderedAttempts.reduce<Record<WritingTaskType, number>>(
    (counts, attempt) => {
      counts[attempt.taskType] += 1;
      return counts;
    },
    { 'task-1': 0, 'task-2': 0 },
  );

  const preferredTaskType =
    taskCounts['task-1'] === taskCounts['task-2']
      ? null
      : taskCounts['task-1'] < taskCounts['task-2']
        ? 'task-1'
        : 'task-2';

  const promptAttempts = new Map<string, number>();
  const themeAttempts = new Map<string, number>();
  for (const attempt of orderedAttempts) {
    promptAttempts.set(attempt.promptId, (promptAttempts.get(attempt.promptId) ?? 0) + 1);

    const prompt = promptById.get(attempt.promptId);
    if (!prompt) continue;
    const theme = getPromptTheme(prompt);
    themeAttempts.set(theme, (themeAttempts.get(theme) ?? 0) + 1);
  }

  const ranked = filteredPrompts
    .map((prompt) => {
      const theme = getPromptTheme(prompt);
      const difficulty = getPromptDifficulty(prompt);
      const promptAttemptCount = promptAttempts.get(prompt.id) ?? 0;
      const themeAttemptCount = themeAttempts.get(theme) ?? 0;

      let score = 0;
      if (preferredTaskType && prompt.taskType === preferredTaskType) score += 6;
      if (!recentPromptIds.includes(prompt.id)) score += 5;
      if (!recentThemes.includes(theme)) score += 4;
      if (promptAttemptCount === 0) score += 4;
      if (themeAttemptCount === 0) score += 3;
      score -= promptAttemptCount * 3;
      score -= themeAttemptCount;

      const reasonParts = [];
      if (preferredTaskType && prompt.taskType === preferredTaskType) reasonParts.push('balances your task mix');
      if (promptAttemptCount === 0) reasonParts.push('fresh prompt');
      if (themeAttemptCount === 0) reasonParts.push(`new ${theme.toLowerCase()} theme`);
      if (!recentThemes.includes(theme) && themeAttemptCount > 0) reasonParts.push(`breaks your recent ${theme.toLowerCase()} streak`);
      if (reasonParts.length === 0) reasonParts.push(`lowest repeat load in ${theme.toLowerCase()}`);

      return {
        prompt,
        theme,
        difficulty,
        promptAttemptCount,
        themeAttemptCount,
        score,
        reason: reasonParts[0]!,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.promptAttemptCount - b.promptAttemptCount ||
        a.themeAttemptCount - b.themeAttemptCount ||
        a.prompt.title.localeCompare(b.prompt.title),
    );

  return ranked[0]
    ? {
        prompt: ranked[0].prompt,
        theme: ranked[0].theme,
        difficulty: ranked[0].difficulty,
        promptAttemptCount: ranked[0].promptAttemptCount,
        themeAttemptCount: ranked[0].themeAttemptCount,
        reason: ranked[0].reason,
      }
    : null;
}

export function buildPromptRecommendations(
  options: BuildRecommendationOptions,
  maxCount = 3,
): PromptRecommendation[] {
  const ranked: PromptRecommendation[] = [];
  const usedPromptIds = new Set<string>();

  while (ranked.length < maxCount) {
    const next = rankPromptRecommendations({
      ...options,
      prompts: options.prompts.filter((prompt) => !usedPromptIds.has(prompt.id)),
    });

    if (!next) {
      break;
    }

    ranked.push(next);
    usedPromptIds.add(next.prompt.id);
  }

  return ranked;
}

export function buildPromptRecommendation(options: BuildRecommendationOptions): PromptRecommendation | null {
  return buildPromptRecommendations(options, 1)[0] ?? null;
}
