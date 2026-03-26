import { NextResponse } from 'next/server';

import { loadWritingTaskData } from '@/lib/services/writing/application-service';

export async function GET() {
  return NextResponse.json(await loadWritingTaskData());
}
