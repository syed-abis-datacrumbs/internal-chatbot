import { NextResponse } from 'next/server';
import { logError } from '@/lib/logger';

export async function POST() {
  try {
    const res = NextResponse.json({ ok: true });
    res.cookies.set('dc_auth', '', { maxAge: 0, path: '/' });
    return res;
  } catch (err) {
    logError('Logout handler failed', err, { route: '/api/auth/logout', method: 'POST', status: 500 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
