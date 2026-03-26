import { NextResponse } from 'next/server';

import { WRITING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import { getAssessmentWorkspace } from '@/lib/assessment-workspace';

export async function GET() {
  return NextResponse.json(await getAssessmentWorkspace().loadTaskData(WRITING_ASSESSMENT_MODULE_ID));
}
