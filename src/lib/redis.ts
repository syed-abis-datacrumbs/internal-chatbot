import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI!;

// Reuse connection across hot-reloads in dev
declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
}

async function getDb(): Promise<Db> {
  if (!global._mongoClient) {
    global._mongoClient = new MongoClient(uri);
    await global._mongoClient.connect();
  }
  return global._mongoClient.db('datacrumbs_chatbot');
}

export interface ChatMessage {
  from: string;
  text: string;
  reply: string;
  timestamp: number;
}

export async function saveMessage(msg: ChatMessage): Promise<void> {
  const db = await getDb();
  await db.collection('wa_messages').insertOne(msg);
}

export async function getMessages(): Promise<ChatMessage[]> {
  const db = await getDb();
  const docs = await db
    .collection<ChatMessage>('wa_messages')
    .find({})
    .sort({ timestamp: -1 })
    .limit(500)
    .toArray();
  return docs.map(({ _id, ...rest }) => rest as ChatMessage);
}

export async function getSystemPrompt(): Promise<string | null> {
  const db  = await getDb();
  const doc = await db.collection('settings').findOne({ key: 'system_prompt' });
  return (doc?.value as string) ?? null;
}

export async function saveSystemPrompt(prompt: string): Promise<void> {
  const db = await getDb();
  await db.collection('settings').updateOne(
    { key: 'system_prompt' },
    { $set: { value: prompt } },
    { upsert: true }
  );
}
