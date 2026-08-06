import { NextResponse } from 'next/server';
import { getMessages, deleteAllMessages } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  const messages = await getMessages();
  return NextResponse.json({ messages });
}

export async function DELETE() {
  const deleted = await deleteAllMessages();
  return NextResponse.json({ deleted });
}
