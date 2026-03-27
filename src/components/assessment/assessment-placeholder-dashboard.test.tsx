import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AssessmentPlaceholderDashboard } from './assessment-placeholder-dashboard';

describe('AssessmentPlaceholderDashboard', () => {
  it('renders placeholder dashboard with status cards and next steps', () => {
    render(
      <AssessmentPlaceholderDashboard
        moduleId="listening"
        moduleLabel="IELTS Academic Listening Placeholder"
        statusLabel="Placeholder"
        summary="Listening placeholder summary"
        dashboardTitle="Listening dashboard placeholder"
        dashboardDescription="Listening dashboard description"
        routeBase="/listening"
        statusCards={[{ label: 'Scripts', value: 'Not started', detail: 'No scripts yet' }]}
        nextSteps={['Next step 1']}
      />,
    );

    expect(screen.getByText('IELTS Academic Listening Placeholder')).toBeInTheDocument();
    expect(screen.getByText('Listening dashboard placeholder')).toBeInTheDocument();
    expect(screen.getByText('No scripts yet')).toBeInTheDocument();
    expect(screen.getByText('Not started')).toBeInTheDocument();
    expect(screen.getByText('Next step 1')).toBeInTheDocument();
  });
});
