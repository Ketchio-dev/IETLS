import { NextResponse } from 'next/server';

import { READING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import { submitAssessmentForModule } from '@/lib/server/assessment-workspace';

export async function POST(request: Request) {
  const result = await submitAssessmentForModule(READING_ASSESSMENT_MODULE_ID, await request.json());

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.payload);
}
