import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export interface ChatMessage {
  from: string;
  text: string;
  reply: string;
  timestamp: number;
}

export async function saveMessage(msg: ChatMessage) {
  await redis.lpush('wa:messages', JSON.stringify(msg));
  await redis.ltrim('wa:messages', 0, 499); // keep last 500
}

export async function getMessages(): Promise<ChatMessage[]> {
  const raw = await redis.lrange('wa:messages', 0, -1);
  return raw.map(r => (typeof r === 'string' ? JSON.parse(r) : r) as ChatMessage);
}

const SYSTEM_PROMPT_KEY = 'dc:system_prompt';

export async function getSystemPrompt(): Promise<string | null> {
  const val = await redis.get<string>(SYSTEM_PROMPT_KEY);
  return val ?? null;
}

export async function saveSystemPrompt(prompt: string): Promise<void> {
  await redis.set(SYSTEM_PROMPT_KEY, prompt);
}
