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

  const modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction,
  });

  // Filter out any previous fallback error messages so they don't poison history
  const cleanHistory = history.filter(h => {
    if (h.role === 'model') {
      const text = h.parts?.[0]?.text ?? '';
      return !text.startsWith("I'm sorry, I wasn't able to process");
    }
    return true;
  });

  const safeHistory = [...cleanHistory];
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

  // Try Gemini 1.5 Flash fallback
  if (modelName !== 'gemini-1.5-flash') {
    console.warn('[gemini] trying fallback model: gemini-1.5-flash');
    try {
      const fallbackGemini = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction,
      });
      const chat = fallbackGemini.startChat({ history: trimmed.length > 0 ? trimmed : safeHistory });
      const res = await chat.sendMessage(userMessage);
      const text = res.response.text();
      if (text) return text;
    } catch (e: any) {
      console.warn('[gemini:gemini-1.5-flash] fallback failed:', e?.message || e);
    }
  }

  // Fallback to OpenAI (gpt-6-luna)
  const openaiReply = await getOpenAIReply(userMessage, safeHistory, systemInstruction);
  if (openaiReply !== null) {
    console.info('[gemini] answered via OpenAI fallback');
    return openaiReply;
  }

  // Safe fallback if blocked or error across all providers
  console.error('[gemini] all Gemini and OpenAI attempts failed, returning fallback');
  return `I'm sorry, I wasn't able to process that right now. Please rephrase your question or check out our complete 11 tracks and 20 capstone projects at *https://internship.datacrumbs.org*! 🚀`;
}

async function getOpenAIReply(
  userMessage: string,
  history: HistoryMessage[],
  systemInstruction: string
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || 'gpt-6-luna';
  const messages = [
    { role: 'system', content: systemInstruction },
    ...history.map(h => ({
      role: h.role === 'model' ? ('assistant' as const) : ('user' as const),
      content: h.parts?.[0]?.text ?? '',
    })),
    { role: 'user', content: userMessage },
  ];

  const tryCall = async (targetModel: string): Promise<string | null> => {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: targetModel,
          messages,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[openai-fallback:${targetModel}] HTTP ${response.status}:`, errText);
        return null;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      return content || null;
    } catch (err: any) {
      console.warn(`[openai-fallback:${targetModel}] error:`, err?.message || err);
      return null;
    }
  };

  console.info(`[openai] attempting fallback with model: ${model}`);
  const reply = await tryCall(model);
  if (reply !== null) return reply;

  if (model !== 'gpt-4o-mini') {
    console.warn('[openai] trying secondary fallback model: gpt-4o-mini');
    const fallbackReply = await tryCall('gpt-4o-mini');
    if (fallbackReply !== null) return fallbackReply;
  }

  return null;
}
