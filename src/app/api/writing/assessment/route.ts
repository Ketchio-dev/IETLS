import { NextResponse } from 'next/server';

import { submitDefaultAssessment } from '@/lib/server/assessment-workspace';

export async function POST(request: Request) {
  const result = await submitDefaultAssessment(await request.json());

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.payload);
}
