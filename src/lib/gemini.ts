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

  const chat = model.startChat({ history: safeHistory });
  const result = await chat.sendMessage(userMessage);
  return result.response.text();
}
