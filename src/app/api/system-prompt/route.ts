import { NextRequest, NextResponse } from 'next/server';
import { getSystemPrompt, saveSystemPrompt, resetSystemPrompt } from '@/lib/redis';
import { buildInternshipBasePrompt } from '@/lib/dynamicKnowledge';

export async function GET() {
  const saved = await getSystemPrompt();
  const defaultPrompt = await buildInternshipBasePrompt();
  return NextResponse.json({
    prompt: saved ?? defaultPrompt,
    isCustom: !!saved,
    defaultPrompt,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.reset) {
      await resetSystemPrompt();
      const defaultPrompt = await buildInternshipBasePrompt();
      return NextResponse.json({ ok: true, prompt: defaultPrompt, isCustom: false });
    }
    const { prompt } = body;
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 });
    }
    await saveSystemPrompt(prompt.trim());
    return NextResponse.json({ ok: true, isCustom: true });
  } catch (err) {
    console.error('[system-prompt] error:', err);
    return NextResponse.json({ error: 'Failed to save prompt' }, { status: 500 });
  }
}

export async function DELETE() {
  await resetSystemPrompt();
  const defaultPrompt = await buildInternshipBasePrompt();
  return NextResponse.json({ ok: true, prompt: defaultPrompt, isCustom: false });
}
