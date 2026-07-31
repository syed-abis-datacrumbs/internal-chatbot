import { getBotConfig, getBrochure } from '@/lib/redis';
import ConfigUI from '@/components/dashboard/ConfigUI';

export const dynamic = 'force-dynamic';

export default async function ConfigPage() {
  const [config, brochure] = await Promise.all([getBotConfig(), getBrochure()]);
  return (
    <ConfigUI
      initial={config}
      currentBrochure={brochure ? { filename: brochure.filename, uploadedAt: brochure.uploadedAt } : null}
    />
  );
}
