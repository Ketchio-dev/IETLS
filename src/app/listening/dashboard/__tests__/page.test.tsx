import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import { LISTENING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
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

import ListeningDashboardPage from '../page';

afterEach(() => {
  vi.clearAllMocks();
});

describe('ListeningDashboardPage', () => {
  it('hydrates the listening dashboard through the shared assessment workspace', async () => {
    const pageData: PlaceholderAssessmentDashboardPageData = {
      moduleId: 'listening',
      moduleLabel: 'IELTS Academic Listening Placeholder',
      statusLabel: 'Placeholder',
      summary: 'Listening placeholder summary',
      dashboardTitle: 'Listening dashboard placeholder',
      dashboardDescription: 'Listening placeholder dashboard description',
      routeBase: '/listening',
      statusCards: [{ label: 'Scripts', value: 'Not started', detail: 'None yet' }],
      nextSteps: ['Next step'],
    };
    mocks.loadAssessmentDashboardPageData.mockResolvedValue(pageData);

    render(await ListeningDashboardPage());

    expect(mocks.loadAssessmentDashboardPageData).toHaveBeenCalledWith(LISTENING_ASSESSMENT_MODULE_ID);
    expect(mocks.dashboardSpy).toHaveBeenCalledWith(pageData);
  });
});
