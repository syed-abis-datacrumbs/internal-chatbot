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

// Repairs a phone column that Sheets silently converted from "+923..." text to
// the bare number 923... (unary-plus parsing under USER_ENTERED). Rewrites each
// affected cell with a leading ' so Sheets stores it as literal text going forward.
async function repairTab(sheets: any, sheetId: string, tab: string, phoneColLetter: string, phoneColIndex: number) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${tab}!A:${String.fromCharCode(65 + Math.max(phoneColIndex, 5))}`,
  });
  const rows = res.data.values ?? [];
  if (rows.length <= 1) {
    console.log(`${tab}: no data rows.`);
    return;
  }

  const updates: { range: string; values: string[][] }[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cell = rows[i][phoneColIndex];
    if (cell && !String(cell).startsWith('+')) {
      const rowNumber = i + 1;
      updates.push({
        range: `${tab}!${phoneColLetter}${rowNumber}`,
        values: [[`'+${cell}`]],
      });
    }
  }

  console.log(`${tab}: ${updates.length} row(s) need repair.`);
  if (!updates.length) return;

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: updates,
    },
  });
  console.log(`${tab}: repaired ${updates.length} row(s).`);
}

async function main() {
  loadEnvLocal();
  const { google } = await import('googleapis');

  const SHEET_ID      = process.env.GOOGLE_SHEET_ID!;
  const LEADS_TAB      = process.env.GOOGLE_SHEET_TAB_LEADS ?? 'agent leads';
  const DISCOUNT_TAB   = process.env.GOOGLE_SHEET_TAB_DISCOUNT ?? 'Discount';
  const ENROLLMENT_TAB = process.env.GOOGLE_SHEET_TAB ?? 'Payment info bot';

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // agent leads: Name(A) Phone(B) Date(C) Time(D) — phone is column B, index 1
  await repairTab(sheets, SHEET_ID, LEADS_TAB, 'B', 1);
  // Discount: Name(A) Email(B) Phone(C) Message(D) Submitted(E) Comment(F) — phone is column C, index 2
  await repairTab(sheets, SHEET_ID, DISCOUNT_TAB, 'C', 2);
  // Payment info bot: Name(A) Email(B) Phone(C) ... — phone is column C, index 2
  await repairTab(sheets, SHEET_ID, ENROLLMENT_TAB, 'C', 2);

  console.log('Done.');
}

main().catch(err => { console.error('Repair failed:', err); process.exit(1); });
