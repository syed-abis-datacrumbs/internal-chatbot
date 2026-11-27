import { NextRequest, NextResponse } from 'next/server';
import { getBotConfig, saveBotConfig, BotConfig } from '@/lib/redis';
import { logError } from '@/lib/logger';

export async function GET() {
  try {
    const config = await getBotConfig();
    return NextResponse.json(config);
  } catch (err) {
    logError('Failed to load bot config', err, { route: '/api/config', method: 'GET', status: 500 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as BotConfig;
    await saveBotConfig(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError('Failed to save bot config', err, { route: '/api/config', method: 'POST', status: 500 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
