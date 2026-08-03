import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import {
  wantsBrochure, wantsEnrollment,
  sendWhatsAppMessage, sendWhatsAppDocument,
  downloadWhatsAppMedia,
} from '@/lib/whatsapp';
import { getAIReply } from '@/lib/gemini';
import {
  saveMessage, getSystemPrompt, getRecentMessagesByPhone,
  getActiveEnrollmentSession, saveEnrollmentSession,
  type EnrollmentSession,
} from '@/lib/redis';
import { uploadScreenshotToDrive, appendEnrollmentRow } from '@/lib/google';

// ── GET: Meta webhook verification ───────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get('hub.mode');
  const token     = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

// ── Payment details (sent when email collected) ──────────────────────────────
function buildPaymentMsg() {
  return `Please complete the payment using any of these methods:

🏦 *${process.env.PAYMENT_BANK_NAME}*
Account Title: ${process.env.PAYMENT_BANK_TITLE}
IBAN: ${process.env.PAYMENT_BANK_IBAN}
Account Number: ${process.env.PAYMENT_BANK_ACCOUNT}

📱 *Easypaisa / Jazzcash / NayaPay*
Account Title: ${process.env.PAYMENT_WALLET_TITLE}
Account Number: ${process.env.PAYMENT_WALLET_NUMBER}

Fee: *${process.env.PAYMENT_FEE ?? 'Rs. 7,499/month'}*

Once you've paid, please send a *screenshot* here and we'll verify it and get you enrolled! ✅`;
}

// ── Enrollment state machine ─────────────────────────────────────────────────
async function runEnrollmentMachine(
  from: string,
  session: EnrollmentSession,
  msgType: string,
  text: string,
  imageId?: string,
  imageMime?: string,
): Promise<string> {
  let reply = '';

  switch (session.state) {

    case 'collecting_name': {
      if (!text.trim()) {
        reply = 'Please share your *full name* to continue.';
        break;
      }
      session.name  = text.trim();
      session.state = 'collecting_email';
      reply = `Thanks *${session.name}*! 😊 Now please share your *email address*.`;
      break;
    }

    case 'collecting_email': {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!text.trim() || !emailRe.test(text.trim())) {
        reply = 'Please share a valid *email address* (e.g. name@gmail.com).';
        break;
      }
      session.email = text.trim().toLowerCase();
      session.state = 'awaiting_screenshot';
      reply = `Perfect, *${session.name}*! 🎉\n\n${buildPaymentMsg()}`;
      break;
    }

    case 'awaiting_screenshot':
    case 'screenshot_received': {
      if (msgType === 'image' && imageId) {
        const { buffer, mimeType } = await downloadWhatsAppMedia(imageId);
        const ts = Date.now();
        const { fileId, webViewLink } = await uploadScreenshotToDrive(
          buffer, mimeType, session.email!, ts,
        );

        // Append a new row to the sheet for every screenshot
        const rowIndex = await appendEnrollmentRow({
          name:      session.name!,
          email:     session.email!,
          phone:     from,
          timestamp: ts,
          driveLink: webViewLink,
        });

        // Always update to latest file reference; keep earliest sheetRowIndex
        session.driveFileId   = fileId;
        session.driveFileUrl  = webViewLink;
        if (!session.sheetRowIndex || session.sheetRowIndex < 1) {
          session.sheetRowIndex = rowIndex;
        }
        session.state = 'screenshot_received';

        reply = `✅ We've received your payment screenshot!\n\nOur team will verify it and confirm your enrollment by tomorrow. We'll send you a message here once confirmed.\n\nThank you, *${session.name}*! We're excited to have you join DataCrumbs 🚀`;
      } else {
        // Text while waiting for screenshot
        reply = `Please send a *screenshot* of your payment to proceed.\n\n${buildPaymentMsg()}`;
      }
      break;
    }

    case 'approved': {
      reply = `You're already enrolled in DataCrumbs! Welcome 🎓 If you have any questions, feel free to ask.`;
      break;
    }

    default:
      reply = `Your enrollment is being processed. Our team will confirm shortly. You can also send additional payment screenshots here if needed.`;
  }

  await saveEnrollmentSession(session);
  return reply;
}

// ── POST: Incoming WhatsApp messages ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json();

  after(async () => {
    try {
      const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      if (!message) return;

      const from    = message.from as string;
      const msgType = message.type as string;
      const text    = msgType === 'text' ? (message.text?.body as string ?? '') : '';
      const imageId   = message.image?.id as string | undefined;
      const imageMime = message.image?.mime_type as string | undefined;

      // ── 1. Check for active enrollment session ──────────────────────────
      const session = await getActiveEnrollmentSession(from);

      if (session) {
        const reply = await runEnrollmentMachine(from, session, msgType, text, imageId, imageMime);
        await sendWhatsAppMessage(from, reply);
        await saveMessage({ from, text: text || '[image]', reply, timestamp: Date.now() });
        return;
      }

      // ── 2. Only handle text from here on ───────────────────────────────
      if (msgType !== 'text') return;

      // ── 3. Brochure shortcut ────────────────────────────────────────────
      if (wantsBrochure(text)) {
        const reply = 'Here is our complete Data Science & AI Bootcamp brochure! It covers the full curriculum, pricing, internship details, and instructor profiles. Let me know if you have any questions 😊';
        await sendWhatsAppDocument(from);
        await sendWhatsAppMessage(from, reply);
        await saveMessage({ from, text, reply, timestamp: Date.now() });
        return;
      }

      // ── 4. Enrollment intent → start state machine ──────────────────────
      if (wantsEnrollment(text)) {
        const newSession: EnrollmentSession = {
          phone:         from,
          state:         'collecting_name',
          name:          null,
          email:         null,
          driveFileId:   null,
          driveFileUrl:  null,
          sheetRowIndex: null,
          createdAt:     Date.now(),
          updatedAt:     Date.now(),
        };
        const reply = `Great! I'll get you enrolled in the *4-Month AI & Data Science Bootcamp* 🎓\n\nFirst, could you please share your *full name*?`;
        await saveEnrollmentSession(newSession);
        await sendWhatsAppMessage(from, reply);
        await saveMessage({ from, text, reply, timestamp: Date.now() });
        return;
      }

      // ── 5. Normal Gemini flow ───────────────────────────────────────────
      const [systemPrompt, recentMsgs] = await Promise.all([
        getSystemPrompt(),
        getRecentMessagesByPhone(from, 10),
      ]);

      // Build Gemini history from past exchanges (exclude current message)
      const history = recentMsgs.flatMap(m => [
        ...(m.text && m.text !== '[image]' ? [{ role: 'user'  as const, parts: [{ text: m.text  }] }] : []),
        ...(m.reply                         ? [{ role: 'model' as const, parts: [{ text: m.reply }] }] : []),
      ]);

      const reply = await getAIReply(text, history, systemPrompt);
      await sendWhatsAppMessage(from, reply);
      await saveMessage({ from, text, reply, timestamp: Date.now() });

    } catch (err: unknown) {
      console.error('Webhook error:', err instanceof Error ? err.message : err);
    }
  });

  return NextResponse.json({}, { status: 200 });
}
