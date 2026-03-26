import { NextResponse } from 'next/server';

import { submitAssessmentWorkspaceEntry } from '@/lib/server/assessment-module-registry';

export async function POST(request: Request) {
  const result = await submitAssessmentWorkspaceEntry(await request.json());

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.payload);
}
