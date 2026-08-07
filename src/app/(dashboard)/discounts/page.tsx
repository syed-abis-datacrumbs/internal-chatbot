import { getDiscountRequestsFromSheet } from '@/lib/google';
import DiscountsUI from '@/components/dashboard/DiscountsUI';

export const dynamic = 'force-dynamic';

export default async function DiscountsPage() {
  const requests = await getDiscountRequestsFromSheet();
  return <DiscountsUI requests={requests} />;
}
