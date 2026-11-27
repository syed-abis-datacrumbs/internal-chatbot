import { NextResponse } from 'next/server';
import { getDiscountRequests } from '@/lib/redis';
import { logError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const requests = await getDiscountRequests();
    return NextResponse.json({ requests });
  } catch (err) {
    logError('Failed to fetch discount requests', err, { route: '/api/discounts', method: 'GET', status: 500 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
