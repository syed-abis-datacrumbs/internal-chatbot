import { NextRequest, NextResponse } from 'next/server';
import { deleteMessagesByPhone } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ phone: string }> },
) {
  const { phone } = await params;
  const deleted = await deleteMessagesByPhone(phone);
  return NextResponse.json({ deleted });
}
