import { google } from 'googleapis';
import { Readable } from 'stream';

const DRIVE_FOLDER_ID   = process.env.GOOGLE_DRIVE_FOLDER_ID!;
const SHEET_ID          = process.env.GOOGLE_SHEET_ID!;
const SHEET_TAB         = process.env.GOOGLE_SHEET_TAB ?? 'Payment info bot';
const DISCOUNT_TAB      = process.env.GOOGLE_SHEET_TAB_DISCOUNT ?? 'Discount';
const LEADS_TAB         = process.env.GOOGLE_SHEET_TAB_LEADS ?? 'agent leads';

function auth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key:   (process.env.GOOGLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets',
    ],
  });
}

// ── Drive ──────────────────────────────────────────────────────────────────

async function getOrCreateFolder(folderName: string): Promise<string> {
  const drive = google.drive({ version: 'v3', auth: auth() });

  const res = await drive.files.list({
    q: `name='${folderName}' and '${DRIVE_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
  });

  if (res.data.files?.length) return res.data.files[0].id!;

  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [DRIVE_FOLDER_ID],
    },
    fields: 'id',
  });
  return folder.data.id!;
}

export async function uploadScreenshotToDrive(
  buffer: Buffer,
  mimeType: string,
  phone: string,
  timestamp: number,
): Promise<{ fileId: string; webViewLink: string }> {
  const drive    = google.drive({ version: 'v3', auth: auth() });
  const folderId = await getOrCreateFolder(phone);
  const ext      = mimeType.includes('png') ? 'png' : mimeType.includes('pdf') ? 'pdf' : 'jpg';

  const file = await drive.files.create({
    requestBody: {
      name:    `payment_${timestamp}.${ext}`,
      parents: [folderId],
    },
    media: { mimeType, body: Readable.from(buffer) },
    fields: 'id,webViewLink',
  });

  // Make the file viewable by anyone with the link
  await drive.permissions.create({
    fileId: file.data.id!,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return { fileId: file.data.id!, webViewLink: file.data.webViewLink! };
}

// ── Sheets ─────────────────────────────────────────────────────────────────

export async function ensureSheetHeaders(): Promise<void> {
  const sheets = google.sheets({ version: 'v4', auth: auth() });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_TAB}!A1:F1`,
  });

  if (!res.data.values?.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_TAB}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['Name', 'Email', 'Phone', 'Submitted (PKT)', 'Screenshot', 'Status']],
      },
    });
  }
}

export async function appendEnrollmentRow(data: {
  name: string;
  email: string;
  phone: string;
  timestamp: number;
  driveLink: string;
}): Promise<number> {
  await ensureSheetHeaders();
  const sheets = google.sheets({ version: 'v4', auth: auth() });

  const row = [
    data.name,
    data.email,
    // Leading ' forces Sheets to store this as literal text under USER_ENTERED —
    // without it, "+923..." is parsed as a unary-plus numeric expression and the
    // '+' silently gets dropped, breaking every exact-match phone lookup later.
    `'+${data.phone}`,
    new Date(data.timestamp).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
    data.driveLink,
    'Pending',
  ];

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_TAB}!A:F`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });

  // Extract row number from "Payment info bot!A5:F5"
  const updated = res.data.updates?.updatedRange ?? '';
  const match   = updated.match(/!A(\d+)/);
  return match ? parseInt(match[1]) : -1;
}

export async function appendDiscountRow(data: {
  name: string;
  phone: string;
  email?: string;
  message: string;
  timestamp: number;
}): Promise<void> {
  const sheets = google.sheets({ version: 'v4', auth: auth() });
  const tab    = DISCOUNT_TAB;

  // Ensure headers exist
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${tab}!A1:F1`,
  });
  if (!res.data.values?.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${tab}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['Name', 'Email', 'Phone', 'Message', 'Submitted (PKT)', 'Comment']] },
    });
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${tab}!A:F`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        data.name,
        data.email ?? '',
        `'+${data.phone}`, // leading ' forces text — see appendEnrollmentRow for why
        data.message,
        new Date(data.timestamp).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
        '',
      ]],
    },
  });
}

// Updates the Comment column (F) on the most recent Discount row for this phone —
// used when a known discount requester sends a follow-up/counter-offer, so the
// existing row is updated rather than a confusing duplicate row being created.
export async function updateDiscountRowComment(phone: string, comment: string): Promise<void> {
  const sheets = google.sheets({ version: 'v4', auth: auth() });
  const tab    = DISCOUNT_TAB;
  const target = `+${phone}`;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${tab}!A:F`,
  });
  const rows = res.data.values ?? [];

  // Search from the bottom so the MOST RECENT matching row wins if there are several
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][2] === target) {
      const rowNumber = i + 1;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${tab}!F${rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[comment]] },
      });
      return;
    }
  }
}

// ── Leads ──────────────────────────────────────────────────────────────────

function formatLeadRow(name: string | null, phone: string, timestamp: number): string[] {
  const dateStr = new Date(timestamp).toLocaleDateString('en-PK', {
    timeZone: 'Asia/Karachi', day: '2-digit', month: 'short', year: 'numeric',
  });
  const timeStr = new Date(timestamp).toLocaleTimeString('en-PK', {
    timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: true,
  });
  // Leading ' forces text under USER_ENTERED — see appendEnrollmentRow for why
  return [name ?? '', `'+${phone}`, dateStr, timeStr];
}

async function ensureLeadsHeader(sheets: ReturnType<typeof google.sheets>): Promise<void> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${LEADS_TAB}!A1:D1`,
  });
  if (!res.data.values?.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${LEADS_TAB}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['Name', 'Phone', 'Date', 'Time']] },
    });
  }
}

export async function appendLeadRow(data: {
  name: string | null;
  phone: string;
  timestamp: number;
}): Promise<void> {
  const sheets = google.sheets({ version: 'v4', auth: auth() });
  await ensureLeadsHeader(sheets);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${LEADS_TAB}!A:D`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [formatLeadRow(data.name, data.phone, data.timestamp)] },
  });
}

export async function appendLeadRows(
  rows: { name: string | null; phone: string; timestamp: number }[],
): Promise<void> {
  if (!rows.length) return;
  const sheets = google.sheets({ version: 'v4', auth: auth() });
  await ensureLeadsHeader(sheets);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${LEADS_TAB}!A:D`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows.map(r => formatLeadRow(r.name, r.phone, r.timestamp)) },
  });
}

// Backfills the Name column once we learn a contact's name after their lead row
// was already written with a blank name. Only touches a row whose Name is still empty.
export async function updateLeadName(phone: string, name: string): Promise<void> {
  const sheets = google.sheets({ version: 'v4', auth: auth() });
  const target = `+${phone}`;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${LEADS_TAB}!A:D`,
  });
  const rows = res.data.values ?? [];

  for (let i = 1; i < rows.length; i++) {
    const rowPhone = rows[i][1];
    const rowName  = rows[i][0];
    if (rowPhone === target && !rowName) {
      const rowNumber = i + 1;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${LEADS_TAB}!A${rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[name]] },
      });
      return;
    }
  }
}

export async function updateSheetStatus(rowIndex: number, status: string): Promise<void> {
  if (rowIndex < 1) return;
  const sheets = google.sheets({ version: 'v4', auth: auth() });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_TAB}!F${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[status]] },
  });
}
