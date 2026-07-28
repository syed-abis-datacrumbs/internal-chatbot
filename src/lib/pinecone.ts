import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

function getIndex() {
  return pinecone.index(process.env.PINECONE_INDEX!);
}

export async function searchChunks(query: string, topK = 3): Promise<string[]> {
  const index = getIndex();
  const results = await index.searchRecords({
    query: { inputs: { text: query }, topK },
    fields: ['text', 'topic'],
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (results as any).result.hits.map((h: any) => h.fields.text as string);
}
