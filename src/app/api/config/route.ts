import { NextRequest, NextResponse } from 'next/server';
import { getBotConfig, saveBotConfig, BotConfig } from '@/lib/redis';

export async function GET() {
  const config = await getBotConfig();
  return NextResponse.json(config);
}

export async function POST(req: NextRequest) {
  const body = await req.json() as BotConfig;
  await saveBotConfig(body);
  return NextResponse.json({ ok: true });
}
