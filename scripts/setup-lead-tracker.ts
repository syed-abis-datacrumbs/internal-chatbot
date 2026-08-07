import fs from 'fs';
import path from 'path';

function loadEnvLocal() {
  const envPath = path.resolve(__dirname, '../.env.local');
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

// One-time setup for the atomic new-lead claim mechanism:
// 1. Creates a unique index on lead_sync_tracker.phone (required for claimNewLead's
//    findOneAndUpdate/$setOnInsert to be truly race-proof under concurrent writes)
// 2. Backfills it with every phone that has EVER messaged (wa_messages distinct 'from'),
//    so existing contacts aren't treated as "new" again and don't get duplicate lead rows
async function main() {
  loadEnvLocal();
  const { MongoClient } = await import('mongodb');
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  const db = client.db('datacrumbs_chatbot');

  await db.collection('lead_sync_tracker').createIndex({ phone: 1 }, { unique: true });
  console.log('Unique index on lead_sync_tracker.phone ensured.');

  const phones: string[] = await db.collection('wa_messages').distinct('from');
  console.log(`Found ${phones.length} phones with message history.`);

  const now = Date.now();
  const ops = phones.map(phone => ({
    updateOne: {
      filter: { phone },
      update: { $setOnInsert: { phone, firstSeenAt: now } },
      upsert: true,
    },
  }));

  if (ops.length) {
    const result = await db.collection('lead_sync_tracker').bulkWrite(ops, { ordered: false });
    console.log(`Backfilled ${result.upsertedCount} new tracker entries (${phones.length - result.upsertedCount} already existed).`);
  }

  await client.close();
  console.log('Done.');
}

main().catch(err => { console.error('Setup failed:', err); process.exit(1); });
