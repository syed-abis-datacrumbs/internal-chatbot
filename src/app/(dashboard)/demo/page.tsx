import { getDemoRequestsFromSheet } from '@/lib/google';
import DemoUI from '@/components/dashboard/DemoUI';

export const dynamic = 'force-dynamic';

export default async function DemoPage() {
  const requests = await getDemoRequestsFromSheet();
  return <DemoUI requests={requests} />;
}
