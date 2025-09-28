// src/utils/aiClient.js
export async function callGroq({ prompt, model, apiKey }) {
  const baseUrl = "https://api.groq.com/openai/v1";
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "Be precise and concise. Use only provided reference ranges. Avoid diagnosis.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    let msg = txt;
    try { msg = JSON.parse(txt)?.error?.message || msg; } catch {}
    throw new Error(`Groq request failed (${res.status}): ${msg}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "(No content returned)";
}

export async function callOpenAI({ prompt, model, apiKey, baseUrl }) {
  const url = (baseUrl || "https://api.openai.com/v1") + "/chat/completions";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "Be precise and concise. Use only provided reference ranges. Avoid diagnosis.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    let msg = txt;
    try { msg = JSON.parse(txt)?.error?.message || msg; } catch {}
    throw new Error(`OpenAI request failed (${res.status}): ${msg}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "(No content returned)";
}

/**
 * getCBCInterpretation
 * provider: 'groq' | 'openai'
 */
export async function getCBCInterpretation({ provider, prompt, configs }) {
  if (provider === "groq") {
    const apiKey = configs?.groqKey;
    const model = configs?.groqModel || "deepseek-r1-distill-llama-70b";
    if (!apiKey) throw new Error("Missing GROQ API key");
    return callGroq({ prompt, model, apiKey });
  }

  if (provider === "openai") {
    const apiKey = configs?.openaiKey;
    const model = configs?.openaiModel || "gpt-4o-mini";
    const baseUrl = configs?.openaiBaseUrl || "https://api.openai.com/v1";
    if (!apiKey) throw new Error("Missing OPENAI API key");
    return callOpenAI({ prompt, model, apiKey, baseUrl });
  }

  throw new Error("Unknown provider");
}
