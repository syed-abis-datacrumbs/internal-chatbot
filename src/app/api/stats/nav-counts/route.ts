import { NextResponse } from 'next/server';
import { getNavCounts } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  const counts = await getNavCounts();
  return NextResponse.json(counts);
}
