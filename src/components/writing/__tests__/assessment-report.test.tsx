import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { sampleAssessmentReport } from '@/lib/fixtures/writing';

import { AssessmentReportPanel } from '../assessment-report';

function buildReportWithNotes(notes: string[]) {
  return {
    ...sampleAssessmentReport,
    evaluationTrace: {
      ...sampleAssessmentReport.evaluationTrace,
      notes,
    },
  };
}

describe('AssessmentReportPanel', () => {
  it('labels calibrated overall estimates separately from direct criterion bands', () => {
    render(
      createElement(AssessmentReportPanel, {
        report: buildReportWithNotes([
          'Applied openrouter overall-band calibration for task-2 using kaggle benchmark.',
          'Raw OpenRouter overall band before calibration: 6.0.',
        ]),
      }),
    );

    expect(screen.getByText(/calibrated overall estimate/i)).toBeInTheDocument();
    expect(screen.getByText(/^overall estimate$/i)).toBeInTheDocument();
    expect(screen.getByText(/^calibrated$/i)).toBeInTheDocument();
    expect(
      screen.getByText(/overall band is calibrated against public overall labels/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/criterion bands below remain direct scorer outputs/i)).toBeInTheDocument();
  });

  it('shows direct-provider wording when OpenRouter calibration is disabled', () => {
    render(
      createElement(AssessmentReportPanel, {
        report: buildReportWithNotes([
          'OpenRouter overall-band calibration was explicitly disabled for this run.',
        ]),
      }),
    );

    expect(screen.getByText(/practice estimate/i, { selector: '.eyebrow' })).toBeInTheDocument();
    expect(screen.getByText(/direct provider output/i, { selector: 'span' })).toBeInTheDocument();
    expect(
      screen.getByText(/overall band remains the direct provider output/i),
    ).toBeInTheDocument();
  });
});
