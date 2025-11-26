import Groq from 'groq-sdk';
import OpenAI from 'openai';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const stripThink = (t = '') => t.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

export default async function handler(req, res) {
  const origin = req.headers.origin;

  // CORS headers - Allow Capacitor, Vercel, and localhost
  const allowedOrigins = [
    'capacitor://localhost',
    'http://localhost',
    'http://localhost:5173',
    'http://localhost:3000',
    'https://hemasense.vercel.app'
  ];

  const isAllowed = origin && (
    allowedOrigins.includes(origin) ||
    origin.includes('vercel.app') ||
    origin.startsWith('capacitor://')
  );

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // Fallback for Capacitor when origin is null/undefined
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { provider, model, prompt } = req.body ?? {};

    console.log('📩 Received request:', { provider, model, promptLength: prompt?.length, origin });

    if (!provider || !model || !prompt) {
      return res.status(400).json({ error: 'provider, model, and prompt are required' });
    }

    if (provider === 'groq') {
      if (!process.env.GROQ_API_KEY) {
        return res.status(500).json({ error: 'GROQ_API_KEY not set' });
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

      const text = resp?.choices?.[0]?.message?.content?.trim() || '(No content)';
      console.log('✅ Groq response received');
      return res.status(200).json({ text: stripThink(text) });
    }

    if (provider === 'openai') {
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: 'OPENAI_API_KEY not set' });
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

      const text = resp?.choices?.[0]?.message?.content?.trim() || '(No content)';
      console.log('✅ OpenAI response received');
      return res.status(200).json({ text: stripThink(text) });
    }

    return res.status(400).json({ error: 'Unknown provider' });
  } catch (err) {
    console.error('❌ API error:', err);
    return res.status(500).json({ error: err?.message || 'Request failed' });
  }
}