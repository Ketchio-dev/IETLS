import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import { READING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import type { PlaceholderAssessmentPracticePageData } from '@/lib/services/assessment-placeholders/application-service';

const mocks = vi.hoisted(() => ({
  loadAssessmentPracticePageData: vi.fn(),
  shellSpy: vi.fn(),
}));

vi.mock('@/lib/server/assessment-workspace', () => ({
  loadAssessmentPracticePageData: mocks.loadAssessmentPracticePageData,
}));

vi.mock('@/components/assessment/assessment-placeholder-shell', () => ({
  AssessmentPlaceholderShell: (props: unknown) => {
    mocks.shellSpy(props);
    return null;
  },
}));

import ReadingPage from '../page';

afterEach(() => {
  vi.clearAllMocks();
});

describe('ReadingPage', () => {
  it('hydrates the reading placeholder through the shared assessment workspace', async () => {
    const pageData: PlaceholderAssessmentPracticePageData = {
      moduleId: 'reading',
      moduleLabel: 'IELTS Academic Reading Placeholder',
      statusLabel: 'Placeholder',
      summary: 'Reading placeholder summary',
      practiceTitle: 'Reading module placeholder',
      practiceDescription: 'Reading placeholder description',
      routeBase: '/reading',
      plannedMilestones: ['Milestone 1'],
      currentGuardrails: ['Guardrail 1'],
    };
    mocks.loadAssessmentPracticePageData.mockResolvedValue(pageData);

    render(await ReadingPage());

    expect(mocks.loadAssessmentPracticePageData).toHaveBeenCalledWith(READING_ASSESSMENT_MODULE_ID, {});
    expect(mocks.shellSpy).toHaveBeenCalledWith(pageData);
  });
});
