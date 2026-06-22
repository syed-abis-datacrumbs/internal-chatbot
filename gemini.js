const { GoogleGenerativeAI } = require('@google/generative-ai');
const { CORE_SYSTEM_PROMPT } = require('./knowledge');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function getAIReply(userMessage, history, context) {
  // Inject only the retrieved relevant chunks — not the full knowledge base
  const systemWithContext = `${CORE_SYSTEM_PROMPT}\n\n## RELEVANT KNOWLEDGE\n${context}`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemWithContext,
  });

  // Gemini requires history to start with 'user' — drop any leading model messages
  let safeHistory = [...history];
  while (safeHistory.length > 0 && safeHistory[0].role !== 'user') {
    safeHistory.shift();
  }

  const chat = model.startChat({ history: safeHistory });
  const result = await chat.sendMessage(userMessage);
  return result.response.text();
}

module.exports = { getAIReply };
