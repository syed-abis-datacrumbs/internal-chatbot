import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import {
  wantsBrochure, wantsEnrollment,
  sendWhatsAppMessage, sendWhatsAppDocument,
  downloadWhatsAppMedia,
} from '@/lib/whatsapp';
import { getAIReply } from '@/lib/gemini';
import { CORE_SYSTEM_PROMPT } from '@/lib/knowledge';
import {
  saveMessage, getRecentMessagesByPhone,
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

// ── Payment details ───────────────────────────────────────────────────────────
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

// ── Helpers ───────────────────────────────────────────────────────────────────

const EMAIL_RE = /[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+/;

// Strip common preamble phrases so "My name is John" → "John"
function cleanName(raw: string): string {
  return raw
    .replace(/\b(my name is|i am|i'm|name is|call me|and email is|email is|email:)\b/gi, '')
    .replace(/@\S*/g, '')   // remove stray @fragments
    .replace(EMAIL_RE, '')  // remove any leftover email fragment
    .replace(/[,;|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function looksLikeName(text: string): boolean {
  const t = text.trim();
  if (!t || t.length < 2 || t.length > 40) return false;
  // Reject if contains any numbers, punctuation, or question marks
  if (/[0-9?!@#$%^&*()_+={}\[\]:;<>\\\/]/g.test(t)) return false;
  const words = t.split(/\s+/);
  if (words.length > 4) return false;

  const NON_NAME_WORDS = /\b(tell|something|related|internship|course|bootcamp|fee|price|cost|timing|class|classes|recording|missed|register|enroll|payment|pay|bank|easypaisa|jazzcash|nayapay|account|iban|screenshot|receipt|hi|hello|hey|salam|aoa|okay|ok|yes|no|thanks|thank|what|how|when|where|why|is|are|can|could|would|please|about|kya|kab|kaisa|bata|mujhe|aur|aap)\b/i;
  return !NON_NAME_WORDS.test(t);
}

function extractEmailAndName(text: string): { email: string | null; name: string | null } {
  const emailMatch = text.match(EMAIL_RE);
  const email = emailMatch ? emailMatch[0].toLowerCase() : null;
  const nameCandidate = cleanName(text.replace(EMAIL_RE, ''));
  const name = looksLikeName(nameCandidate) ? nameCandidate : null;
  return { email, name };
}

// Extract explicit name introduced in conversation ("my name is Syed Abis", "I am Syed Abis")
function extractExplicitNameFromText(text: string): string | null {
  if (!text || text.length > 100) return null;
  const match = text.match(/\b(?:my name is|i am|i'm|call me|name is)\s+([A-Za-z\s]{2,35})/i);
  if (match) {
    const candidate = cleanName(match[1]);
    if (looksLikeName(candidate)) return candidate;
  }
  return null;
}

// True if the message looks like a question the AI should answer
function isQuestion(text: string): boolean {
  if (text.trim().endsWith('?')) return true;
  const questionWords = /\b(what|how|when|where|why|tell|is|are|do|can|could|would|please|about|kya|kab|kaisa|bata|mujhe|fee|timing|course|duration|internship)\b/i;
  return questionWords.test(text);
}

type GeminiHistory = { role: 'user' | 'model'; parts: { text: string }[] }[];

// Strip any enrollment nudge Gemini added (system prompt tells it to redirect),
// so the code can control when nudges are appended.
function stripEnrollmentNudge(text: string): string {
  return text
    // "Also, please share your *email address*..." / "Please provide your full name..."
    .replace(/\n+(Also,?\s*)?(please\s+)?(share|provide|send)\s+your\s+[\*_]*(full\s+name|name|email\s+address|email|payment\s+screenshot|screenshot)[\*_]*.*/gi, '')
    // "To continue/proceed, please share your name/email..."
    .replace(/\n+To\s+(continue|proceed|get\s+started)[^.!?]*?(share|provide|send)\s+your\s+(name|email|screenshot).*/gi, '')
    // "You can also share/provide your email..."
    .replace(/\n+You\s+can\s+(also\s+)?(share|provide|send)\s+your\s+(name|email|screenshot).*/gi, '')
    // "When you're ready, please send a screenshot..."
    .replace(/\n+When\s+you're\s+ready[^.!?]*?send\s+a\s+screenshot.*/gi, '')
    .trim();
}

function withNudgeIfNeeded(aiReply: string, nudge: string, checkRegex: RegExp): string {
  if (checkRegex.test(aiReply)) {
    return aiReply;
  }
  return `${aiReply}\n\n${nudge}`;
}

// ── Enrollment state machine ──────────────────────────────────────────────────
async function runEnrollmentMachine(
  from: string,
  session: EnrollmentSession,
  msgType: string,
  text: string,
  imageId?: string,
  imageMime?: string,
  history: GeminiHistory = [],
  explicitName?: string,
): Promise<{ reply: string; mediaUrl?: string }> {
  let reply = '';
  let mediaUrl: string | undefined;

  // Prefer session.name, or explicit name stated by user in chat history
  const candidateName = session.name || explicitName;
  if (!session.name && candidateName && looksLikeName(candidateName)) {
    session.name = candidateName;
  }

  // Prevent Gemini from adding its own enrollment nudge — the code appends one precisely
  const enrollmentSystemPrompt = `${CORE_SYSTEM_PROMPT}\n\nIMPORTANT: The user is currently mid-enrollment. Answer their question directly and concisely. Do NOT add unnecessary prompts or reminders asking for their name, email, or payment screenshots.`;

  switch (session.state) {

    case 'collecting_name': {
      // Image sent before name/email — upload to Drive for display only, redirect user
      if (msgType === 'image' && imageId) {
        const { buffer, mimeType } = await downloadWhatsAppMedia(imageId);
        const { fileId } = await uploadScreenshotToDrive(buffer, mimeType, session.email ?? from, Date.now());
        mediaUrl = fileId;
        const what = session.email ? '*full name*' : '*full name* and *email address*';
        reply = `Please share your ${what} first so we can get you enrolled! 😊`;
        break;
      }

      // Email already saved — only need name now
      if (session.email) {
        const nameOnly = cleanName(text);
        if (!nameOnly || !looksLikeName(nameOnly)) {
          if (enrollmentSystemPrompt && text.trim()) {
            reply = await getAIReply(text, history, enrollmentSystemPrompt);
          } else {
            reply = 'Please share your *full name* to continue.\n\nExample: _John Doe_';
          }
          break;
        }
        session.name  = nameOnly;
        session.state = 'awaiting_screenshot';
        reply = `Perfect, *${session.name}*! 🎉\n\n${buildPaymentMsg()}`;
        break;
      }

      // Try to extract both name and email
      const { email, name } = extractEmailAndName(text);

      if (name && email) {
        if (!looksLikeName(name)) {
          // Email found but extracted name is still messy — save email, ask for name
          session.email = email;
          reply = `Got your email! 😊 Could you share your *full name*?\n\nExample: _John Doe_`;
        } else {
          session.name  = name;
          session.email = email;
          session.state = 'awaiting_screenshot';
          reply = `Perfect, *${session.name}*! 🎉\n\n${buildPaymentMsg()}`;
        }
      } else if (email && !name) {
        session.email = email;
        reply = `Got your email! 😊 Could you also share your *full name*, please?\n\nExample: _John Doe_`;
      } else if (name && !email) {
        if (!looksLikeName(name)) {
          // Doesn't look like a name — use Gemini for any non-empty reply
          if (enrollmentSystemPrompt && text.trim()) {
            reply = await getAIReply(text, history, enrollmentSystemPrompt);
          } else {
            reply = `Please share your *full name* and *email address* to continue.\n\nExample: _John Doe, johndoe@gmail.com_`;
          }
        } else {
          session.name  = name;
          session.state = 'collecting_email';
          reply = `Thanks *${session.name}*! 😊 Now please share your *email address*.`;
        }
      } else {
        // Neither — use Gemini for any non-empty reply
        if (enrollmentSystemPrompt && text.trim()) {
          reply = await getAIReply(text, history, enrollmentSystemPrompt);
        } else {
          reply = `Please share your *full name* and *email address* to continue.\n\nExample: _John Doe, johndoe@gmail.com_`;
        }
      }
      break;
    }

    case 'collecting_email': {
      // Image sent before email — upload to Drive for display only, redirect user
      if (msgType === 'image' && imageId) {
        const { buffer, mimeType } = await downloadWhatsAppMedia(imageId);
        const { fileId } = await uploadScreenshotToDrive(buffer, mimeType, session.email ?? from, Date.now());
        mediaUrl = fileId;
        reply = `Please share your *email address* first (e.g. name@gmail.com) and then we'll get to the payment screenshot! 😊`;
        break;
      }
      const { email } = extractEmailAndName(text);
      if (!email) {
        // Use Gemini for any non-email reply (questions, "done", "okay", etc.)
        if (enrollmentSystemPrompt && text.trim()) {
          reply = await getAIReply(text, history, enrollmentSystemPrompt!);
        } else {
          reply = 'Please share a valid *email address* (e.g. name@gmail.com).';
        }
        break;
      }
      session.email = email;
      session.state = 'awaiting_screenshot';
      reply = `Perfect, *${session.name}*! 🎉\n\n${buildPaymentMsg()}`;
      break;
    }

    case 'awaiting_screenshot': {
      const isImage = msgType === 'image' || (msgType === 'document' && Boolean(imageId));
      if (isImage && imageId) {
        let fileId = '';
        let webViewLink = '';
        let rowIndex = -1;

        try {
          const { buffer, mimeType } = await downloadWhatsAppMedia(imageId);
          const ts = Date.now();
          const driveRes = await uploadScreenshotToDrive(
            buffer, mimeType, session.email || 'unknown@datacrumbs.org', ts,
          );
          fileId = driveRes.fileId;
          webViewLink = driveRes.webViewLink;

          rowIndex = await appendEnrollmentRow({
            name:      session.name || 'Student',
            email:     session.email || 'unknown@datacrumbs.org',
            phone:     from,
            timestamp: ts,
            driveLink: webViewLink,
          });
        } catch (err: unknown) {
          console.error('Failed to process screenshot on Drive/Sheets:', err instanceof Error ? err.message : err);
        }

        if (fileId) {
          session.driveFileId  = fileId;
          session.driveFileUrl = webViewLink;
          mediaUrl = fileId;
        }
        if (rowIndex > 0) {
          session.sheetRowIndex = rowIndex;
        }
        session.state = 'screenshot_received';

        const validName = (session.name && looksLikeName(session.name)) ? session.name : null;
        const nameGreeting = validName ? `, *${validName}*` : '';
        reply = `✅ We've received your image! Our team will review and verify your payment receipt. Once verified, we will confirm your enrollment here.\n\nIn the meantime, please sign up on our LMS using the *same email address* you provided (${session.email}):\n🔗 https://lms.datacrumbs.org\n\nThank you${nameGreeting}! We're excited to have you join DataCrumbs 🚀`;
      } else if (msgType === 'text' && text.trim()) {
        const isPaymentQuery = /\b(pay|payment|bank|easypaisa|jazzcash|nayapay|account|iban|fee|receipt|ss|screenshot|transfer|paid)\b/i.test(text);
        if (enrollmentSystemPrompt) {
          const aiReply = await getAIReply(text, history, enrollmentSystemPrompt);
          if (isPaymentQuery) {
            reply = `${aiReply}\n\nWhen you're ready, please send a *screenshot* of your payment to proceed 😊`;
          } else {
            reply = aiReply;
          }
        } else {
          reply = `Please send a *screenshot* of your payment to proceed.\n\n${buildPaymentMsg()}`;
        }
      } else {
        reply = `Please send a *screenshot* of your payment to proceed.\n\n${buildPaymentMsg()}`;
      }
      break;
    }

    case 'screenshot_received': {
      const isImage = msgType === 'image' || (msgType === 'document' && Boolean(imageId));
      if (isImage && imageId) {
        let fileId = '';
        let webViewLink = '';
        try {
          const { buffer, mimeType } = await downloadWhatsAppMedia(imageId);
          const ts = Date.now();
          const driveRes = await uploadScreenshotToDrive(
            buffer, mimeType, session.email || 'unknown@datacrumbs.org', ts,
          );
          fileId = driveRes.fileId;
          webViewLink = driveRes.webViewLink;
        } catch (err: unknown) {
          console.error('Failed to update screenshot on Drive:', err instanceof Error ? err.message : err);
        }

        if (fileId) {
          session.driveFileId  = fileId;
          session.driveFileUrl = webViewLink;
          mediaUrl = fileId;
        }

        reply = `✅ Thanks! We've received your image upload. Our team will review and verify it to confirm your enrollment shortly.`;
      } else if (msgType === 'text' && text.trim() && enrollmentSystemPrompt) {
        reply = await getAIReply(text, history, enrollmentSystemPrompt);
      } else {
        reply = `We've received your image upload and our team is reviewing it! We will update you shortly. 😊`;
      }
      break;
    }

    case 'approved': {
      if (msgType === 'text' && text.trim()) {
        reply = await getAIReply(text, history, CORE_SYSTEM_PROMPT);
      } else {
        reply = `You're enrolled in DataCrumbs! Welcome 🎓 If you have any questions, feel free to ask.`;
      }
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
      const value = body?.entry?.[0]?.changes?.[0]?.value;
      const message = value?.messages?.[0];
      if (!message) return;

      const from      = message.from as string;
      const msgType   = message.type as string;
      const text      = msgType === 'text' ? (message.text?.body as string ?? '') : (message.image?.caption ?? message.document?.caption ?? '');
      const imageId   = message.image?.id ?? (message.document?.mime_type?.startsWith('image/') || message.document?.filename?.match(/\.(jpg|jpeg|png|webp|heic)$/i) ? message.document?.id : undefined);
      const imageMime = message.image?.mime_type ?? message.document?.mime_type ?? 'image/jpeg';

      const [session, contactProfile] = await Promise.all([
        getActiveEnrollmentSession(from),
        getContactProfile(from),
      ]);

      // Check if user explicitly stated their name in this message ("My name is John")
      const newlyStatedName = msgType === 'text' ? extractExplicitNameFromText(text) : null;
      if (newlyStatedName) {
        await saveContactProfile({ phone: from, name: newlyStatedName, nameAsked: false });
      }

      const explicitName = newlyStatedName || (contactProfile?.name && looksLikeName(contactProfile.name) ? contactProfile.name : undefined);

      // ── 0. Bot toggle ────────────────────────────────────────────────────
      if (contactProfile?.botDisabled) {
        if (msgType === 'text' && text) {
          await saveMessage({ from, text, reply: '', timestamp: Date.now() });
        }
        return;
      }

      // ── 1. Active enrollment session ─────────────────────────────────────
      if (session) {
        // Fetch AI context for all states where the user might ask questions
        const needsAI = session.state !== 'approved';
        const recentMsgs = needsAI
          ? await getRecentMessagesByPhone(from, 10)
          : [];

        const history: GeminiHistory = recentMsgs.flatMap(m => [
          ...(m.text && m.text !== '[image]' ? [{ role: 'user'  as const, parts: [{ text: m.text  }] }] : []),
          ...(m.reply                         ? [{ role: 'model' as const, parts: [{ text: m.reply }] }] : []),
        ]);

        const { reply, mediaUrl } = await runEnrollmentMachine(
          from, session, msgType, text, imageId, imageMime, history, explicitName,
        );
        await sendWhatsAppMessage(from, reply);
        await saveMessage({
          from, text: text || '[image]', reply, timestamp: Date.now(),
          ...(mediaUrl ? { mediaUrl, mediaType: 'image' as const } : {}),
        });
        return;
      }

      // ── 2. Only handle text from here on ─────────────────────────────────
      if (msgType !== 'text') return;

      // ── 3. Brochure shortcut ─────────────────────────────────────────────
      if (wantsBrochure(text)) {
        const reply = 'Here is our complete Data Science & AI Bootcamp brochure! It covers the full curriculum, pricing, internship details, and instructor profiles. Let me know if you have any questions 😊';
        await sendWhatsAppDocument(from);
        await sendWhatsAppMessage(from, reply);
        await saveMessage({ from, text, reply, timestamp: Date.now(), mediaType: 'document' });
        return;
      }

      // ── 4. Enrollment intent ──────────────────────────────────────────────
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

      // ── 5. Normal Gemini flow ─────────────────────────────────────────────
      const recentMsgs = await getRecentMessagesByPhone(from, 10);

      if (contactProfile?.nameAsked && !contactProfile?.name && looksLikeName(text)) {
        await saveContactProfile({ phone: from, name: text.trim(), nameAsked: false });
      }

      const history: GeminiHistory = recentMsgs.flatMap(m => [
        ...(m.text && m.text !== '[image]' ? [{ role: 'user'  as const, parts: [{ text: m.text  }] }] : []),
        ...(m.reply                         ? [{ role: 'model' as const, parts: [{ text: m.reply }] }] : []),
      ]);

      let reply = await getAIReply(text, history);

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
