// src/utils/API/index.js
import { callGroq } from "./groqClient";
import { callOpenAI } from "./openaiClient";

/**
 * getCBCInterpretation
 * provider: 'groq' | 'openai'
 */
export async function getCBCInterpretation({ provider, prompt, configs }) {
  if (provider === "groq") {
    const apiKey = configs?.groqKey;
    const model = configs?.groqModel || "qwen/qwen3-32b";
    if (!apiKey) throw new Error("Missing GROQ API key");
    return callGroq({ prompt, model, apiKey });
  }

  if (provider === "openai") {
    const apiKey = configs?.openaiKey;
    const model = configs?.openaiModel || "gpt-4o";
    const baseUrl = configs?.openaiBaseUrl || "https://api.openai.com/v1";
    if (!apiKey) throw new Error("Missing OPENAI API key");
    return callOpenAI({ prompt, model, apiKey, baseUrl });
  }

  throw new Error("Unknown provider");
}

// Optional: also export raw callers if you want to use them directly elsewhere
export { callGroq, callOpenAI };
