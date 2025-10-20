// src/utils/API/index.js
import { callGroq } from "./groqClient";
import { callOpenAI } from "./openaiClient";

// Optional: centralize API base if you ever deploy server separately
const API_BASE = import.meta.env.VITE_API_BASE || ""; // keep empty for Vite proxy

export async function getCBCInterpretation({ provider, model, prompt }) {
  if (provider === "groq") {
    return await callGroq({ prompt, model, apiBase: API_BASE });
  }
  if (provider === "openai") {
    return await callOpenAI({ prompt, model, apiBase: API_BASE });
  }
  throw new Error("Unknown provider (use 'groq' or 'openai').");
}
