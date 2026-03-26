import { WritingDashboard } from '@/components/writing/writing-dashboard';
import { writingPromptBank } from '@/lib/fixtures/writing';
import {
  getDashboardStudyPlan,
  listPrompts,
  listRecentAttempts,
  listSavedAssessments,
  seedPrompts,
} from '@/lib/server/writing-assessment-repository';
import { buildDashboardSummary } from '@/lib/services/writing/dashboard';
import { buildProgressSummary } from '@/lib/services/writing/progress-summary';

export default async function DashboardPage() {
  await seedPrompts(writingPromptBank);
  const prompts = await listPrompts();
  const recentAttempts = await listRecentAttempts(12);
  const savedAssessments = await listSavedAssessments(50);
  const summary = buildDashboardSummary(savedAssessments);
  const progress = buildProgressSummary(recentAttempts);
  const studyPlan = await getDashboardStudyPlan(prompts, savedAssessments);

  return (
    <WritingDashboard
      progress={progress}
      prompts={prompts}
      recentSavedAttempts={savedAssessments.slice(0, 6)}
      studyPlan={studyPlan}
      summary={summary}
    />
  );
}
