import { NextResponse } from 'next/server';

import { submitReviewResult } from '@/lib/services/review/application-service';

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 422 });
  }

  const { itemId, answer } = body as { itemId?: unknown; answer?: unknown };

  try {
    const result = await submitReviewResult({ itemId, answer });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.payload);
  } catch {
    return NextResponse.json({ error: 'Unable to record the review result right now.' }, { status: 500 });
  }
}
