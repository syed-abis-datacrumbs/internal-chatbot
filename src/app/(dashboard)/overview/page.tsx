import { getStats } from '@/lib/redis';
import OverviewDashboardClient from '@/components/dashboard/OverviewDashboardClient';

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  const stats = await getStats();
  return <OverviewDashboardClient stats={stats} />;
}
