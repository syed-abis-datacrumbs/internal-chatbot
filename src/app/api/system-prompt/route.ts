import { NextRequest, NextResponse } from 'next/server';
import { getSystemPrompt, saveSystemPrompt } from '@/lib/redis';
import { CORE_SYSTEM_PROMPT } from '@/lib/knowledge';

export async function GET() {
  const saved = await getSystemPrompt();
  return NextResponse.json({ prompt: saved ?? CORE_SYSTEM_PROMPT });
}

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();
  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 });
  }
  await saveSystemPrompt(prompt.trim());
  return NextResponse.json({ ok: true });
}
