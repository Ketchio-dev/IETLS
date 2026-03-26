import { WritingPracticeShell } from '@/components/writing/writing-practice-shell';
import { sampleAssessmentReport, samplePrompt } from '@/lib/fixtures/writing';

export default function HomePage() {
  return <WritingPracticeShell initialReport={sampleAssessmentReport} prompt={samplePrompt} />;
}
