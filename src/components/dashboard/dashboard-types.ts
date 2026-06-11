import type { BandRange, CriterionName, WritingTaskType } from '@/lib/domain';

export type StudyPlanPhase = 'benchmark' | 'daily-session' | 'next-block' | 'complete';
export type StudyPlanStatus = 'locked' | 'current' | 'done';

export interface DashboardMetricCard {
  id: string;
  label: string;
  value: string;
  detail: string;
  eyebrow?: string;
  badge?: string;
}

export interface DashboardStudyPlanStep {
  id: string;
  title: string;
  detail: string;
  actions: string[];
  phase?: StudyPlanPhase;
  status?: StudyPlanStatus;
  completionSignal?: string;
  completedAt?: string | null;
  criterion?: CriterionName | 'Overall';
  taskTypes?: WritingTaskType[];
  moduleLabel?: string;
  targetRange?: BandRange | null;
  sessionLabel?: string;
  actionHref?: string;
  actionLabel?: string;
}

export interface DashboardStudyPlan {
  summary: string;
  horizonLabel: string;
  recommendedSessionLabel?: string;
  steps: DashboardStudyPlanStep[];
  carryForward?: string[];
}
