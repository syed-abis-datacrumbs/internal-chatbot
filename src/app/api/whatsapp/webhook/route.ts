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
  getContactProfile, saveContactProfile,
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

// ── Helpers ──────────────────────────────────────────────────────────────────

const EMAIL_RE = /[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+/;

function extractEmailAndName(text: string): { email: string | null; name: string | null } {
  const emailMatch = text.match(EMAIL_RE);
  const email = emailMatch ? emailMatch[0].toLowerCase() : null;
  const nameRaw = text.replace(EMAIL_RE, '').replace(/[,;|]+/g, ' ').replace(/\s+/g, ' ').trim();
  const name = nameRaw.length > 0 ? nameRaw : null;
  return { email, name };
}

function looksLikeName(text: string): boolean {
  const t = text.trim();
  if (t.includes('@') || t.includes('?') || t.length > 60) return false;
  const questionWords = /\b(what|how|when|where|why|tell|is|are|do|can|could|would|please|about|kya|kab|kaisa|bata|mujhe|aur|aap|fee|timing|course|duration|internship)\b/i;
  return !questionWords.test(t) && t.split(/\s+/).length <= 5;
}

// ── Enrollment state machine ─────────────────────────────────────────────────
async function runEnrollmentMachine(
  from: string,
  session: EnrollmentSession,
  msgType: string,
  text: string,
  imageId?: string,
  imageMime?: string,
): Promise<{ reply: string; mediaUrl?: string }> {
  let reply = '';
  let mediaUrl: string | undefined;

  switch (session.state) {

    case 'collecting_name': {
      // If email was already saved in a previous turn, only name is missing
      if (session.email) {
        const nameOnly = text.replace(EMAIL_RE, '').replace(/[,;|]+/g, ' ').trim();
        if (!nameOnly) {
          reply = 'Please share your *full name* to continue.';
          break;
        }
        session.name  = nameOnly;
        session.state = 'awaiting_screenshot';
        reply = `Perfect, *${session.name}*! 🎉\n\n${buildPaymentMsg()}`;
        break;
      }

      // Try to extract both name and email from this message
      const { email, name } = extractEmailAndName(text);

      if (name && email) {
        session.name  = name;
        session.email = email;
        session.state = 'awaiting_screenshot';
        reply = `Perfect, *${session.name}*! 🎉\n\n${buildPaymentMsg()}`;
      } else if (email && !name) {
        // Got email only — save it, ask for name
        session.email = email;
        reply = `Got your email! 😊 Could you also share your *full name*, please?`;
      } else if (name && !email) {
        // Got name only — save it, ask for email
        session.name  = name;
        session.state = 'collecting_email';
        reply = `Thanks *${session.name}*! 😊 Now please share your *email address*.`;
      } else {
        reply = `Please share your *full name* and *email address* to continue.\n\nExample: _John Doe, johndoe@gmail.com_`;
      }
      break;
    }

    case 'collecting_email': {
      const { email } = extractEmailAndName(text);
      if (!email) {
        reply = 'Please share a valid *email address* (e.g. name@gmail.com).';
        break;
      }
      session.email = email;
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

        const rowIndex = await appendEnrollmentRow({
          name:      session.name!,
          email:     session.email!,
          phone:     from,
          timestamp: ts,
          driveLink: webViewLink,
        });

        session.driveFileId   = fileId;
        session.driveFileUrl  = webViewLink;
        if (!session.sheetRowIndex || session.sheetRowIndex < 1) {
          session.sheetRowIndex = rowIndex;
        }
        session.state = 'screenshot_received';
        mediaUrl = fileId;

        reply = `✅ We've received your payment screenshot!\n\nOur team will verify it and confirm your enrollment by tomorrow. We'll send you a message here once confirmed.\n\nIn the meantime, please sign up on our LMS using the *same email address* you provided (${session.email}):\n🔗 https://lms.datacrumbs.org\n\nThank you, *${session.name}*! We're excited to have you join DataCrumbs 🚀`;
      } else {
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
  return { reply, mediaUrl };
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

      // Fetch session and contact profile in parallel upfront
      const [session, contactProfile] = await Promise.all([
        getActiveEnrollmentSession(from),
        getContactProfile(from),
      ]);

      // ── 0. Bot toggle — if disabled, save message silently and exit ──────
      if (contactProfile?.botDisabled) {
        if (msgType === 'text' && text) {
          await saveMessage({ from, text, reply: '', timestamp: Date.now() });
        }
        return;
      }

      // ── 1. Check for active enrollment session ──────────────────────────
      if (session) {
        const { reply, mediaUrl } = await runEnrollmentMachine(from, session, msgType, text, imageId, imageMime);
        await sendWhatsAppMessage(from, reply);
        await saveMessage({
          from, text: text || '[image]', reply, timestamp: Date.now(),
          ...(mediaUrl ? { mediaUrl, mediaType: 'image' as const } : {}),
        });
        return;
      }

      // ── 2. Only handle text from here on ───────────────────────────────
      if (msgType !== 'text') return;

      // ── 3. Brochure shortcut ────────────────────────────────────────────
      if (wantsBrochure(text)) {
        const reply = 'Here is our complete Data Science & AI Bootcamp brochure! It covers the full curriculum, pricing, internship details, and instructor profiles. Let me know if you have any questions 😊';
        await sendWhatsAppDocument(from);
        await sendWhatsAppMessage(from, reply);
        await saveMessage({ from, text, reply, timestamp: Date.now(), mediaType: 'document' });
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
        const reply = `Great! I'll get you enrolled in the *4-Month AI & Data Science Bootcamp* 🎓\n\nPlease share your *full name* and *email address* together so we can get started!\n\nExample: _John Doe, johndoe@gmail.com_`;
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

      // Detect if previous bot message asked for name and user is now responding
      if (contactProfile?.nameAsked && !contactProfile?.name && looksLikeName(text)) {
        await saveContactProfile({ phone: from, name: text.trim(), nameAsked: false });
      }

      // Build Gemini history from past exchanges
      const history = recentMsgs.flatMap(m => [
        ...(m.text && m.text !== '[image]' ? [{ role: 'user'  as const, parts: [{ text: m.text  }] }] : []),
        ...(m.reply                         ? [{ role: 'model' as const, parts: [{ text: m.reply }] }] : []),
      ]);

      let reply = await getAIReply(text, history, systemPrompt);

      // Ask for name once — on the user's second message (first real question after greeting)
      if (!contactProfile?.name && !contactProfile?.nameAsked && recentMsgs.length === 1) {
        reply += '\n\nBy the way, may I know your name? 😊';
        await saveContactProfile({ phone: from, nameAsked: true });
      }

      await sendWhatsAppMessage(from, reply);
      await saveMessage({ from, text, reply, timestamp: Date.now() });

    } catch (err: unknown) {
      console.error('Webhook error:', err instanceof Error ? err.message : err);
    }
  });

  return NextResponse.json({}, { status: 200 });
}
