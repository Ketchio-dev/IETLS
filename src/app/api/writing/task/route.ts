import { NextResponse } from 'next/server';

import { getAssessmentModule } from '@/lib/assessment-modules/registry';

export async function GET() {
  return NextResponse.json(await getAssessmentModule('writing').loadTaskData());
}
