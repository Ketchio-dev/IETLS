import type { DashboardStudyPlan, DashboardStudyPlanStep } from '@/components/dashboard/dashboard-types';
import type { ReadingDashboardPageData } from '@/lib/services/reading/types';
import type { WritingDashboardPageData } from '@/lib/services/writing/application-service';
import { buildDashboardStudyPlanModel } from '@/components/writing/writing-dashboard-model';

export interface CurriculumModulePlan {
  id: 'reading' | 'writing';
  label: string;
  href: string;
  dashboardHref: string;
  plan: DashboardStudyPlan;
  currentStep: DashboardStudyPlanStep | null;
  completedSteps: number;
  totalSteps: number;
}

export interface CurriculumPageData {
  headline: string;
  summary: string;
  primaryModule: CurriculumModulePlan;
  modules: CurriculumModulePlan[];
  todaySteps: Array<DashboardStudyPlanStep & { moduleId: 'reading' | 'writing'; moduleLabel: string }>;
}

function findCurrentStep(plan: DashboardStudyPlan) {
  return plan.steps.find((step) => step.status === 'current')
    ?? plan.steps.find((step) => step.status !== 'done')
    ?? plan.steps[0]
    ?? null;
}

function countCompletedSteps(plan: DashboardStudyPlan) {
  return plan.steps.filter((step) => step.status === 'done').length;
}

function buildModulePlan({
  id,
  label,
  href,
  dashboardHref,
  plan,
}: {
  id: 'reading' | 'writing';
  label: string;
  href: string;
  dashboardHref: string;
  plan: DashboardStudyPlan;
}): CurriculumModulePlan {
  return {
    id,
    label,
    href,
    dashboardHref,
    plan,
    currentStep: findCurrentStep(plan),
    completedSteps: countCompletedSteps(plan),
    totalSteps: plan.steps.length,
  };
}

export function buildCurriculumPageData({
  reading,
  writing,
}: {
  reading: ReadingDashboardPageData;
  writing: WritingDashboardPageData;
}): CurriculumPageData {
  const writingPlan = buildDashboardStudyPlanModel(writing.studyPlan);
  const readingPlan = reading.studyPlan ?? {
    summary: reading.studyFocus[0] ?? 'Complete one Reading set to unlock the Reading path.',
    horizonLabel: 'Reading block',
    steps: [],
    carryForward: reading.studyFocus,
  };
  const writingModule = buildModulePlan({
    id: 'writing',
    label: 'Writing',
    href: '/writing',
    dashboardHref: '/dashboard',
    plan: writingPlan,
  });
  const readingModule = buildModulePlan({
    id: 'reading',
    label: 'Reading',
    href: '/reading',
    dashboardHref: '/reading/dashboard',
    plan: readingPlan,
  });
  const modules = [readingModule, writingModule];
  const primaryModule = modules.sort((left, right) => {
    const leftDone = left.currentStep?.status === 'done' ? 1 : 0;
    const rightDone = right.currentStep?.status === 'done' ? 1 : 0;
    return leftDone - rightDone || left.completedSteps - right.completedSteps;
  })[0] ?? readingModule;
  const todaySteps = modules
    .map((module) => module.currentStep
      ? {
          ...module.currentStep,
          moduleId: module.id,
          moduleLabel: module.label,
        }
      : null)
    .filter((step): step is DashboardStudyPlanStep & { moduleId: 'reading' | 'writing'; moduleLabel: string } => Boolean(step));

  return {
    headline: 'Follow today\'s IELTS curriculum',
    summary:
      'Start with the current step, finish its completion signal, then return here for the next block. Reading and Writing update from your saved attempts.',
    primaryModule,
    modules,
    todaySteps,
  };
}
