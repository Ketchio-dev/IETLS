import { NextResponse } from 'next/server';

import { submitWritingAssessment } from '@/lib/services/writing/application-service';

export async function POST(request: Request) {
  const result = await submitWritingAssessment(await request.json());

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.payload);
}
