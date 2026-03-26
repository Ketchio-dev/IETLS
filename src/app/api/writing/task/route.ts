import { NextResponse } from 'next/server';

import { loadDefaultAssessmentTaskData } from '@/lib/server/assessment-workspace';

export async function GET() {
  return NextResponse.json(await loadDefaultAssessmentTaskData());
}
