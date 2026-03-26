import type { BandRange, WritingTaskType } from '@/lib/domain';

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
