export async function callOpenAI({ prompt, model, apiBase = "" }) {
  // If apiBase is empty, use relative path (serverless function on same domain)
  const url = apiBase ? `${apiBase}/api/ask` : '/api/ask';
  
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider: "openai", model, prompt })
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `OpenAI proxy failed with ${res.status}`);
  }
  
  const data = await res.json();
  if (data?.error) throw new Error(data.error);
  return data?.text ?? "(No content returned)";
}