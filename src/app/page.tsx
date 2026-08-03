import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

async function expectedToken(): Promise<string> {
  const email  = process.env.DASHBOARD_EMAIL    || '';
  const pass   = process.env.DASHBOARD_PASSWORD || '';
  const secret = process.env.DASHBOARD_SECRET   || 'dc-dashboard-secret';
  const data   = new TextEncoder().encode(`${email}:${pass}:${secret}`);
  const hash   = await crypto.subtle.digest('SHA-256', data);
  return Buffer.from(hash).toString('hex');
}

export default async function RootPage() {
  const cookieStore = await cookies();
  const token    = cookieStore.get('dc_auth')?.value ?? '';
  const expected = await expectedToken();

  if (token === expected) {
    redirect('/overview');
  } else {
    redirect('/login');
  }
}
