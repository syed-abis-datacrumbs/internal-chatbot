import { searchChunks } from './pinecone';

export async function retrieveContext(question: string): Promise<string> {
  const chunks = await searchChunks(question, 3);
  return chunks.join('\n\n---\n\n');
}
