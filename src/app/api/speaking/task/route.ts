import { NextResponse } from 'next/server';

import { SPEAKING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import { loadAssessmentTaskData } from '@/lib/server/assessment-workspace';

export async function GET() {
  return NextResponse.json(await loadAssessmentTaskData(SPEAKING_ASSESSMENT_MODULE_ID));
}
