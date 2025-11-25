import Groq from 'groq-sdk';
import OpenAI from 'openai';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const stripThink = (t = '') => t.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

export default async function handler(req, res) {
  // CORS headers - allow all origins for now
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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

    console.log('📩 Serverless function received:', { provider, model, promptLength: prompt?.length });

    if (!provider || !model || !prompt) {
      return res.status(400).json({ error: 'provider, model, and prompt are required' });
    }

    if (provider === 'groq') {
      if (!process.env.GROQ_API_KEY) {
        return res.status(500).json({ error: 'GROQ_API_KEY not set' });
      }

      console.log('🤖 Calling Groq API via serverless...');
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

      console.log('🤖 Calling OpenAI API via serverless...');
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
    console.error('❌ Serverless API error:', err);
    return res.status(500).json({ error: err?.message || 'Request failed' });
  }
}