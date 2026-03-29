import type { WritingPrompt } from '@/lib/domain';

export type PromptDifficulty = 'Foundation' | 'Standard' | 'Stretch';
export type PromptTheme =
  | 'Education'
  | 'Health'
  | 'Transport'
  | 'Environment'
  | 'Policy'
  | 'Technology'
  | 'Work & economy'
  | 'Cities & society'
  | 'Data trends'
  | 'General issues';

export function getPromptDifficulty(prompt: WritingPrompt): PromptDifficulty {
  if (prompt.taskType === 'task-1') {
    return prompt.visual?.type === 'mixed' ? 'Stretch' : prompt.visual?.type === 'table' ? 'Standard' : 'Foundation';
  }

  if (prompt.questionType === 'Two-part question' || prompt.questionType === 'Discuss both views + opinion') {
    return 'Stretch';
  }

  if (prompt.questionType === 'Problem / solution' || prompt.questionType === 'Advantages / disadvantages') {
    return 'Standard';
  }

  return 'Foundation';
}

export function getPromptTheme(prompt: WritingPrompt): PromptTheme {
  const keywordTargets = Array.isArray(prompt.keywordTargets) ? prompt.keywordTargets : [];
  const keywordText = `${prompt.title} ${prompt.prompt} ${keywordTargets.join(' ')}`.toLowerCase();

  if (/(school|student|university|education|homework|teacher|library)/.test(keywordText)) return 'Education';
  if (/(health|hospital|illness|screen time|food|diet|sport)/.test(keywordText)) return 'Health';
  if (/(transport|road|car|traffic|bike|commut|metro)/.test(keywordText)) return 'Transport';
  if (/(environment|recycling|energy|renewable|pollution|park|wildlife|zoo)/.test(keywordText)) return 'Environment';
  if (/(government|tax|funding|budget|policy|public service|space exploration)/.test(keywordText)) return 'Policy';
  if (/(technology|artificial intelligence|digital|cashless|automation|online|device)/.test(keywordText)) return 'Technology';
  if (/(work|career|productivity|retirement|employee|jobs|tourism|hotel)/.test(keywordText)) return 'Work & economy';
  if (/(city|housing|historic|urban|community)/.test(keywordText)) return 'Cities & society';
  return prompt.taskType === 'task-1' ? 'Data trends' : 'General issues';
}
