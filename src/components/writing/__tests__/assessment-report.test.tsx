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

    expect(screen.getByText(/assessment report/i, { selector: '.eyebrow' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /estimated ielts band/i })).toBeInTheDocument();
    expect(screen.getByText(/based on rubric signals and saved practice history/i)).toBeInTheDocument();
    expect(screen.getByText(/a ±0\.5 range is typical/i)).toBeInTheDocument();
    expect(screen.getByText(/reliable estimate|estimate may shift|rough estimate/i)).toBeInTheDocument();
    expect(screen.queryByText(/^overall band$/i)).not.toBeInTheDocument();
    expect(screen.getByText(/your strongest area/i)).toBeInTheDocument();
    expect(screen.getByText(/what held your score back/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /highest-priority revision/i })).toBeInTheDocument();
    expect(screen.queryByText(/criterion signal:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/scorer notes/i)).not.toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(/practice estimate — not an official ielts score/i);
    expect(screen.getByRole('link', { name: /continue to reading practice/i })).toBeInTheDocument();
  });

  it('shows direct-provider wording when OpenRouter calibration is disabled', () => {
    render(
      createElement(AssessmentReportPanel, {
        report: buildReportWithNotes([
          'OpenRouter overall-band calibration was explicitly disabled for this run.',
        ]),
      }),
    );

    expect(screen.getByText(/assessment report/i, { selector: '.eyebrow' })).toBeInTheDocument();
    expect(screen.getByText(/rough estimate|estimate may shift|reliable estimate/i)).toBeInTheDocument();
    expect(screen.getByText(/ai-assisted practice estimate, not an official ielts result/i)).toBeInTheDocument();
    expect(screen.getByText(/overall estimate mode: unadjusted estimate/i)).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(/guide study, not to predict your result/i);
  });
});
