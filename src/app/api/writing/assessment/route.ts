import { NextResponse } from 'next/server';

import { writingPromptBank } from '@/lib/fixtures/writing';
import { saveAssessmentResult, seedPrompt } from '@/lib/server/writing-assessment-repository';
import { runAssessmentPipeline } from '@/lib/services/assessment';

export async function POST(request: Request) {
  const body = await request.json();
  const promptId = typeof body?.promptId === 'string' ? body.promptId : '';
  const response = typeof body?.response === 'string' ? body.response : '';
  const timeSpentMinutes = typeof body?.timeSpentMinutes === 'number' ? body.timeSpentMinutes : 0;

  if (!promptId || response.trim().length < 50) {
    return NextResponse.json(
      { error: 'Provide a promptId and at least 50 characters of writing.' },
      { status: 400 },
    );
  }

  const prompt = writingPromptBank.find((item) => item.id === promptId);

  if (!prompt) {
    return NextResponse.json({ error: 'Unknown writing prompt requested.' }, { status: 404 });
  }

  await seedPrompt(prompt);
  const result = await runAssessmentPipeline(prompt, {
    promptId,
    taskType: prompt.taskType,
    response,
    timeSpentMinutes,
  });
  const stored = await saveAssessmentResult(result);

  return NextResponse.json({
    report: stored.report,
    submission: stored.submission,
    recentAttempts: stored.recentAttempts,
    savedAssessments: stored.savedAssessments,
  });
}
