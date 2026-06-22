const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function embedText(text) {
  const response = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: text,
  });
  return response.embeddings[0].values;
}

// Embed multiple texts one by one with a small delay to avoid rate limits
async function embedBatch(texts) {
  const embeddings = [];
  for (const text of texts) {
    const vector = await embedText(text);
    embeddings.push(vector);
    await new Promise(r => setTimeout(r, 200));
  }
  return embeddings;
}

module.exports = { embedText, embedBatch };
