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

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

// Parses the exact "DD-Mon-YYYY" / "H:MM AM/PM" format formatLeadRow() writes,
// interpreted as Asia/Karachi wall-clock time, returned as a UTC epoch ms.
function parseSheetDateTime(dateStr: string, timeStr: string): number | null {
  const dm = dateStr.match(/(\d{1,2})-(\w{3})-(\d{4})/);
  const tm = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!dm || !tm) return null;
  const day = parseInt(dm[1], 10);
  const month = MONTHS[dm[2]];
  const year = parseInt(dm[3], 10);
  if (month === undefined) return null;
  let hour = parseInt(tm[1], 10);
  const minute = parseInt(tm[2], 10);
  const ampm = tm[3].toUpperCase();
  if (ampm === 'PM' && hour !== 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;
  return Date.UTC(year, month, day, hour, minute) - 5 * 60 * 60 * 1000; // PKT = UTC+5
}

async function main() {
  loadEnvLocal();
  const { google } = await import('googleapis');

  const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
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
  if (rows.length <= 1) {
    console.log('Nothing to sort.');
    return;
  }

  const header = rows[0];
  const dataRows = rows.slice(1);

  const withKeys = dataRows.map(r => {
    const [name, phone, date, time] = r;
    const key = parseSheetDateTime(date ?? '', time ?? '');
    return { row: [name ?? '', phone ?? '', date ?? '', time ?? ''], key };
  });

  const unparseable = withKeys.filter(r => r.key === null);
  if (unparseable.length) {
    console.warn(`${unparseable.length} row(s) could not be parsed and will be kept at the end, unsorted:`, unparseable.map(r => r.row));
  }

  const sorted = withKeys
    .filter(r => r.key !== null)
    .sort((a, b) => (a.key as number) - (b.key as number))
    .concat(unparseable);

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${LEADS_TAB}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [header, ...sorted.map(r => r.row)] },
  });

  console.log(`Sorted ${sorted.length} rows chronologically (oldest first) in "${LEADS_TAB}".`);
}

main().catch(err => { console.error('Sort failed:', err); process.exit(1); });
