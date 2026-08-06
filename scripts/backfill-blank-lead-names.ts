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

// One-time reconciliation: for every "agent leads" row still showing a blank
// Name, look up that phone in contact_profiles / enrollment_sessions (the same
// sources getLeads() uses) and backfill the sheet if a name is now known.
async function main() {
  loadEnvLocal();
  const { google } = await import('googleapis');
  const { MongoClient } = await import('mongodb');
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  const db = client.db('datacrumbs_chatbot');

  const SHEET_ID  = process.env.GOOGLE_SHEET_ID!;
  const LEADS_TAB = process.env.GOOGLE_SHEET_TAB_LEADS ?? 'agent leads';

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${LEADS_TAB}!A:D`,
  });
  const rows = res.data.values ?? [];

  const blankRows: { rowNumber: number; phone: string }[] = [];
  for (let i = 1; i < rows.length; i++) {
    const [name, phone] = rows[i];
    if (!name && phone) {
      blankRows.push({ rowNumber: i + 1, phone: String(phone).replace(/^\+/, '') });
    }
  }
  console.log(`${blankRows.length} row(s) with a blank name.`);
  if (!blankRows.length) { await client.close(); return; }

  const phones = blankRows.map(r => r.phone);
  const [profiles, enrollments] = await Promise.all([
    db.collection('contact_profiles').find({ phone: { $in: phones } }).toArray(),
    db.collection('enrollment_sessions').find({ phone: { $in: phones } }).toArray(),
  ]);

  const nameMap = new Map<string, string>();
  for (const e of enrollments) if (e.name) nameMap.set(e.phone as string, e.name as string);
  for (const p of profiles)    if (p.name) nameMap.set(p.phone as string, p.name as string);

  const updates: { range: string; values: string[][] }[] = [];
  for (const { rowNumber, phone } of blankRows) {
    const name = nameMap.get(phone);
    if (name) {
      updates.push({ range: `${LEADS_TAB}!A${rowNumber}`, values: [[name]] });
      console.log(`  row ${rowNumber}: +${phone} -> "${name}"`);
    }
  }

  console.log(`${updates.length} row(s) can be backfilled.`);
  if (updates.length) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { valueInputOption: 'USER_ENTERED', data: updates },
    });
    console.log('Backfilled.');
  }

  await client.close();
}

main().catch(err => { console.error('Backfill failed:', err); process.exit(1); });
