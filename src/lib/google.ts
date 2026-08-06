import { google } from 'googleapis';
import { Readable } from 'stream';

const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID!;
const SHEET_ID        = process.env.GOOGLE_SHEET_ID!;
const SHEET_TAB       = process.env.GOOGLE_SHEET_TAB ?? 'Payment info bot';

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

async function getOrCreateEmailFolder(email: string): Promise<string> {
  const drive = google.drive({ version: 'v3', auth: auth() });

  const res = await drive.files.list({
    q: `name='${email}' and '${DRIVE_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
  });

  if (res.data.files?.length) return res.data.files[0].id!;

  const folder = await drive.files.create({
    requestBody: {
      name: email,
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
  email: string,
  timestamp: number,
): Promise<{ fileId: string; webViewLink: string }> {
  const drive    = google.drive({ version: 'v3', auth: auth() });
  const folderId = await getOrCreateEmailFolder(email);
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
    `+${data.phone}`,
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
  const tab    = 'Discount';

  // Ensure headers exist
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${tab}!A1:E1`,
  });
  if (!res.data.values?.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${tab}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['Name', 'Email', 'Phone', 'Message', 'Submitted (PKT)']] },
    });
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${tab}!A:E`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        data.name,
        data.email ?? '',
        `+${data.phone}`,
        data.message,
        new Date(data.timestamp).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
      ]],
    },
  });
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
