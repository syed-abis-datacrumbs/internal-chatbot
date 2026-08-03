import { NextResponse } from 'next/server';
import { getAllEnrollments } from '@/lib/redis';

export async function GET() {
  const enrollments = await getAllEnrollments();
  return NextResponse.json({ enrollments });
}
