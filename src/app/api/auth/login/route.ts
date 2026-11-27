import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/logger';

async function makeToken(email: string, password: string): Promise<string> {
  const secret = process.env.DASHBOARD_SECRET || 'dc-dashboard-secret';
  const data   = new TextEncoder().encode(`${email}:${password}:${secret}`);
  const hash   = await crypto.subtle.digest('SHA-256', data);
  return Buffer.from(hash).toString('hex');
}

export async function POST(req: NextRequest) {
  try {
    let body: { email?: string; password?: string };
    try {
      body = await req.json();
    } catch (parseErr) {
      logError('Invalid JSON body in login request', parseErr, { route: '/api/auth/login', method: 'POST', status: 400 });
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const { email, password } = body;

    if (
      !email ||
      !password ||
      email    !== process.env.DASHBOARD_EMAIL ||
      password !== process.env.DASHBOARD_PASSWORD
    ) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await makeToken(email, password);
    const res   = NextResponse.json({ ok: true });
    res.cookies.set('dc_auth', token, {
      httpOnly : true,
      secure   : process.env.NODE_ENV === 'production',
      sameSite : 'strict',
      maxAge   : 60 * 60 * 24 * 7, // 7 days
      path     : '/',
    });
    return res;
  } catch (err) {
    logError('Login handler failed', err, { route: '/api/auth/login', method: 'POST', status: 500 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
