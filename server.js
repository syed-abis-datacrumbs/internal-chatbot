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

// ─── Send WhatsApp Message ────────────────────────────────────────────────────
async function sendWhatsAppMessage(to, text) {
  await axios.post(
    `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
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

// ─── TEST ONLY: Browser Chat Interface ───────────────────────────────────────
app.use(express.static('public'));

app.post('/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'No message provided' });

  try {
    const sessionId = 'browser-test';
    const history   = getHistory(sessionId);
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
