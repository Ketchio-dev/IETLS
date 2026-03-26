import { NextResponse } from 'next/server';

import { WRITING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import { getAssessmentWorkspace } from '@/lib/assessment-workspace';

export async function POST(request: Request) {
  const result = await getAssessmentWorkspace().submitAssessment(WRITING_ASSESSMENT_MODULE_ID, await request.json());

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.payload);
}
