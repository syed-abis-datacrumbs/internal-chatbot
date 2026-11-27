import { NextResponse } from 'next/server';
import { getNavCounts } from '@/lib/redis';
import { getSheetNavCounts } from '@/lib/google';
import { logError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Chats reflects MongoDB directly; Leads/Enrollments reflect the Sheet
    // (the reviewed, editable source of truth for those two).
    const [mongoCounts, sheetCounts] = await Promise.all([
      getNavCounts(),
      getSheetNavCounts(),
    ]);
    return NextResponse.json({
      chats: mongoCounts.chats,
      leads: sheetCounts.leads,
      enrollments: sheetCounts.enrollments,
    });
  } catch (err) {
    logError('Failed to fetch nav counts', err, { route: '/api/stats/nav-counts', method: 'GET', status: 500 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
