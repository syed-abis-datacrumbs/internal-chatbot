import { getMessages, getSystemPrompt, ChatMessage } from '@/lib/redis';
import { CORE_SYSTEM_PROMPT } from '@/lib/knowledge';
import DashboardUI from '@/components/DashboardUI';

export const dynamic = 'force-dynamic';

function groupByPhone(messages: ChatMessage[]) {
  const map = new Map<string, ChatMessage[]>();
  for (const msg of messages) {
    if (!map.has(msg.from)) map.set(msg.from, []);
    map.get(msg.from)!.push(msg);
  }
  return Array.from(map.entries())
    .map(([phone, msgs]) => ({
      phone,
      messages: msgs.sort((a, b) => b.timestamp - a.timestamp),
      lastMessage: msgs.reduce((l, m) => m.timestamp > l.timestamp ? m : l),
    }))
    .sort((a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp);
}

export default async function Dashboard() {
  const [messages, savedPrompt] = await Promise.all([getMessages(), getSystemPrompt()]);
  const contacts = groupByPhone(messages);
  const systemPrompt = savedPrompt ?? CORE_SYSTEM_PROMPT;

  return <DashboardUI contacts={contacts} total={messages.length} systemPrompt={systemPrompt} />;
}
