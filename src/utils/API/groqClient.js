// src/utils/API/groqClient.js
export async function callGroq({ prompt, model, apiBase = "" }) {
  // apiBase lets you override (e.g., VITE_API_BASE) but defaults to same-origin
  const res = await fetch(`${apiBase}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider: "groq", model, prompt }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Groq proxy failed with ${res.status}`);
  }
  const data = await res.json();
  if (data?.error) throw new Error(data.error);
  return data?.text ?? "(No content returned)";
}
