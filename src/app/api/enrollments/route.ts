import { NextResponse } from 'next/server';
import { getEnrollmentsFromSheet } from '@/lib/google';
import { logError } from '@/lib/logger';

export async function GET() {
  try {
    const enrollments = await getEnrollmentsFromSheet();
    return NextResponse.json({ enrollments });
  } catch (err) {
    logError('Failed to fetch enrollments from sheet', err, { route: '/api/enrollments', method: 'GET', provider: 'google-sheets', status: 500 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
