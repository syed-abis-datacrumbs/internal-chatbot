import { NextResponse } from 'next/server';
import { getDemoRequests } from '@/lib/redis';
import { logError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const requests = await getDemoRequests();
    return NextResponse.json({ requests });
  } catch (err) {
    logError('Failed to fetch demo requests', err, { route: '/api/demo', method: 'GET', status: 500 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
