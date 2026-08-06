import { NextResponse } from 'next/server';
import { getDiscountRequests } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  const requests = await getDiscountRequests();
  return NextResponse.json({ requests });
}
