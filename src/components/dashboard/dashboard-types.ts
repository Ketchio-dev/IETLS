import type { BandRange, CriterionName, WritingTaskType } from '@/lib/domain';

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
  criterion?: CriterionName | 'Overall';
  taskTypes?: WritingTaskType[];
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
