import { NextResponse } from 'next/server';

import { getAssessmentModule } from '@/lib/assessment-modules/registry';

export async function POST(request: Request) {
  const result = await getAssessmentModule('writing').submitAssessment(await request.json());

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.payload);
}
