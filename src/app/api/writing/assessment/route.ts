import { NextResponse } from 'next/server';

import { submitDefaultAssessment } from '@/lib/server/assessment-workspace';

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== 'object' ||
    typeof (body as { promptId?: unknown }).promptId !== 'string' ||
    typeof (body as { response?: unknown }).response !== 'string' ||
    ('timeSpentMinutes' in body &&
      typeof (body as { timeSpentMinutes?: unknown }).timeSpentMinutes !== 'undefined' &&
      typeof (body as { timeSpentMinutes?: unknown }).timeSpentMinutes !== 'number')
  ) {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 422 });
  }

  const result = await submitDefaultAssessment(body);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.payload);
}
