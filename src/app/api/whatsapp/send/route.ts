import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { saveMessage } from '@/lib/redis';

export async function POST(req: NextRequest) {
  const { to, message } = await req.json();
  if (!to || !message) {
    return NextResponse.json({ error: 'Missing to or message' }, { status: 400 });
  }

  await sendWhatsAppMessage(to, message);
  // Save with empty text to indicate admin-initiated (no customer message)
  await saveMessage({ from: to, text: '', reply: message, timestamp: Date.now() });

  return NextResponse.json({ ok: true });
}
