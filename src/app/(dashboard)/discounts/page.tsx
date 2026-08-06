import { getDiscountRequests } from '@/lib/redis';
import DiscountsUI from '@/components/dashboard/DiscountsUI';

export const dynamic = 'force-dynamic';

export default async function DiscountsPage() {
  const requests = await getDiscountRequests();
  return <DiscountsUI requests={requests} />;
}
