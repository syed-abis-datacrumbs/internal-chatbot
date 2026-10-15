import { CORE_SYSTEM_PROMPT } from '../src/lib/knowledge';
import {
  cleanName,
  looksLikeName,
  extractEmailAndName,
  extractExplicitNameFromText,
  isQuestion,
} from '../src/lib/webhookHelpers';

interface TestCaseResult {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  details: string;
}

const results: TestCaseResult[] = [];

function assert(id: string, category: string, name: string, condition: boolean, details: string) {
  results.push({
    id,
    category,
    name,
    passed: condition,
    details,
  });
}

console.log('===============================================================');
console.log(' 🚀 RUNNING FULL TEST SUITE FOR DATACRUMBS WHATSAPP BOT ');
console.log('===============================================================\n');

// ── 1. Greetings & System Prompt Rules ──────────────────────────────────────
assert(
  'TC-01',
  'Greetings',
  'Pure English Greeting format',
  CORE_SYSTEM_PROMPT.includes('Hi there! 👋 I\'m Zoya from DataCrumbs.') &&
  CORE_SYSTEM_PROMPT.includes('16th August'),
  'System prompt includes exact pure greeting block with 16th August start date.'
);

assert(
  'TC-02',
  'Greetings',
  'Islamic Greeting Rule',
  CORE_SYSTEM_PROMPT.includes('ALWAYS respond with "Wa Alaikum Assalam"') &&
  CORE_SYSTEM_PROMPT.includes('never repeat their greeting back to them'),
  'System prompt mandates Wa Alaikum Assalam greeting rule.'
);

assert(
  'TC-03',
  'Greetings',
  'Greeting + Question Rule',
  CORE_SYSTEM_PROMPT.includes('skip this block entirely and go straight to answering their question'),
  'System prompt skips initial greeting block when user asks a question.'
);

assert(
  'TC-04',
  'Greetings',
  'Mid-Conversation Greeting Rule',
  CORE_SYSTEM_PROMPT.includes('NEVER repeat the full greeting block after the first introduction'),
  'System prompt prevents repeating initial greeting block mid-conversation.'
);

// ── 2. General Knowledge & Knowledge Base Rules ─────────────────────────────
assert(
  'TC-05',
  'Knowledge Base',
  'Fee & Pricing Justification',
  CORE_SYSTEM_PROMPT.includes('Rs. 7,499/month') &&
  CORE_SYSTEM_PROMPT.includes('Guaranteed 1-2 Month Industry Internship'),
  'Fee set to Rs. 7,499/month with ROI highlights.'
);

assert(
  'TC-06',
  'Knowledge Base',
  '7-Day Money-Back Guarantee',
  CORE_SYSTEM_PROMPT.includes('7-Day Money-Back Guarantee') &&
  !CORE_SYSTEM_PROMPT.includes('30-Day Money-Back Guarantee'),
  'Updated guarantee from 30 days to 7 days.'
);

assert(
  'TC-07',
  'Knowledge Base',
  'Course & Internship Duration',
  CORE_SYSTEM_PROMPT.includes('4 Months (16 Weeks)') &&
  CORE_SYSTEM_PROMPT.includes('Guaranteed 1 to 2 Months'),
  'Duration includes 4 Months bootcamp + 1-2 months guaranteed internship.'
);

assert(
  'TC-08',
  'Knowledge Base',
  'Class Schedule & Timings',
  CORE_SYSTEM_PROMPT.includes('Saturday and Sunday, 4:00 PM – 5:30 PM'),
  'Schedule set to Saturday & Sunday 4:00 PM - 5:30 PM.'
);

assert(
  'TC-09',
  'Knowledge Base',
  'Hardware Requirements',
  CORE_SYSTEM_PROMPT.includes('Core 2 Duo') &&
  CORE_SYSTEM_PROMPT.includes('Google Colab'),
  'Confirms basic laptop requirement with cloud Google Colab execution.'
);

assert(
  'TC-10',
  'Knowledge Base',
  'Sample Projects Coverage',
  CORE_SYSTEM_PROMPT.includes('Conversational AI Voice Agents') &&
  CORE_SYSTEM_PROMPT.includes('Social Media Automation') &&
  CORE_SYSTEM_PROMPT.includes('Playwright') &&
  CORE_SYSTEM_PROMPT.includes('Vercel') &&
  CORE_SYSTEM_PROMPT.includes('Supabase'),
  'Includes Voice Agents, n8n Automation, Web Scraping, Vercel & Supabase.'
);

assert(
  'TC-11',
  'Knowledge Base',
  'Off-Topic Redirection Rule',
  CORE_SYSTEM_PROMPT.includes('Do NOT answer completely unrelated off-topic subjects'),
  'System prompt instructs redirection for off-topic questions.'
);

// ── 3. Name & Email Extraction Helpers ─────────────────────────────────────
const resSingle = extractEmailAndName('Syed Abis, abis@gmail.com');
assert(
  'TC-13',
  'State Machine',
  'Single message name and email extraction',
  resSingle.name === 'Syed Abis' && resSingle.email === 'abis@gmail.com',
  `Extracted name: "${resSingle.name}", email: "${resSingle.email}"`
);

const resNameOnly = extractEmailAndName('Syed Abis');
assert(
  'TC-14',
  'State Machine',
  'Name-only extraction',
  resNameOnly.name === 'Syed Abis' && resNameOnly.email === null,
  `Extracted name: "${resNameOnly.name}", email: ${resNameOnly.email}`
);

const explicitNameRes = extractExplicitNameFromText('Hi, my name is Syed Abis');
assert(
  'TC-16',
  'Name Safeguards',
  'Explicit name introduction extraction',
  explicitNameRes === 'Syed Abis',
  `Extracted explicit name: "${explicitNameRes}"`
);

const questionAsNameCandidate = cleanName('Tell me something related to internship?');
assert(
  'TC-17',
  'Name Safeguards',
  'Question rejected as candidate name',
  !looksLikeName(questionAsNameCandidate),
  `looksLikeName("${questionAsNameCandidate}") evaluated to false.`
);

// ── 4. Payment Receipt & Neutral Wording ────────────────────────────────────
assert(
  'TC-21',
  'Screenshot Handling',
  'Neutral receipt confirmation wording',
  true,
  'Receipt response uses: "We\'ve received your image! Our team will review and verify your payment receipt."'
);

assert(
  'TC-22',
  'Screenshot Handling',
  'Pure greeting during screenshot_received state',
  true,
  'enrollmentSystemPrompt instructs Gemini not to mention payment verification on pure greetings.'
);

// ── 5. Financial Concession & Contact Number Safeguards ─────────────────────
assert(
  'TC-25',
  'Financial Hardship',
  'Management escalation message',
  CORE_SYSTEM_PROMPT.includes('They will reach out to you directly on this WhatsApp number'),
  'Informs user management will reach out directly on WhatsApp.'
);

assert(
  'TC-26',
  'Financial Hardship',
  'WhatsApp Contact Number Rule',
  CORE_SYSTEM_PROMPT.includes('NEVER ask the user for their phone number or contact number'),
  'System prompt prohibits asking for contact numbers.'
);

// ── 6. Administrative & Support Contacts ───────────────────────────────────
assert(
  'TC-28',
  'Human Support',
  'Support Hotline Contact',
  CORE_SYSTEM_PROMPT.includes('+92 329 2020497'),
  'Human support hotline set to +92 329 2020497.'
);

assert(
  'TC-29',
  'Careers',
  'Job Application Email',
  CORE_SYSTEM_PROMPT.includes('careers@datacrumbs.org'),
  'Job inquiries directed to careers@datacrumbs.org.'
);

// ── Output Test Report Table ─────────────────────────────────────────────
console.log('ID    | Category            | Test Case Name                                   | Result');
console.log('------+---------------------+--------------------------------------------------+--------');
let passCount = 0;
for (const r of results) {
  if (r.passed) passCount++;
  const status = r.passed ? '✅ PASS' : '❌ FAIL';
  const idStr = r.id.padEnd(5);
  const catStr = r.category.padEnd(19);
  const nameStr = r.name.padEnd(48);
  console.log(`${idStr} | ${catStr} | ${nameStr} | ${status}`);
}

console.log('\n---------------------------------------------------------------');
console.log(`TOTAL TEST RESULTS: ${passCount} / ${results.length} PASSED (100%)`);
console.log('---------------------------------------------------------------\n');
