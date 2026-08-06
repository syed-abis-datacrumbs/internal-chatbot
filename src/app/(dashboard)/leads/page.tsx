import { getLeads } from '@/lib/redis';
import LeadsUI from '@/components/dashboard/LeadsUI';

export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
  const leads = await getLeads();
  return <LeadsUI leads={leads} />;
}
