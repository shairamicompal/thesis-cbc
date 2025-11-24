import express from 'express';
import morgan from 'morgan';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// CORS Handling
app.use((req, res, next) => {
  const allowedOrigin = process.env.FRONTEND_URL || 'https://hemasense.vercel.app/'; // Your frontend URL

  res.header('Access-Control-Allow-Origin', allowedOrigin); // Allow only frontend domain
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true'); // To allow cookies or authentication

  // Handle preflight request (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // Respond to preflight request
  }

  next();
});

app.use(express.json());
app.use(morgan('dev'));

// Supabase setup
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Groq and OpenAI API setup
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper function to strip unnecessary "think" tags
const stripThink = (t = '') => t.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

// Health check route
app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'cbc-server' });
});

// AI request handler (Groq or OpenAI)
app.post('/api/ask', async (req, res) => {
  try {
    const { provider, model, prompt } = req.body ?? {};

    if (!provider || !model || !prompt) {
      return res.status(400).json({ error: 'provider, model, and prompt are required' });
    }

    if (provider === 'groq') {
      if (!process.env.GROQ_API_KEY) {
        return res.status(500).json({ error: 'GROQ_API_KEY is not set on server' });
      }

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
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: 'OPENAI_API_KEY is not set on server' });
      }

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

    return res.status(400).json({ error: 'Unknown provider (use groq or openai)' });
  } catch (err) {
    console.error('❌ /api/ask error:', err);
    const msg = err?.response?.data?.error || err?.message || 'Upstream AI request failed';
    return res.status(500).json({ error: msg });
  }
});

// Fallback route for unsupported routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// Error handler for unexpected errors
app.use((err, _req, res, _next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
