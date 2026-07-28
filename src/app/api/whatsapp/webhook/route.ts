import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { wantsBrochure, sendWhatsAppMessage, sendWhatsAppDocument } from '@/lib/whatsapp';
import { retrieveContext } from '@/lib/rag';
import { getAIReply } from '@/lib/gemini';

// ── GET: Meta webhook verification ───────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get('hub.mode');
  const token     = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    console.log('Webhook verified by Meta');
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

// ── POST: Incoming WhatsApp messages ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json();

  // Respond 200 immediately so Meta doesn't retry
  after(async () => {
    try {
      const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      if (!message || message.type !== 'text') return;

      const from = message.from as string;
      const text = message.text.body as string;
      console.log(`WhatsApp message from ${from}: ${text}`);

      if (wantsBrochure(text)) {
        await sendWhatsAppDocument(from);
        await sendWhatsAppMessage(from, 'Here is our complete Data Science & AI Bootcamp brochure! It covers the full curriculum, pricing, internship details, and instructor profiles. Let me know if you have any questions 😊');
        return;
      }

      const context = await retrieveContext(text);
      const reply   = await getAIReply(text, [], context);
      await sendWhatsAppMessage(from, reply);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Webhook error:', msg);
    }
  });

  return NextResponse.json({}, { status: 200 });
}
