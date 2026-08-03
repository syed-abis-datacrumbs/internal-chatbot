import { NextResponse } from 'next/server';
import { getMessages } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  const messages = await getMessages();
  return NextResponse.json({ messages });
}
