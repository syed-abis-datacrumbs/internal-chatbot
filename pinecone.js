const { Pinecone } = require('@pinecone-database/pinecone');

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

function getIndex() {
  return pinecone.index(process.env.PINECONE_INDEX);
}

// Upload chunks as text records — Pinecone handles embedding internally
async function upsertChunks(chunks) {
  const index = getIndex();
  const records = chunks.map(chunk => ({
    id: chunk.id,
    text: chunk.text,
    topic: chunk.topic
  }));
  await index.upsertRecords({ records });
  console.log(`Upserted ${records.length} records to Pinecone.`);
}

// Search using raw text — Pinecone embeds the query internally
async function searchChunks(query, topK = 3) {
  const index = getIndex();
  const results = await index.searchRecords({
    query: {
      inputs: { text: query },
      topK
    },
    fields: ['text', 'topic']
  });
  return results.result.hits.map(h => h.fields.text);
}

// Check if Pinecone index already has records
async function hasVectors() {
  const index = getIndex();
  const stats = await index.describeIndexStats();
  return (stats.totalRecordCount ?? 0) > 0;
}

// Delete all records (used when re-indexing after content update)
async function clearIndex() {
  const index = getIndex();
  await index.deleteAll();
  console.log('Pinecone index cleared.');
}

module.exports = { upsertChunks, searchChunks, hasVectors, clearIndex };
