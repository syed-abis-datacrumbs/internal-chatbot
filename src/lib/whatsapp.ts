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
  'internship', 'internship details', 'with internship',
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

export async function sendWhatsAppDocument(to: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  await axios.post(
    apiUrl('/messages'),
    {
      messaging_product: 'whatsapp',
      to,
      type: 'document',
      document: {
        link: `${appUrl}/brochure.pdf`,
        filename: BROCHURE_FILENAME,
      },
    },
    { headers: headers() }
  );
}
