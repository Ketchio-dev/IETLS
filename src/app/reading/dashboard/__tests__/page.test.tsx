import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import { READING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import type { PlaceholderAssessmentDashboardPageData } from '@/lib/services/assessment-placeholders/application-service';

const mocks = vi.hoisted(() => ({
  loadAssessmentDashboardPageData: vi.fn(),
  dashboardSpy: vi.fn(),
}));

vi.mock('@/lib/server/assessment-workspace', () => ({
  loadAssessmentDashboardPageData: mocks.loadAssessmentDashboardPageData,
}));

vi.mock('@/components/assessment/assessment-placeholder-dashboard', () => ({
  AssessmentPlaceholderDashboard: (props: unknown) => {
    mocks.dashboardSpy(props);
    return null;
  },
}));

import ReadingDashboardPage from '../page';

afterEach(() => {
  vi.clearAllMocks();
});

describe('ReadingDashboardPage', () => {
  it('hydrates the reading dashboard through the shared assessment workspace', async () => {
    const pageData: PlaceholderAssessmentDashboardPageData = {
      moduleId: 'reading',
      moduleLabel: 'IELTS Academic Reading Placeholder',
      statusLabel: 'Placeholder',
      summary: 'Reading placeholder summary',
      dashboardTitle: 'Reading dashboard placeholder',
      dashboardDescription: 'Reading placeholder dashboard description',
      routeBase: '/reading',
      statusCards: [{ label: 'Content', value: 'Not started', detail: 'None yet' }],
      nextSteps: ['Next step'],
    };
    mocks.loadAssessmentDashboardPageData.mockResolvedValue(pageData);

    render(await ReadingDashboardPage());

    expect(mocks.loadAssessmentDashboardPageData).toHaveBeenCalledWith(READING_ASSESSMENT_MODULE_ID);
    expect(mocks.dashboardSpy).toHaveBeenCalledWith(pageData);
  });
});
