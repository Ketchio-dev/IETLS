import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AssessmentPlaceholderShell } from './assessment-placeholder-shell';

describe('AssessmentPlaceholderShell', () => {
  it('renders private reading import status when a summary is provided', () => {
    render(
      <AssessmentPlaceholderShell
        moduleId="reading"
        moduleLabel="IELTS Academic Reading Placeholder"
        statusLabel="Placeholder"
        summary="Reading placeholder summary"
        practiceTitle="Reading module placeholder"
        practiceDescription="Reading placeholder description"
        routeBase="/reading"
        plannedMilestones={['Milestone 1']}
        currentGuardrails={['Guardrail 1']}
        privateImportSummary={{
          sourceDir: 'data/private-reading-imports',
          importCommand: 'npm run reading:import-private',
          detectedSourceFiles: ['set-a.json'],
          compiledSourceFiles: ['set-a.json'],
          importedSetCount: 1,
          latestImportedAt: '2026-03-26T12:00:00.000Z',
          compiledOutputLabel: 'data/runtime/reading-private-imports.json',
          sets: [
            {
              id: 'set-a',
              title: 'Set A',
              sourceLabel: 'Owned notes',
              sourceFile: 'set-a.json',
              importedAt: '2026-03-26T12:00:00.000Z',
              questionCount: 6,
              passageWordCount: 820,
              types: ['multiple_choice', 'true_false_not_given'],
            },
          ],
          warnings: [],
        }}
      />,
    );

    expect(screen.getByText('Local reading bank status')).toBeInTheDocument();
    expect(screen.getByText('Imported sets')).toBeInTheDocument();
    expect(screen.getByText(/Source folder:/)).toBeInTheDocument();
    expect(screen.getByText(/Set A/)).toBeInTheDocument();
    expect(screen.getByText(/multiple_choice, true_false_not_given/)).toBeInTheDocument();
  });
});
