import type { BandRange, WritingDashboardSummary, WritingTaskType } from '@/lib/domain';

const taskLabelByType: Record<WritingTaskType, string> = {
  'task-1': 'Task 1',
  'task-2': 'Task 2',
};

export function formatBandRange(range: BandRange | null | undefined) {
  if (!range) {
    return 'No scored range yet';
  }

  return `Band ${range.lower.toFixed(1)}-${range.upper.toFixed(1)}`;
}

export function formatTaskTypeList(taskTypes: WritingTaskType[] | undefined) {
  if (!taskTypes || taskTypes.length === 0) {
    return 'All writing tasks';
  }

  const uniqueLabels = Array.from(new Set(taskTypes.map((taskType) => taskLabelByType[taskType])));

  if (uniqueLabels.length === 1) {
    return uniqueLabels[0];
  }

  if (uniqueLabels.length === 2) {
    return `${uniqueLabels[0]} + ${uniqueLabels[1]}`;
  }

  return `${uniqueLabels.slice(0, -1).join(', ')} + ${uniqueLabels[uniqueLabels.length - 1]}`;
}

export function formatCountLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}


export function formatDateTime(value: string | null) {
  if (!value) {
    return 'No saved attempt yet';
  }

  return new Date(value).toLocaleString();
}

export function formatTaskCoverage(taskCounts: WritingDashboardSummary['taskCounts']) {
  return `${taskCounts['task-1']} Task 1 • ${taskCounts['task-2']} Task 2`;
}

export function formatCriterionTaskCoverage(
  taskTypes: WritingDashboardSummary['criterionSummaries'][number]['taskTypes'],
) {
  if (taskTypes.length === 2) {
    return 'Task 1 + Task 2';
  }

  return taskTypes[0] === 'task-1' ? 'Task 1 only' : 'Task 2 only';
}

export function formatSignedBandDelta(value: number | null) {
  if (value === null) {
    return 'Need one more saved attempt';
  }

  if (value === 0) {
    return 'No change';
  }

  return `${value > 0 ? '+' : ''}${value.toFixed(1)} band vs previous`;
}

export function formatTrendLabel(trend: WritingDashboardSummary['criterionSummaries'][number]['trend']) {
  switch (trend) {
    case 'improving':
      return 'Improving';
    case 'slipping':
      return 'Slipping';
    case 'steady':
      return 'Steady';
    default:
      return 'First scored checkpoint';
  }
}
