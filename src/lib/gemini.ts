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
  context: string,
  systemPromptOverride?: string | null
): Promise<string> {
  const base = systemPromptOverride ?? CORE_SYSTEM_PROMPT;
  const systemWithContext = `${base}\n\n## RELEVANT KNOWLEDGE\n${context}`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemWithContext,
  });

  // Gemini requires history to start with 'user'
  const safeHistory = [...history];
  while (safeHistory.length > 0 && safeHistory[0].role !== 'user') {
    safeHistory.shift();
  }

  const chat = model.startChat({ history: safeHistory });
  const result = await chat.sendMessage(userMessage);
  return result.response.text();
}
