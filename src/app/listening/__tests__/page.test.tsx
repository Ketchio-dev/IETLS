import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import { LISTENING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
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

import ListeningPage from '../page';

afterEach(() => {
  vi.clearAllMocks();
});

describe('ListeningPage', () => {
  it('hydrates the listening placeholder through the shared assessment workspace', async () => {
    const pageData: PlaceholderAssessmentPracticePageData = {
      moduleId: 'listening',
      moduleLabel: 'IELTS Academic Listening Placeholder',
      statusLabel: 'Placeholder',
      summary: 'Listening placeholder summary',
      practiceTitle: 'Listening module placeholder',
      practiceDescription: 'Listening placeholder description',
      routeBase: '/listening',
      plannedMilestones: ['Milestone 1'],
      currentGuardrails: ['Guardrail 1'],
    };
    mocks.loadAssessmentPracticePageData.mockResolvedValue(pageData);

    render(await ListeningPage());

    expect(mocks.loadAssessmentPracticePageData).toHaveBeenCalledWith(LISTENING_ASSESSMENT_MODULE_ID, {});
    expect(mocks.shellSpy).toHaveBeenCalledWith(pageData);
  });
});
