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
  saveDiscountRequest,
  type EnrollmentSession,
} from '@/lib/redis';
import { uploadScreenshotToDrive, appendEnrollmentRow, appendDiscountRow } from '@/lib/google';

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
  // Real names never start with an article/pronoun/negation ("a student", "the sender", "not sure")
  if (/^(a|an|the|not|no|so|very|really|just|still)\b/i.test(t)) return false;

  const NON_NAME_WORDS = /\b(tell|something|related|internship|course|bootcamp|fee|price|cost|timing|class|classes|recording|missed|register|enroll|payment|pay|bank|easypaisa|jazzcash|nayapay|account|iban|screenshot|receipt|hi|hello|hey|salam|aoa|okay|ok|yes|no|thanks|thank|what|how|when|where|why|is|are|can|could|would|please|about|kya|kab|kaisa|bata|mujhe|aur|aap|student|beginner|learner|teacher|professional|engineer|freelancer|developer|programmer|newbie|fresher|graduate|undergraduate|guy|man|boy|girl|person|worker|employee|kid|adult|parent|teenager|discount|afford|budget|scholarship|expensive|struggling|confused|sender|forward)\b/i;
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

// Gratitude — "thanks so much" must never be mistaken for a price complaint
function isGratitude(text: string): boolean {
  return /\b(thanks|thank\s?you|thankyou|thnx|tnx|shukriya|shukria|jazak|appreciate)\b/i.test(text);
}

// Explicit affordability / discount request — always fires, no context needed
function needsAffordabilityHelp(text: string): boolean {
  const t = text.toLowerCase();
  if (isGratitude(t)) return false;
  return (
    /too? (much|expensive|costly|high|pricey)/i.test(t) ||
    /(can.?t|cannot|can not|unable to|hard to|difficult to|struggling to)\s*afford/i.test(t) ||
    (/\bafford\b/i.test(t) && !/\b(can|could|will|able to)\s+afford\b/i.test(t)) ||
    /not affordable/i.test(t) ||
    /\bscholarship\b/i.test(t) ||
    /financial (help|support|issue|problem|hardship|constraint)/i.test(t) ||
    /\bfee (bari|barhi|zyada|ziada|kam|reduce)\b/i.test(t) ||
    /\bkoi discount\b/i.test(t) ||
    /discount (chahiye|dena|do|mil|de)/i.test(t) ||
    /i (want|need|require|wanna) (a |some )?discount/i.test(t) ||
    /give.{0,10}discount/i.test(t) ||
    /\bstudent (discount|rate|concession|deal|package)\b/i.test(t) ||
    /\bpersonal discount\b/i.test(t) ||
    /any (other |special |more )?discount/i.test(t) ||
    /out of (my )?budget/i.test(t) ||
    /\bbudget\b.{0,20}\b(low|tight|less|kam|short)\b/i.test(t)
  );
}

// Vague sticker-shock reaction ("that's so much", "expensive", "mehnga").
// Ambiguous on its own — only meaningful right after we quoted the fee.
function isPriceShockReaction(text: string): boolean {
  const t = text.toLowerCase();
  if (isGratitude(t)) return false;
  return (
    /\b(so|too|to|that|that'?s|it'?s|its|bohat|bahut|buhat|boht|bht|kaafi|kafi|itna|itni)\s*(much|expensive|costly|high|pricey|mehnga|mehanga|menga|zyada|ziada|zada)\b/i.test(t) ||
    /\b(expensive|costly|pricey|mehnga|mehanga|menga|unaffordable)\b/i.test(t) ||
    /\bthat'?s? (a lot|alot)\b/i.test(t) ||
    /\b(a lot|alot) of money\b/i.test(t) ||
    /\b(high|heavy|big)\s*fee\b/i.test(t) ||
    /\bfee\b.{0,15}\b(high|much|zyada|ziada|bari|barhi)\b/i.test(t)
  );
}

// True if the message is a B2B / vendor / partnership pitch rather than a student enquiry
function isBusinessPitch(text: string): boolean {
  const t = text.toLowerCase();

  // Strong single signals — a student would never write these
  const strongSignals = [
    /\b(appointment|meeting)\s+(request|invitation)\b/i,
    /\brequest(ing)?\s+a?\s*(meeting|appointment|demo|call)\b/i,
    /\b(sales|marketing|business development|bd)\s+(executive|manager|officer|representative|rep)\b/i,
    /\b(pvt\.?\s*ltd|private limited|\(pvt\)|llc|inc\.|technologies|solutions)\b.{0,40}\b(www\.|http)/i,
    /\bschedule a (meeting|call|demo)\b/i,
    /\b(partnership|collaboration|reseller|vendor|B2B)\s+(opportunity|proposal|inquiry|offer)\b/i,
    /\bwe (offer|provide|specialize in|are a)\b.{0,60}\b(company|agency|platform|solution|service)\b/i,
    /\bour (company|firm|agency|organization) (offers|provides|specializes)/i,
    /\bdear (sir|madam|sir\/madam)\b[\s\S]{0,200}\b(meeting|discuss|platform|product|service|proposal)/i,
  ];
  if (strongSignals.some(re => re.test(t))) return true;

  // Weaker signals — need at least two together to be confident
  const weakSignals = [
    /\bdear (sir|madam|team|concerned)\b/i,
    /\b(best|kind|warm) regards\b/i,
    /\bhope this (message|email|finds you)\b/i,
    /\bi am writing to\b/i,
    /\bwww\.\S+\.\w{2,}/i,
    /\b(our|this) (innovative |new )?(platform|product|solution|software|system|tool)\b/i,
    /\b(would like to|wish to) (discuss|introduce|present)\b/i,
    /\bat your (convenience|earliest)\b/i,
    /\blooking forward to (your|hearing)\b/i,
  ];
  return weakSignals.filter(re => re.test(t)).length >= 2;
}

// True if the user's own message is about money — required before treating
// Gemini's redirect reply as a discount escalation
function isMoneyContext(text: string): boolean {
  return /\b(fee|fees|price|pricing|cost|charge|payment|discount|afford|budget|scholarship|expensive|costly|money|rupees|rs\.?|paisa|mehnga|zyada)\b/i.test(text);
}

// User agreeing to have their discount request forwarded to management
function isAffirmative(text: string): boolean {
  const t = text.trim().toLowerCase();
  return /^(yes|yeah|yep|yup|sure|ok|okay|k|please|go ahead|do it|forward it|forward|send it|alright|fine|why not|haan|han|ji|ji haan|ji han|zaroor|bilkul|theek hai|thik hai|kar do|karo)\b/i.test(t);
}

// User declining the discount forward offer
function isNegative(text: string): boolean {
  const t = text.trim().toLowerCase();
  return /^(no|nah|nope|not now|never\s?mind|leave it|nahi|nai|chodo|rehnay do|rehne do)\b/i.test(t)
    || /\b(no thanks|not interested|don'?t bother)\b/i.test(t);
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

  // Prevent Gemini from adding its own enrollment nudge or assuming payment queries on pure greetings
  const enrollmentSystemPrompt = `${CORE_SYSTEM_PROMPT}\n\nIMPORTANT INSTRUCTIONS FOR IN-PROGRESS ENROLLMENT:
- If the user sends a simple greeting (e.g. "hi", "hello", "salam", "hey", "hi there"), greet them back naturally and ask how you can assist them today. Do NOT mention payment verification or enrollment status unless they explicitly ask about payment or receipt status.
- If the user asks a general question (curriculum, python, duration, timings, fee), answer their question directly and concisely.
- Do NOT append redundant reminders asking for name, email, or payment screenshots unless requested.`;

  switch (session.state) {

    case 'collecting_name': {
      // Image sent before name/email — upload to Drive for display only, redirect user
      if (msgType === 'image' && imageId) {
        try {
          const { buffer, mimeType } = await downloadWhatsAppMedia(imageId);
          const { fileId } = await uploadScreenshotToDrive(buffer, mimeType, from, Date.now());
          mediaUrl = fileId;
        } catch (err) {
          console.error('Drive upload failed (collecting_name):', err instanceof Error ? err.message : err);
        }
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
        try {
          const { buffer, mimeType } = await downloadWhatsAppMedia(imageId);
          const { fileId } = await uploadScreenshotToDrive(buffer, mimeType, from, Date.now());
          mediaUrl = fileId;
        } catch (err) {
          console.error('Drive upload failed (collecting_email):', err instanceof Error ? err.message : err);
        }
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
            buffer, mimeType, from, ts,
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
            buffer, mimeType, from, ts,
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
      if ((msgType === 'image' || msgType === 'document') && imageId) {
        // Upload for dashboard display only — image doesn't mean anything enrollment-wise here
        try {
          const { buffer, mimeType } = await downloadWhatsAppMedia(imageId);
          const { fileId } = await uploadScreenshotToDrive(buffer, mimeType, from, Date.now());
          mediaUrl = fileId;
        } catch (err) {
          console.error('Drive upload failed (approved):', err instanceof Error ? err.message : err);
        }
        reply = `Please type your question in text 😊`;
      } else if (msgType === 'text' && text.trim()) {
        reply = await getAIReply(text, history, CORE_SYSTEM_PROMPT);
      } else {
        reply = `Please type your question in text 😊`;
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
      // Accept any document as a potential payment screenshot — don't restrict by MIME/filename
      const imageId   = message.image?.id ?? message.document?.id;
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

      // ── 0b. Brochure shortcut — checked before enrollment so ALL users get the PDF ──
      if (msgType === 'text' && wantsBrochure(text)) {
        const reply = 'Here is our complete Data Science & AI Bootcamp brochure! It covers the full curriculum, pricing, internship details, and instructor profiles. Let me know if you have any questions 😊';
        let sentDoc = false;
        try {
          await sendWhatsAppDocument(from);
          sentDoc = true;
        } catch (err) {
          console.error('Failed to send brochure document:', err instanceof Error ? err.message : err);
        }
        await sendWhatsAppMessage(from, reply);
        await saveMessage({ from, text, reply, timestamp: Date.now(), ...(sentDoc ? { mediaType: 'document' as const } : {}) });
        return;
      }

      // Conversation context — fetched once and reused by every branch below
      const recentMsgs = msgType === 'text' ? await getRecentMessagesByPhone(from, 10) : [];

      // ── 0b2. Discount offer confirmation ─────────────────────────────────
      // We've asked "should I forward this to management?" — wait for a clear
      // yes/no before ever asking for name/email. Anything ambiguous (like a
      // question) gets a short answer and the offer repeated, not a name/email demand.
      if (msgType === 'text' && contactProfile?.discountOfferPending) {
        const existingName = contactProfile.discountCollectedName
          || (contactProfile.name && looksLikeName(contactProfile.name) ? contactProfile.name : null);

        let offerReply: string;

        if (isAffirmative(text)) {
          if (existingName) {
            offerReply = `Great, *${existingName}*! 🙌 Please share your *email address* so I can forward this to our management team.\n\nExample: _johndoe@gmail.com_`;
          } else {
            offerReply = `Great! 🙌 Please share your *full name* and *email address* so I can forward this to our management team.\n\nExample: _John Doe, johndoe@gmail.com_`;
          }
          await saveContactProfile({
            phone: from,
            discountOfferPending: false,
            discountPending: true,
            ...(existingName ? { discountCollectedName: existingName } : {}),
          });
        } else if (isNegative(text)) {
          offerReply = `No problem at all! 😊 Feel free to ask me anything else — curriculum, schedule, or enrollment.`;
          await saveContactProfile({ phone: from, discountOfferPending: false });
        } else {
          // Ambiguous / a question — answer briefly, then repeat the offer (never demand contact info here)
          offerReply = `Our management reviews each request individually and may be able to offer you a special discount. 😊\n\nWould you like me to forward your request to them? (yes/no)`;
        }

        await sendWhatsAppMessage(from, offerReply);
        await saveMessage({ from, text, reply: offerReply, timestamp: Date.now() });
        return;
      }

      // ── 0c. Discount collection state ────────────────────────────────────
      // Runs BEFORE the enrollment-session branch so it applies to every user,
      // including those with an existing (e.g. approved) enrollment session.
      if (msgType === 'text' && contactProfile?.discountPending) {
        const collectedName  = contactProfile.discountCollectedName;
        const collectedEmail = contactProfile.discountCollectedEmail;

        let finalName:  string | null = collectedName  ?? null;
        let finalEmail: string | null = collectedEmail ?? null;

        const { email: parsedEmail, name: parsedName } = extractEmailAndName(text);
        if (parsedEmail && !finalEmail) finalEmail = parsedEmail;
        if (parsedName && looksLikeName(parsedName) && !finalName) finalName = parsedName;
        // Raw text as name if short and looks like one
        if (!finalName && looksLikeName(text.trim())) finalName = text.trim();

        let discountReply: string;

        if (finalName && finalEmail) {
          const ts = Date.now();
          try {
            await saveDiscountRequest({ phone: from, name: finalName, email: finalEmail, message: contactProfile.discountOriginalMessage || text, timestamp: ts });
            await appendDiscountRow({ name: finalName, phone: from, email: finalEmail, message: contactProfile.discountOriginalMessage || text, timestamp: ts });
          } catch (err) {
            console.error('Failed to save discount request:', err instanceof Error ? err.message : err);
          }
          await saveContactProfile({ phone: from, name: finalName, discountPending: false });
          discountReply = `✅ Thank you, *${finalName}*! Your request has been forwarded to our management team. They'll reach out to you directly on this WhatsApp number shortly. 😊`;
        } else if (finalEmail && !finalName) {
          await saveContactProfile({ phone: from, discountCollectedEmail: finalEmail });
          discountReply = `Got your email! 😊 Could you also share your *full name*, please?\n\nExample: _John Doe_`;
        } else if (finalName && !finalEmail) {
          await saveContactProfile({ phone: from, name: finalName, discountCollectedName: finalName });
          discountReply = `Thanks *${finalName}*! 😊 Could you also share your *email address*?\n\nExample: _johndoe@gmail.com_`;
        } else {
          discountReply = `Please share your *full name* and *email address* so we can forward your request to the management team.\n\nExample: _John Doe, johndoe@gmail.com_`;
        }

        await sendWhatsAppMessage(from, discountReply);
        await saveMessage({ from, text, reply: discountReply, timestamp: Date.now() });
        return;
      }

      // ── 0d. B2B / vendor pitch — decline politely, never route into student flows ──
      if (msgType === 'text' && isBusinessPitch(text)) {
        const pitchReply = `Thank you for reaching out! 🙏\n\nWe're a student-focused training platform and don't take vendor or partnership meetings through this channel.\n\nFor business enquiries, please email *info@datacrumbs.org*.`;
        await sendWhatsAppMessage(from, pitchReply);
        await saveMessage({ from, text, reply: pitchReply, timestamp: Date.now() });
        return;
      }

      // ── 0e. Discount collection trigger ──────────────────────────────────
      // Fires when: (a) explicit affordability/discount request, OR
      //             (b) vague sticker-shock reaction right after we quoted the fee, OR
      //             (c) group discount already explained AND they're STILL asking about discount
      const lastTwoReplies = recentMsgs.slice(-2).map(m => m.reply || '').join(' ');
      const feeJustQuoted  = /7,?499|7499|per month|\/month|\bfee\b|\bprice\b/i.test(lastTwoReplies);

      const groupDiscountExplained = recentMsgs.some(m => m.reply && m.reply.includes('20%'));
      const stillAskingDiscount    = /\bdiscount\b/i.test(text);

      const shouldCollectDiscount =
        msgType === 'text' && (
          needsAffordabilityHelp(text) ||
          (feeJustQuoted && isPriceShockReaction(text)) ||
          (groupDiscountExplained && stillAskingDiscount)
        );

      if (shouldCollectDiscount) {
        const existingName = contactProfile?.name && looksLikeName(contactProfile.name) ? contactProfile.name : null;
        const groupDiscountNote = `By the way, we also offer a special *20% group discount* when 2+ students enroll together! 😊\n\n`;
        const greeting = existingName ? `I understand, *${existingName}*!` : `I understand your situation!`;
        const discountReply = `${greeting}\n\n${groupDiscountNote}I can forward your request to our management team — they sometimes offer a special discount based on individual circumstances.\n\nWould you like me to forward this to them? (yes/no)`;
        await saveContactProfile({
          phone: from,
          discountOfferPending: true,
          discountOriginalMessage: text,
          ...(existingName ? { discountCollectedName: existingName } : {}),
        });
        await sendWhatsAppMessage(from, discountReply);
        await saveMessage({ from, text, reply: discountReply, timestamp: Date.now() });
        return;
      }

      // ── 1. Active enrollment session ─────────────────────────────────────
      if (session) {
        const history: GeminiHistory = recentMsgs.flatMap(m => [
          ...(m.text && m.text !== '[image]' ? [{ role: 'user'  as const, parts: [{ text: m.text  }] }] : []),
          ...(m.reply                         ? [{ role: 'model' as const, parts: [{ text: m.reply }] }] : []),
        ]);

        const { reply, mediaUrl } = await runEnrollmentMachine(
          from, session, msgType, text, imageId, imageMime, history, explicitName,
        );
        await sendWhatsAppMessage(from, reply);
        const isMediaMsg = msgType === 'image' || msgType === 'document';
        await saveMessage({
          from,
          text: isMediaMsg ? '[image]' : text,
          reply,
          timestamp: Date.now(),
          ...(isMediaMsg ? { mediaType: 'image' as const, ...(mediaUrl ? { mediaUrl } : {}) } : {}),
        });
        return;
      }

      // ── 2. Save non-text messages so they appear in the dashboard ────────
      if (msgType !== 'text') {
        if (msgType === 'image' || msgType === 'document') {
          let mediaUrl: string | undefined;
          if (imageId) {
            try {
              const { buffer, mimeType } = await downloadWhatsAppMedia(imageId);
              const { fileId } = await uploadScreenshotToDrive(buffer, mimeType, from, Date.now());
              mediaUrl = fileId;
            } catch (err) {
              console.error('Drive upload failed (non-enrollment):', err instanceof Error ? err.message : err);
            }
          }
          const imgReply = 'Please type your question in text 😊';
          await sendWhatsAppMessage(from, imgReply);
          await saveMessage({
            from, text: '[image]', reply: imgReply, timestamp: Date.now(),
            mediaType: 'image',
            ...(mediaUrl ? { mediaUrl } : {}),
          });
        }
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

      // Backup: detect escalation phrasing in Gemini's reply.
      // Gated on the USER's message being about money — otherwise a plain redirect
      // to support (e.g. for an off-topic enquiry) would wrongly start the discount flow.
      const isEscalation =
        isMoneyContext(text) && (
          /noted.{0,30}request/i.test(reply) ||
          /forward.{0,30}(request|management)/i.test(reply) ||
          /management.{0,50}reach.{0,20}out/i.test(reply) ||
          /team.{0,50}will.{0,20}(reach|contact)/i.test(reply) ||
          /contact our support team/i.test(reply)
        );

      if (isEscalation) {
        const existingName = contactProfile?.name && looksLikeName(contactProfile.name) ? contactProfile.name : null;
        const greeting = existingName ? `I understand, *${existingName}*!` : `I understand your situation!`;
        reply = `${greeting} 😊 I can forward your request to our management team — they sometimes offer a special discount based on individual circumstances.\n\nWould you like me to forward this to them? (yes/no)`;
        await saveContactProfile({
          phone: from,
          discountOfferPending: true,
          discountOriginalMessage: text,
          ...(existingName ? { discountCollectedName: existingName } : {}),
        });
      }

      await sendWhatsAppMessage(from, reply);
      await saveMessage({ from, text, reply, timestamp: Date.now() });

    } catch (err: unknown) {
      console.error('Webhook error:', err instanceof Error ? err.message : err);
    }
  });

  return NextResponse.json({}, { status: 200 });
}
