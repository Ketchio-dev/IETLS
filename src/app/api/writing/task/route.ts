import { NextResponse } from 'next/server';

import { loadAssessmentWorkspaceTaskData } from '@/lib/server/assessment-module-registry';

export async function GET() {
  return NextResponse.json(await loadAssessmentWorkspaceTaskData());
}
