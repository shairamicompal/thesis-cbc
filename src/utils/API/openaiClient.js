// src/utils/API/openaiClient.js
export async function callOpenAI({ prompt, model, apiBase = "" }) {
  const res = await fetch(`${apiBase}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider: "openai", model, prompt }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `OpenAI proxy failed with ${res.status}`);
  }
  const data = await res.json();
  if (data?.error) throw new Error(data.error);
  return data?.text ?? "(No content returned)";
}
