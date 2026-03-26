import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AssessmentPlaceholderDashboard } from './assessment-placeholder-dashboard';

describe('AssessmentPlaceholderDashboard', () => {
  it('renders private import warnings and inventory details when provided', () => {
    render(
      <AssessmentPlaceholderDashboard
        moduleId="reading"
        moduleLabel="IELTS Academic Reading Placeholder"
        statusLabel="Placeholder"
        summary="Reading placeholder summary"
        dashboardTitle="Reading dashboard placeholder"
        dashboardDescription="Reading dashboard description"
        routeBase="/reading"
        statusCards={[{ label: 'Content', value: 'Not started', detail: 'No bank yet' }]}
        nextSteps={['Next step 1']}
        privateImportSummary={{
          sourceDir: 'data/private-reading-imports',
          importCommand: 'npm run reading:import-private',
          detectedSourceFiles: ['set-a.json', 'set-b.json'],
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
              types: ['multiple_choice'],
            },
          ],
          warnings: ['Detected source files and compiled source files differ. Re-run the import command after editing your local bank files.'],
        }}
      />,
    );

    expect(screen.getByText('Local bank inventory')).toBeInTheDocument();
    expect(screen.getByText(/Imported sets: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Detected source files: 2/)).toBeInTheDocument();
    expect(screen.getByText(/Set A/)).toBeInTheDocument();
    expect(screen.getByText(/Re-run the import command/)).toBeInTheDocument();
  });
});
