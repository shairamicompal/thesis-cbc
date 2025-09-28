// src/utils/groq.js
function stripThink(text = '') {
  if (!text) return ''
  // If a closing tag exists, keep only what comes AFTER it
  if (text.includes('</think>')) {
    text = text.split('</think>').pop()
  }
  // Remove any remaining <think>...</think> blocks (defensive)
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '')
  // Optionally remove "Reasoning:" headers
  text = text.replace(/^\s*(?:reasoning|thoughts?)\s*:\s*.*?\n{2,}/i, '')
  return text.trim()
}

export async function getCBCInterpretation(prompt) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  const model = import.meta.env.VITE_GROQ_MODEL || 'deepseek-r1-distill-llama-70b'

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      messages: [
        {
          role: 'system',
          content:
            'You are a careful hematology assistant. Explain CBC results clearly for non-experts. ' +
            'Avoid diagnosis and include a safety note. Do NOT include <think> or internal reasoning.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    console.error('Groq API error:', errorText)
    throw new Error(errorText || 'Failed to get AI interpretation.')
  }

  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content ?? '(No content returned)'
  return stripThink(raw)
}
