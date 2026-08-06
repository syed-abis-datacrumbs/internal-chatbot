import fs from 'fs';
import path from 'path';

function loadEnvLocal() {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) return;
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

async function main() {
  loadEnvLocal();
  const { getLeads } = await import('../src/lib/redis');
  const { appendLeadRows } = await import('../src/lib/google');

  const leads = await getLeads();
  console.log(`Found ${leads.length} existing leads. Appending to the "agent leads" sheet tab...`);

  await appendLeadRows(leads.map(l => ({
    name: l.name ?? null,
    phone: l.phone,
    timestamp: l.firstContact,
  })));

  console.log('Done.');
  process.exit(0);
}

main().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
