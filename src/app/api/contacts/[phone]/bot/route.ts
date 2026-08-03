import { NextRequest, NextResponse } from 'next/server';
import { getContactProfile, saveContactProfile } from '@/lib/redis';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ phone: string }> },
) {
  const { phone } = await params;
  const profile = await getContactProfile(decodeURIComponent(phone));
  return NextResponse.json({ disabled: profile?.botDisabled ?? false });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ phone: string }> },
) {
  const { phone } = await params;
  const decoded = decodeURIComponent(phone);
  const profile = await getContactProfile(decoded);
  const newState = !(profile?.botDisabled ?? false);
  await saveContactProfile({ phone: decoded, botDisabled: newState });
  return NextResponse.json({ disabled: newState });
}
