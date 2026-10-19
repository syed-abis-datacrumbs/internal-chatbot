import { getSystemPrompt } from '@/lib/redis';
import { buildInternshipBasePrompt } from '@/lib/dynamicKnowledge';
import PromptUI from '@/components/dashboard/PromptUI';

export const dynamic = 'force-dynamic';

export default async function PromptPage() {
  const saved = await getSystemPrompt();
  const defaultPrompt = await buildInternshipBasePrompt();
  return (
    <PromptUI
      initialPrompt={saved ?? defaultPrompt}
      defaultPrompt={defaultPrompt}
      isInitiallyCustom={!!saved}
    />
  );
}
