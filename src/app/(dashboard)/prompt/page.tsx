import { getSystemPrompt } from '@/lib/redis';
import { CORE_SYSTEM_PROMPT } from '@/lib/knowledge';
import PromptUI from '@/components/dashboard/PromptUI';

export const dynamic = 'force-dynamic';

export default async function PromptPage() {
  const saved = await getSystemPrompt();
  return <PromptUI initialPrompt={saved ?? CORE_SYSTEM_PROMPT} />;
}
