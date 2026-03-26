import { NextResponse } from 'next/server';

import { LISTENING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import { loadAssessmentTaskData } from '@/lib/server/assessment-workspace';

export async function GET() {
  const taskData = await loadAssessmentTaskData(LISTENING_ASSESSMENT_MODULE_ID);

  return NextResponse.json(taskData);
}
