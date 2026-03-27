import { NextResponse } from 'next/server';

import { LISTENING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import { submitAssessmentForModule } from '@/lib/server/assessment-workspace';

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 422 });
  }

  const result = await submitAssessmentForModule(LISTENING_ASSESSMENT_MODULE_ID, body);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.payload);
}
