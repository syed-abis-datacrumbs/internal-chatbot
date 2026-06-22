const { upsertChunks, searchChunks, hasVectors } = require('./pinecone');
const { KNOWLEDGE_CHUNKS } = require('./knowledge');

// Run once on server startup — uploads chunks if Pinecone is empty
async function initRAG() {
  console.log('Checking Pinecone index...');
  const alreadyLoaded = await hasVectors();

  if (alreadyLoaded) {
    console.log('Pinecone already has records. Skipping upload.');
    return;
  }

  console.log(`Uploading ${KNOWLEDGE_CHUNKS.length} knowledge chunks to Pinecone...`);
  await upsertChunks(KNOWLEDGE_CHUNKS);
  console.log('RAG ready.');
}

// Called on every user message — returns the most relevant context as text
async function retrieveContext(question) {
  const relevantChunks = await searchChunks(question, 3);
  return relevantChunks.join('\n\n---\n\n');
}

module.exports = { initRAG, retrieveContext };
