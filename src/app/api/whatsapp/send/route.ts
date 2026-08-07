import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage, sendWhatsAppDocument } from '@/lib/whatsapp';
import { saveMessage } from '@/lib/redis';

export async function POST(req: NextRequest) {
  const { to, message, sendBrochure } = await req.json();
  if (!to || (!message && !sendBrochure)) {
    return NextResponse.json({ error: 'Missing to or message' }, { status: 400 });
  }

  let sentDoc = false;
  if (sendBrochure) {
    try {
      await sendWhatsAppDocument(to);
      sentDoc = true;
    } catch (err) {
      console.error('Admin brochure send failed:', err instanceof Error ? err.message : err);
    }
  }
  if (message) {
    await sendWhatsAppMessage(to, message);
  }
  // Save with empty text to indicate admin-initiated (no customer message)
  await saveMessage({
    from: to, text: '', reply: message || '', timestamp: Date.now(),
    ...(sentDoc ? { mediaType: 'document' as const } : {}),
  });

  return NextResponse.json({ ok: true });
}
