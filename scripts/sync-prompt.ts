import fs from 'fs';
import dns from 'dns';
import { MongoClient } from 'mongodb';

// Ensure SRV records resolve cleanly on local networks
dns.setServers(['8.8.8.8', '1.1.1.1']);

async function main() {
  const prompt = fs.readFileSync('system_prompt.md', 'utf8').trim();
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing from environment');

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME || 'datacrumbs_chatbot');

  // Sync to settings collection (read by getSystemPrompt in redis.ts)
  await db.collection('settings').updateOne(
    { key: 'system_prompt' },
    { $set: { value: prompt, updatedAt: Date.now() } },
    { upsert: true }
  );

  // Sync to bot_config collection for backwards compatibility
  await db.collection('bot_config').updateOne(
    { _id: 'system_prompt' as any },
    { $set: { value: prompt, updatedAt: Date.now() } },
    { upsert: true }
  );

  console.log('SYNC_COMPLETE_SUCCESS');
  await client.close();
}

main().catch(err => {
  console.error('SYNC_ERROR:', err);
  process.exit(1);
});
