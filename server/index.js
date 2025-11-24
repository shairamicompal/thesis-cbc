import express from 'express';
import morgan from 'morgan';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 8000;

// CORS handling
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Allow any origin or restrict to a specific domain
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // Respond to preflight request
  }

  next();
});

// Set up middleware
app.use(express.json());
app.use(morgan('dev'));

// Supabase setup
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[FATAL] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// AI keys setup
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

const getGroq = () => new Groq({ apiKey: GROQ_API_KEY });
const getOpenAI = () => new OpenAI({ apiKey: OPENAI_API_KEY });

// Strip unnecessary think tags
const stripThink = (t = '') => t.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

// Health check route
app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'cbc-server' });
});

// Auth signup route (example)
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, profile } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { ...profile, source: 'cbc-server' },
    });

    if (error) {
      return res.status(400).json({ error: error.message, code: error.status });
    }

    return res.status(201).json({ user: data.user });
  } catch (err) {
    console.error('❌ /api/auth/signup error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// AI proxy route for asking AI models
app.post('/api/ask', async (req, res) => {
  try {
    const { provider, model, prompt } = req.body ?? {};
    if (!provider || !model || !prompt) {
      return res.status(400).json({ error: 'provider, model, and prompt are required' });
    }

    if (provider === 'groq') {
      if (!GROQ_API_KEY) {
        return res.status(500).json({ error: 'GROQ_API_KEY is not set on server' });
      }
      const groq = getGroq();
      const resp = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: 'You are a careful hematology explainer. Be accurate and concise.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0,
      });
      const text = resp?.choices?.[0]?.message?.content?.trim() || '(No content returned)';
      return res.json({ text: stripThink(text) });
    }

    if (provider === 'openai') {
      if (!OPENAI_API_KEY) {
        return res.status(500).json({ error: 'OPENAI_API_KEY is not set on server' });
      }
      const openai = getOpenAI();
      const resp = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: 'You are a careful hematology explainer. Be accurate and concise.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0,
      });
      const text = resp?.choices?.[0]?.message?.content?.trim() || '(No content returned)';
      return res.json({ text: stripThink(text) });
    }

    return res.status(400).json({ error: 'Unknown provider (use \'groq\' or \'openai\')' });
  } catch (err) {
    console.error('❌ /api/ask error:', err?.response?.data || err);
    const msg = err?.response?.data?.error || err?.message || 'Upstream AI request failed';
    return res.status(500).json({ error: msg });
  }
});

// Fallbacks for unsupported routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

app.use((err, _req, res, _next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
