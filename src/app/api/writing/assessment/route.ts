import { NextResponse } from 'next/server';

import { buildMockAssessmentReport } from '@/lib/services/assessment';

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

  const report = buildMockAssessmentReport({ promptId, response, timeSpentMinutes });

  return NextResponse.json({ report });
}
