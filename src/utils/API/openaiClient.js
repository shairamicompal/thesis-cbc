// src/utils/API/openaiClient.js
export async function callOpenAI({ prompt, model, apiKey, baseUrl }) {
  const url = (baseUrl || "https://api.openai.com/v1") + "/chat/completions";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,               // e.g., "gpt-4o"
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
