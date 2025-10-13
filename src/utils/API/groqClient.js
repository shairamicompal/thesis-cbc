// src/utils/API/groqClient.js
export async function callGroq({ prompt, model, apiKey }) {
  const baseUrl = "https://api.groq.com/openai/v1";

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,               // e.g., "qwen/qwen3-32b"
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
