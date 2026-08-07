import { getDemoRequests } from '@/lib/redis';
import DemoUI from '@/components/dashboard/DemoUI';

export const dynamic = 'force-dynamic';

export default async function DemoPage() {
  const requests = await getDemoRequests();
  return <DemoUI requests={requests} />;
}
