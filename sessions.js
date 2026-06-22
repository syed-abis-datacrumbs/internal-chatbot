// Stores conversation history per user (keyed by phone number)
// Each entry: { messages: [{role, parts}], lastActivity: timestamp }
const sessions = {};

const MAX_HISTORY = 10;       // max message pairs to remember
const SESSION_TTL = 60 * 60 * 1000; // 1 hour inactivity clears session

function getHistory(phone) {
  const session = sessions[phone];
  if (!session) return [];
  return [...session.messages]; // return a copy so mutations don't affect the caller
}

function addMessage(phone, role, text) {
  if (!sessions[phone]) {
    sessions[phone] = { messages: [], lastActivity: Date.now() };
  }

  sessions[phone].messages.push({ role, parts: [{ text }] });
  sessions[phone].lastActivity = Date.now();

  // Keep only last MAX_HISTORY messages to control token usage
  if (sessions[phone].messages.length > MAX_HISTORY * 2) {
    sessions[phone].messages = sessions[phone].messages.slice(-MAX_HISTORY * 2);
  }
}

function clearSession(phone) {
  delete sessions[phone];
}

// Purge sessions inactive for more than SESSION_TTL
function purgeExpired() {
  const now = Date.now();
  for (const phone in sessions) {
    if (now - sessions[phone].lastActivity > SESSION_TTL) {
      delete sessions[phone];
    }
  }
}

// Run cleanup every 30 minutes
setInterval(purgeExpired, 30 * 60 * 1000);

module.exports = { getHistory, addMessage, clearSession };
