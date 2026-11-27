import { NextResponse } from 'next/server';
import { getMessages, deleteAllMessages } from '@/lib/redis';
import { logError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const messages = await getMessages();
    return NextResponse.json({ messages });
  } catch (err) {
    logError('Failed to fetch messages', err, { route: '/api/messages', method: 'GET', status: 500 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const deleted = await deleteAllMessages();
    return NextResponse.json({ deleted });
  } catch (err) {
    logError('Failed to delete all messages', err, { route: '/api/messages', method: 'DELETE', status: 500 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
