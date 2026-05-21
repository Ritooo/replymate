require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');

const app = express();
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'replymate123';
const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const IG_BUSINESS_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
const APP_SECRET = process.env.APP_SECRET;

const PLATFORM = process.env.PLATFORM || 'instagram';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

const SYSTEM_PROMPT = `Sen ReplyMate test asistanısın.
Türkçe, kısa ve nazik cevap ver.`;

// -- Routes ----------------------------------------------------------------

app.get('/test', (_req, res) => {
  res.send('Sunucu çalışıyor');
});

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook doğrulandı');
    return res.send(challenge);
  }
  res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
  res.sendStatus(200); // Meta hemen yanıt ister

  try {
    const entries = req.body?.entry || [];
    for (const entry of entries) {
      for (const change of entry.messaging || []) {
        const msg = change.message;
        if (!msg || !msg.text) continue;

        const senderId = change.sender?.id;
        if (!senderId) continue;

        const userMessage = msg.text;

        const reply = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 300,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userMessage }],
        });

        const replyText = reply.content[0]?.text || 'Mesajını aldım.';

        await sendMessage(senderId, replyText);
      }
    }
  } catch (err) {
    console.error('Webhook hatası:', err.message);
  }
});

app.get('/auth/callback', (req, res) => {
  const { code, state } = req.query;
  console.log('OAuth callback:', { code, state });
  res.send('OAuth callback alındı');
});

// -- Helpers ---------------------------------------------------------------

async function sendMessage(recipientId, text) {
  if (PLATFORM === 'messenger') {
    return sendMessengerMessage(recipientId, text);
  }
  return sendIGMessage(recipientId, text);
}

async function sendMessengerMessage(recipientId, text) {
  try {
    await axios.post(
      'https://graph.facebook.com/v18.0/me/messages',
      {
        recipient: { id: recipientId },
        message: { text },
      },
      {
        headers: { Authorization: `Bearer ${PAGE_ACCESS_TOKEN}` },
      }
    );
  } catch (err) {
    console.error('sendMessengerMessage hatası:', err.response?.data || err.message);
    throw err;
  }
}

async function sendIGMessage(recipientId, text) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/${IG_BUSINESS_ID}/messages`,
      {
        recipient: { id: recipientId },
        message: { text },
      },
      {
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      }
    );
  } catch (err) {
    console.error('sendIGMessage hatası:', err.response?.data || err.message);
    throw err;
  }
}

// -- Start -----------------------------------------------------------------

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor`);
});
