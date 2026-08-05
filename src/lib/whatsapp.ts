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

function apiUrl(path: string) {
  return `https://graph.facebook.com/v25.0/${process.env.PHONE_NUMBER_ID}${path}`;
}

function headers() {
  return {
    Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

export async function sendWhatsAppMessage(to: string, text: string) {
  await axios.post(
    apiUrl('/messages'),
    { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } },
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

export async function sendWhatsAppDocument(to: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  await axios.post(
    apiUrl('/messages'),
    {
      messaging_product: 'whatsapp',
      to,
      type: 'document',
      document: {
        link: `${appUrl}/api/brochure`,
        filename: BROCHURE_FILENAME,
      },
    },
    { headers: headers() }
  );
}
