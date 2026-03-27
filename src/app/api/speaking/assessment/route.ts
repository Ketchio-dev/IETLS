import { NextResponse } from 'next/server';

import { validateSpeakingAssessmentPayload } from '@/app/api/_shared/assessment-validation';
import { SPEAKING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import { isSpeakingAlphaEnabled } from '@/lib/server/module-flags';
import { submitAssessmentForModule } from '@/lib/server/assessment-workspace';

export async function POST(request: Request) {
  if (!isSpeakingAlphaEnabled()) {
    return NextResponse.json(
      { error: 'Speaking alpha is disabled in this environment until the STT/audio pipeline is ready.' },
      { status: 503 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!validateSpeakingAssessmentPayload(body)) {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 422 });
  }

  try {
    const result = await submitAssessmentForModule(SPEAKING_ASSESSMENT_MODULE_ID, body);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.payload);
  } catch {
    return NextResponse.json({ error: 'Unable to score the Speaking assessment right now.' }, { status: 500 });
  }
}
