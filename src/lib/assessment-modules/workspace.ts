export interface AssessmentWorkspaceRoutes {
  practice: string;
  dashboard: string;
  taskApi: string;
  assessmentApi: string;
}

export interface AssessmentWorkspaceDefinition {
  id: string;
  label: string;
  summary: string;
  routes: AssessmentWorkspaceRoutes;
}

export interface AssessmentWorkspace {
  moduleId: string;
  moduleLabel: string;
  moduleSummary: string;
  practicePath: string;
  dashboardPath: string;
  taskApiPath: string;
  assessmentApiPath: string;
}

export const writingAssessmentWorkspace: AssessmentWorkspace = {
  moduleId: 'writing',
  moduleLabel: 'IELTS Academic Writing',
  moduleSummary: 'Timed writing practice with persisted reports, dashboard trends, and Gemini 3 Flash scoring by default.',
  practicePath: '/',
  dashboardPath: '/dashboard',
  taskApiPath: '/api/writing/task',
  assessmentApiPath: '/api/writing/assessment',
};

export function toAssessmentWorkspaceDefinition(workspace: AssessmentWorkspace): AssessmentWorkspaceDefinition {
  return {
    id: workspace.moduleId,
    label: workspace.moduleLabel,
    summary: workspace.moduleSummary,
    routes: {
      practice: workspace.practicePath,
      dashboard: workspace.dashboardPath,
      taskApi: workspace.taskApiPath,
      assessmentApi: workspace.assessmentApiPath,
    },
  };
}

export const writingAssessmentWorkspaceDefinition = toAssessmentWorkspaceDefinition(writingAssessmentWorkspace);

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
