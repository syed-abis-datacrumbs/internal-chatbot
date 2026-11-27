import { NextRequest, NextResponse } from 'next/server';
import { deleteMessagesByPhone } from '@/lib/redis';
import { logError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ phone: string }> },
) {
  try {
    const { phone } = await params;
    const deleted = await deleteMessagesByPhone(phone);
    return NextResponse.json({ deleted });
  } catch (err) {
    logError('Failed to delete messages for contact', err, { route: '/api/messages/[phone]', method: 'DELETE', status: 500 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
