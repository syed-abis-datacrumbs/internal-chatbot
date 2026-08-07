import { getLeadsFromSheet } from '@/lib/google';
import LeadsUI from '@/components/dashboard/LeadsUI';

export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
  const leads = await getLeadsFromSheet();
  return <LeadsUI leads={leads} />;
}
