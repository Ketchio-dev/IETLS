import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AssessmentPlaceholderShell } from './assessment-placeholder-shell';

describe('AssessmentPlaceholderShell', () => {
  it('renders placeholder shell with module label, guardrails, and milestones', () => {
    render(
      <AssessmentPlaceholderShell
        moduleId="listening"
        moduleLabel="IELTS Academic Listening Placeholder"
        statusLabel="Placeholder"
        summary="Listening placeholder summary"
        practiceTitle="Listening module placeholder"
        practiceDescription="Listening placeholder description"
        routeBase="/listening"
        plannedMilestones={['Milestone 1', 'Milestone 2']}
        currentGuardrails={['Guardrail 1']}
      />,
    );

    expect(screen.getByText('IELTS Academic Listening Placeholder')).toBeInTheDocument();
    expect(screen.getByText('Listening module placeholder')).toBeInTheDocument();
    expect(screen.getByText('Guardrail 1')).toBeInTheDocument();
    expect(screen.getByText('Milestone 1')).toBeInTheDocument();
    expect(screen.getByText('Milestone 2')).toBeInTheDocument();
  });
});
