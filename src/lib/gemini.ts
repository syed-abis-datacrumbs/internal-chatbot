import { GoogleGenerativeAI } from '@google/generative-ai';
import { CORE_SYSTEM_PROMPT } from './knowledge';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface HistoryMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export async function getAIReply(
  userMessage: string,
  history: HistoryMessage[],
  systemPromptOverride?: string | null
): Promise<string> {
  const systemInstruction = systemPromptOverride ?? CORE_SYSTEM_PROMPT;

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction,
  });

  const safeHistory = [...history];
  while (safeHistory.length > 0 && safeHistory[0].role !== 'user') {
    safeHistory.shift();
  }

  const tryReply = async (hist: HistoryMessage[]): Promise<string | null> => {
    const chat   = model.startChat({ history: hist });
    const result = await chat.sendMessage(userMessage);
    try {
      return result.response.text();
    } catch {
      console.warn('[gemini] blocked:', result.response.candidates?.[0]?.finishReason);
      return null;
    }
  };

  // First attempt with full history
  const first = await tryReply(safeHistory);
  if (first !== null) return first;

  // RECITATION — retry with last 2 exchanges only (shorter context reduces exact-match risk)
  console.warn('[gemini] retrying with trimmed history after block');
  const trimmed = safeHistory.slice(-4); // last 2 user+model pairs
  while (trimmed.length > 0 && trimmed[0].role !== 'user') trimmed.shift();
  const second = await tryReply(trimmed);
  if (second !== null) return second;

  // Both attempts blocked — return a safe fallback
  console.error('[gemini] both attempts blocked, returning fallback');
  return `I'm sorry, I wasn't able to process that right now. Please rephrase your question, or reach our team directly at *+92 329 2020497*.`;
}
