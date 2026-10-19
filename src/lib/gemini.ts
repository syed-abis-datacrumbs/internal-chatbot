import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildInternshipSystemPrompt } from './dynamicKnowledge';
import { getSystemPrompt } from './redis';

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
  let systemInstruction: string;
  try {
    // 1. Check if admin saved a custom prompt in the Admin Panel (stored in MongoDB)
    const savedPrompt = await getSystemPrompt();

    if (savedPrompt && savedPrompt.trim()) {
      // Admin custom prompt has 100% priority and pure control
      systemInstruction = savedPrompt.trim();
    } else if (systemPromptOverride && systemPromptOverride.trim()) {
      systemInstruction = await buildInternshipSystemPrompt(userMessage, systemPromptOverride);
    } else {
      systemInstruction = await buildInternshipSystemPrompt(userMessage);
    }
  } catch (err) {
    console.warn('[gemini] Failed to build prompt:', err);
    systemInstruction = systemPromptOverride || `You are the official DataCrumbs Assistant.`;
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction,
  });

  const safeHistory = [...history];
  while (safeHistory.length > 0 && safeHistory[0].role !== 'user') {
    safeHistory.shift();
  }

  const tryReply = async (hist: HistoryMessage[]): Promise<string | null> => {
    try {
      const chat   = model.startChat({ history: hist });
      const result = await chat.sendMessage(userMessage);
      try {
        return result.response.text();
      } catch {
        console.warn('[gemini] blocked:', result.response.candidates?.[0]?.finishReason);
        return null;
      }
    } catch (err) {
      console.error('[gemini] API call failed:', err instanceof Error ? err.message : err);
      return null;
    }
  };

  // First attempt with full history
  const first = await tryReply(safeHistory);
  if (first !== null) return first;

  // Retry with last 2 exchanges only if blocked
  console.warn('[gemini] retrying with trimmed history after block');
  const trimmed = safeHistory.slice(-4);
  while (trimmed.length > 0 && trimmed[0].role !== 'user') trimmed.shift();
  const second = await tryReply(trimmed);
  if (second !== null) return second;

  // Safe fallback if blocked or error
  console.error('[gemini] both attempts failed, returning fallback');
  return `I'm sorry, I wasn't able to process that right now. Please rephrase your question or check out our complete 11 tracks and 20 capstone projects at *https://internship.datacrumbs.org*! 🚀`;
}
