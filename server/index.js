import express from 'express';
import morgan from 'morgan';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// CORS Handling - WITH CAPACITOR SUPPORT
app.use((req, res, next) => {
  const origin = req.headers.origin;

  const allowedOrigins = [
    'capacitor://localhost',
    'http://localhost',
    'https://hemasense.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8000'
  ];

  // Allow Capacitor and Vercel origins
  const isAllowed = origin && (
    allowedOrigins.includes(origin) ||
    origin.includes('vercel.app') ||
    origin.startsWith('capacitor://')
  );

  if (isAllowed) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // Capacitor sometimes doesn't send origin header
    res.header('Access-Control-Allow-Origin', '*');
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

app.use(express.json());
app.use(morgan('dev'));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const stripThink = (t = '') => t.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'cbc-server', timestamp: new Date().toISOString() });
});

app.post('/api/ask', async (req, res) => {
  try {
    const { provider, model, prompt } = req.body ?? {};

    console.log('📩 Received request:', { provider, model, promptLength: prompt?.length, origin: req.headers.origin });

    if (!provider || !model || !prompt) {
      return res.status(400).json({ error: 'provider, model, and prompt are required' });
    }

    if (provider === 'groq') {
      if (!process.env.GROQ_API_KEY) {
        return res.status(500).json({ error: 'GROQ_API_KEY is not set on server' });
      }

      console.log('🤖 Calling Groq API...');
      const resp = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: 'You are a careful hematology explainer. Be accurate and concise.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0,
      });

      const text = resp?.choices?.[0]?.message?.content?.trim() || '(No content returned)';
      console.log('✅ Groq response received');
      return res.json({ text: stripThink(text) });
    }

    if (provider === 'openai') {
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: 'OPENAI_API_KEY is not set on server' });
      }

      console.log('🤖 Calling OpenAI API...');
      const resp = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: 'You are a careful hematology explainer. Be accurate and concise.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0,
      });

      const text = resp?.choices?.[0]?.message?.content?.trim() || '(No content returned)';
      console.log('✅ OpenAI response received');
      return res.json({ text: stripThink(text) });
    }

    return res.status(400).json({ error: 'Unknown provider (use groq or openai)' });
  } catch (err) {
    console.error('❌ /api/ask error:', err);
    const msg = err?.response?.data?.error || err?.message || 'Upstream AI request failed';
    return res.status(500).json({ error: msg });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

app.use((err, _req, res, _next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});