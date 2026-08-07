import { NextResponse } from 'next/server';
import { getDemoRequests } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  const requests = await getDemoRequests();
  return NextResponse.json({ requests });
}
