import { NextRequest, NextResponse } from 'next/server';
import { getContactProfile, saveContactProfile } from '@/lib/redis';
import { logError } from '@/lib/logger';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ phone: string }> },
) {
  try {
    const { phone } = await params;
    const profile = await getContactProfile(decodeURIComponent(phone));
    return NextResponse.json({ disabled: profile?.botDisabled ?? false });
  } catch (err) {
    logError('Failed to fetch contact bot status', err, { route: '/api/contacts/[phone]/bot', method: 'GET', status: 500 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ phone: string }> },
) {
  try {
    const { phone } = await params;
    const decoded = decodeURIComponent(phone);
    const profile = await getContactProfile(decoded);
    const newState = !(profile?.botDisabled ?? false);
    await saveContactProfile({ phone: decoded, botDisabled: newState });
    return NextResponse.json({ disabled: newState });
  } catch (err) {
    logError('Failed to toggle contact bot status', err, { route: '/api/contacts/[phone]/bot', method: 'POST', status: 500 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
