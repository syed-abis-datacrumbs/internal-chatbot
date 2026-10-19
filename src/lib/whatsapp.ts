import axios from 'axios';

const BROCHURE_FILENAME = 'DataCrumbs-Bootcamp-Brochure.pdf';

const BROCHURE_KEYWORDS = [
  'brochure', 'broucher', 'brocher', 'brochur', 'broshure', 'broshur',
  'pdf', 'pamphlet', 'flyer', 'prospectus',
  'send me details', 'share details', 'more details', 'more info',
  'course details', 'programme details', 'program details',
  'course outline', 'syllabus', 'course content', 'curriculum',
  'send me info', 'share info', 'detailed info',
  'what is included', "what's included",
  'brochar', 'brouchar', 'brochar bhejo', 'broucher bhejo',
  'details bhejo', 'details send karo',
  'details chahiye', 'info chahiye', 'send karo',
  'course ka detail', 'programme ka detail', 'program ka detail',
  'zyada details', 'poori details', 'puri details',
  'kuch aur batao', 'aur info do', 'overview bhejo',
  'detail do', 'detail chahiye', 'full detail',
];

export function wantsBrochure(text: string): boolean {
  const lower = text.toLowerCase();
  if (BROCHURE_KEYWORDS.some(kw => lower.includes(kw))) return true;
  if (/bro[uo]?ch/.test(lower)) return true;
  return false;
}

const ENROLLMENT_KEYWORDS = [
  'enroll', 'register', 'admission', 'join now', 'want to join',
  'i want to buy', 'wanna buy', 'want to purchase',
  'i want to pay', 'ready to pay', 'i wanna enroll',
  'enroll karna', 'join karna', 'register karna',
  'dakhila', 'sign up', 'signup',
  'how to enroll', 'how do i enroll', 'how can i join',
];

export function wantsEnrollment(text: string): boolean {
  const lower = text.toLowerCase();
  return ENROLLMENT_KEYWORDS.some(kw => lower.includes(kw));
}

const DEMO_KEYWORDS = [
  'demo class', 'demo session', 'demo lecture', 'demo lesson', 'trial class',
  'trial session', 'trial lecture', 'free class', 'free session', 'free demo',
  'sample class', 'sample session', 'sample lecture', 'any demo', 'demo dete',
  'demo dena', 'demo milta', 'trial dete', 'demo lena', 'demo class hai',
  'demo class offer', 'do you offer demo', 'offer demo', 'demo lu', 'demo lo',
];

export function wantsDemo(text: string): boolean {
  const lower = text.toLowerCase();
  if (DEMO_KEYWORDS.some(kw => lower.includes(kw))) return true;
  // "demo" alone paired with a class/lecture/session word nearby
  return /\bdemo\b/i.test(lower) && /\b(class|session|lecture|lesson)\b/i.test(lower);
}

function apiUrl(path: string, fromPhoneNumberId?: string) {
  const phoneId = fromPhoneNumberId || process.env.PHONE_NUMBER_ID;
  return `https://graph.facebook.com/v25.0/${phoneId}${path}`;
}

function headers() {
  return {
    Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Sanitizes markdown text specifically for WhatsApp mobile rendering:
 * - Converts ### headers into *bold titles*
 * - Removes --- horizontal lines
 * - Removes technical database UUIDs (e.g. Project ID: b33cabc0...)
 * - Converts markdown list asterisks (* or -) into clean bullet symbols (•)
 * - Converts double asterisks (**bold**) into WhatsApp single asterisks (*bold*)
 */
export function formatForWhatsApp(text: string): string {
  if (!text) return '';
  let cleaned = text;

  // 1. Remove markdown horizontal lines (---, ***, ___)
  cleaned = cleaned.replace(/^[ \t]*[-*_]{3,}[ \t]*$/gm, '');

  // 2. Remove internal Project IDs / UUIDs (users don't need technical database UUIDs)
  cleaned = cleaned.replace(/^[ \t]*[*•-]?\s*\*?Project ID\*?:?\s*[a-f0-9-]{10,}\s*$/gmi, '');

  // 3. Convert markdown headers (### Title, ## Title) to bold text (*Title*)
  cleaned = cleaned.replace(/^[ \t]*#{1,6}[ \t]+(.*)$/gm, (_m, header) => `*${header.trim()}*`);

  // 4. Collapse any combination of leading bullets, asterisks, dashes, or dots into a SINGLE clean bullet
  // e.g. "  * • ", "• • ", "· · ", "- • ", "• - " -> "• "
  cleaned = cleaned.replace(/^[ \t]*([*+•·-][ \t]*)+/gm, '• ');

  // 5. Also collapse any remaining consecutive bullets or dots within lines
  cleaned = cleaned.replace(/[•·][ \t]*[•·]+/g, '•');

  // 6. Convert markdown double/triple asterisks (**bold**) to WhatsApp single asterisk (*bold*)
  cleaned = cleaned.replace(/\*{2,}/g, '*');

  // 7. Clean up excessive blank lines (more than 2 consecutive newlines)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

export async function sendWhatsAppMessage(to: string, text: string, fromPhoneNumberId?: string) {
  const formattedText = formatForWhatsApp(text);
  await axios.post(
    apiUrl('/messages', fromPhoneNumberId),
    { messaging_product: 'whatsapp', to, type: 'text', text: { body: formattedText } },
    { headers: headers() }
  );
}

export async function downloadWhatsAppMedia(
  mediaId: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  // Step 1: get the temporary download URL
  const meta = await axios.get(
    `https://graph.facebook.com/v25.0/${mediaId}`,
    { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } },
  );
  const { url, mime_type } = meta.data as { url: string; mime_type: string };

  // Step 2: download the raw bytes
  const res = await axios.get<ArrayBuffer>(url, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
    responseType: 'arraybuffer',
  });

  return { buffer: Buffer.from(res.data), mimeType: mime_type };
}

export async function sendWhatsAppDocument(
  to: string,
  docLink?: string,
  filename?: string,
  fromPhoneNumberId?: string,
) {
  const brochureLink = docLink || 'https://agent.datacrumbs.org/brochure.pdf';
  const fname = filename || BROCHURE_FILENAME;
  console.log('[brochure] sending link:', brochureLink, 'from phone:', fromPhoneNumberId || process.env.PHONE_NUMBER_ID);
  try {
    await axios.post(
      apiUrl('/messages', fromPhoneNumberId),
      {
        messaging_product: 'whatsapp',
        to,
        type: 'document',
        document: { link: brochureLink, filename: fname },
      },
      { headers: headers() }
    );
    console.log('[brochure] document message accepted by WhatsApp API');
  } catch (err: unknown) {
    const axErr = err as { response?: { status?: number; data?: unknown }; message?: string };
    console.error('[brochure] WhatsApp API rejected:', JSON.stringify(axErr?.response?.data ?? axErr?.message ?? err));
    throw err;
  }
}
