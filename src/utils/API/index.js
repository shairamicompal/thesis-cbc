import { callGroq } from "./groqClient";
import { callOpenAI } from "./openaiClient";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export async function getCBCInterpretation({ provider, model, prompt }) {
  console.log('API_BASE:', API_BASE || '(using serverless functions)');

  if (provider === "groq") {
    return await callGroq({ prompt, model, apiBase: API_BASE });
  }

  if (provider === "openai") {
    return await callOpenAI({ prompt, model, apiBase: API_BASE });
  }

  throw new Error("Unknown provider (use 'groq' or 'openai').");
}
