require('dotenv').config();

const express = require('express');
const axios = require('axios');
const { getAIReply } = require('./gemini');
const { getHistory, addMessage } = require('./sessions');
const { initRAG, retrieveContext } = require('./rag');

const app = express();
app.use(express.json());

const WHATSAPP_TOKEN    = process.env.WHATSAPP_TOKEN;
const VERIFY_TOKEN      = process.env.VERIFY_TOKEN;
const PHONE_NUMBER_ID   = process.env.PHONE_NUMBER_ID;

const BROCHURE_URL      = 'https://whatsapp-chatbot-73774e9a81bd.herokuapp.com/brochure.pdf';
const BROCHURE_FILENAME = 'DataCrumbs-Bootcamp-Brochure.pdf';

// ─── Brochure Keyword Detection ───────────────────────────────────────────────
// Covers English + Roman Urdu phrases a prospective student would naturally type
const BROCHURE_KEYWORDS = [
  // English — direct requests
  'brochure', 'broucher', 'brocher', 'brochur', 'broshure', 'broshur',
  'pdf', 'pamphlet', 'flyer', 'prospectus',
  'send me details', 'share details', 'more details', 'more info',
  'course details', 'programme details', 'program details',
  'course outline', 'syllabus', 'course content', 'curriculum',
  'send me info', 'share info', 'detailed info',
  'what is included', "what's included",
  // English — internship specific (unique to this brochure)
  'internship', 'internship details', 'with internship',
  // Roman Urdu — common WhatsApp patterns
  'brochar', 'brouchar', 'brochar bhejo', 'broucher bhejo',
  'details bhejo', 'details send karo',
  'details chahiye', 'info chahiye', 'send karo',
  'course ka detail', 'programme ka detail', 'program ka detail',
  'zyada details', 'poori details', 'puri details',
  'kuch aur batao', 'aur info do', 'overview bhejo',
  'detail do', 'detail chahiye', 'full detail',
];

function wantsBrochure(text) {
  const lower = text.toLowerCase();
  // Direct keyword match
  if (BROCHURE_KEYWORDS.some(kw => lower.includes(kw))) return true;
  // Fuzzy match — catch any "broch" or "brouch" variant
  if (/bro[uo]?ch/.test(lower)) return true;
  return false;
}

// ─── Webhook Verification (Meta handshake) ───────────────────────────────────
app.get('/webhook', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified by Meta');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// ─── Incoming WhatsApp Messages ───────────────────────────────────────────────
app.post('/webhook', async (req, res) => {
  res.sendStatus(200);

  try {
    const entry   = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value   = changes?.value;

    if (!value?.messages) return;

    const message = value.messages[0];
    if (message.type !== 'text') return;

    const from = message.from;
    const text = message.text.body;

    console.log(`WhatsApp message from ${from}: ${text}`);

    // Send brochure immediately if user is asking for it
    if (wantsBrochure(text)) {
      await sendWhatsAppDocument(from);
      await sendWhatsAppMessage(from, 'Here is our complete Data Science & AI Bootcamp brochure! It covers the full curriculum, pricing, internship details, and instructor profiles. Let me know if you have any questions 😊');
      return;
    }

    const history = getHistory(from);
    addMessage(from, 'user', text);

    const context = await retrieveContext(text);
    const reply   = await getAIReply(text, history, context);

    addMessage(from, 'model', reply);
    await sendWhatsAppMessage(from, reply);

  } catch (error) {
    console.error('Webhook error:', error.message);
  }
});

// ─── Send WhatsApp Text Message ───────────────────────────────────────────────
async function sendWhatsAppMessage(to, text) {
  await axios.post(
    `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    },
    {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );
}

// ─── Send WhatsApp PDF Document ───────────────────────────────────────────────
async function sendWhatsAppDocument(to) {
  await axios.post(
    `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'document',
      document: {
        link: BROCHURE_URL,
        filename: BROCHURE_FILENAME,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );
}

// ─── TEST ONLY: Browser Chat Interface ───────────────────────────────────────
app.use(express.static('public'));

app.post('/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'No message provided' });

  try {
    const sessionId = 'browser-test';

    // Show brochure link in browser test mode
    if (wantsBrochure(message)) {
      return res.json({
        reply: `Here is our complete bootcamp brochure!\n\n📄 [Download Brochure](/brochure.pdf)\n\nIt covers the full curriculum, pricing (Rs 7,500/month), internship details, and instructor profiles. Let me know if you have any questions!`,
        brochure: true
      });
    }

    const history = getHistory(sessionId);
    addMessage(sessionId, 'user', message);

    const context = await retrieveContext(message);
    const reply   = await getAIReply(message, history, context);

    addMessage(sessionId, 'model', reply);
    res.json({ reply });

  } catch (error) {
    console.error('Chat error:', error.message);
    res.status(500).json({ error: 'Something went wrong. Check your API keys.' });
  }
});

// Re-index endpoint — call this after updating knowledge.js content
app.post('/reindex', async (req, res) => {
  try {
    const { clearIndex } = require('./pinecone');
    await clearIndex();
    await initRAG();
    res.json({ success: true, message: 'Knowledge base re-indexed successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// ─────────────────────────────────────────────────────────────────────────────

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/status', (req, res) => {
  res.send('DataCrumbs WhatsApp Bot is running.');
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

initRAG()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize RAG:', err.message);
    process.exit(1);
  });
