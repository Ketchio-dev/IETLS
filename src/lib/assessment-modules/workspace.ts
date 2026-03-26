export interface AssessmentWorkspace {
  moduleId: string;
  moduleLabel: string;
  practicePath: string;
  dashboardPath: string;
  taskApiPath: string;
  assessmentApiPath: string;
}

export const writingAssessmentWorkspace: AssessmentWorkspace = {
  moduleId: 'writing',
  moduleLabel: 'IELTS Academic Writing',
  practicePath: '/',
  dashboardPath: '/dashboard',
  taskApiPath: '/api/writing/task',
  assessmentApiPath: '/api/writing/assessment',
};

export function buildPracticeWorkspaceHref(
  workspace: AssessmentWorkspace,
  searchParams: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `${workspace.practicePath}?${query}` : workspace.practicePath;
}
