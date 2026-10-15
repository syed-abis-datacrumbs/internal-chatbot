export const EMAIL_RE = /[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+/;

// Strip common preamble phrases so "My name is John" → "John"
export function cleanName(raw: string): string {
  return raw
    .replace(/\b(my name is|i am|i'm|name is|call me|and my email is|and email is|my email is|email address is|email id is|email is|email:)\b/gi, '')
    .replace(/@\S*/g, '')   // remove stray @fragments
    .replace(EMAIL_RE, '')  // remove any leftover email fragment
    // Strip leftover connector/filler words phrase-stripping can leave dangling
    // (e.g. "and my" from "...and my email is..." when only "email is" matched)
    .replace(/\b(and|my|is|the|also|email|address|mail|id)\b/gi, '')
    .replace(/[,;|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function looksLikeName(text: string): boolean {
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

export function extractEmailAndName(text: string): { email: string | null; name: string | null } {
  const emailMatch = text.match(EMAIL_RE);
  const email = emailMatch ? emailMatch[0].toLowerCase() : null;
  const nameCandidate = cleanName(text.replace(EMAIL_RE, ''));
  const name = looksLikeName(nameCandidate) ? nameCandidate : null;
  return { email, name };
}

// Extract explicit name introduced in conversation ("my name is Syed Abis", "I am Syed Abis")
export function extractExplicitNameFromText(text: string): string | null {
  if (!text || text.length > 100) return null;
  const match = text.match(/\b(?:my name is|i am|i'm|call me|name is)\s+([A-Za-z\s]{2,35})/i);
  if (match) {
    const candidate = cleanName(match[1]);
    if (looksLikeName(candidate)) return candidate;
  }
  return null;
}

// True if the message looks like a question the AI should answer
export function isQuestion(text: string): boolean {
  if (text.trim().endsWith('?')) return true;
  const questionWords = /\b(what|how|when|where|why|tell|is|are|do|can|could|would|please|about|kya|kab|kaisa|bata|mujhe|fee|timing|course|duration|internship)\b/i;
  return questionWords.test(text);
}
