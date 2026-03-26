import { NextResponse } from 'next/server';

import { samplePrompt, writingPromptBank } from '@/lib/fixtures/writing';

export async function GET() {
  return NextResponse.json({ prompt: samplePrompt, prompts: writingPromptBank });
}
