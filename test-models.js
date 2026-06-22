require('dotenv').config();
const axios = require('axios');

const apiKey = (process.env.GEMINI_API_KEY || '').replace(/^['"]|['"]$/g, '');

console.log('API Key starts with:', apiKey.substring(0, 10) + '...');

async function listEmbeddingModels() {
  const response = await axios.get(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );
  const models = response.data.models || [];
  const embeddingModels = models.filter(m =>
    m.supportedGenerationMethods?.includes('embedContent')
  );

  console.log('\nAvailable embedding models:');
  if (embeddingModels.length === 0) {
    console.log('NONE — no embedding models found for this API key');
  } else {
    embeddingModels.forEach(m => console.log(' -', m.name, '| version:', m.version));
  }
}

listEmbeddingModels().catch(e => {
  console.error('Error:', e.response?.data || e.message);
});
