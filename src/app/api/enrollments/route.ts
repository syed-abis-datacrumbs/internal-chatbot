import { NextResponse } from 'next/server';
import { getEnrollmentsFromSheet } from '@/lib/google';

export async function GET() {
  const enrollments = await getEnrollmentsFromSheet();
  return NextResponse.json({ enrollments });
}
