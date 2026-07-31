import { NextRequest, NextResponse } from 'next/server';

async function makeToken(email: string, password: string): Promise<string> {
  const secret = process.env.DASHBOARD_SECRET || 'dc-dashboard-secret';
  const data   = new TextEncoder().encode(`${email}:${password}:${secret}`);
  const hash   = await crypto.subtle.digest('SHA-256', data);
  return Buffer.from(hash).toString('hex');
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (
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
}
