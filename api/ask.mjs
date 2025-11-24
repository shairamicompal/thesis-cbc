import Groq from "groq-sdk";
import OpenAI from "openai";

const stripThink = (t = "") =>
  String(t || "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

export default async function handler(req, res) {
  // CORS: applies to ALL requests
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Preflight: If OPTIONS request, respond and exit
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Only POST is allowed for real work
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

  if (!GROQ_API_KEY && !OPENAI_API_KEY) {
    res
      .status(500)
      .json({ error: "No AI API keys are configured on server" });
    return;
  }

  const body =
    typeof req.body === "string"
      ? JSON.parse(req.body || "{}")
      : req.body || {};

  const { provider, model, prompt } = body ?? {};

  if (!provider || !model || !prompt) {
    res
      .status(400)
      .json({ error: "provider, model, and prompt are required" });
    return;
  }

  try {
    if (provider === "groq") {
      if (!GROQ_API_KEY) {
        res.status(500).json({ error: "GROQ_API_KEY is not set on server" });
        return;
      }

      const groq = new Groq({ apiKey: GROQ_API_KEY });
      const resp = await groq.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a careful hematology explainer. Be accurate and concise.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0,
      });

      const text =
        resp?.choices?.[0]?.message?.content?.trim() ||
        "(No content returned)";

      res.status(200).json({ text: stripThink(text) });
      return;
    }

    if (provider === "openai") {
      if (!OPENAI_API_KEY) {
        res
          .status(500)
          .json({ error: "OPENAI_API_KEY is not set on server" });
        return;
      }

      const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
      const resp = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a careful hematology explainer. Be accurate and concise.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0,
      });

      const text =
        resp?.choices?.[0]?.message?.content?.trim() ||
        "(No content returned)";

      res.status(200).json({ text: stripThink(text) });
      return;
    }

    res
      .status(400)
      .json({ error: "Unknown provider (use 'groq' or 'openai')" });
  } catch (err) {
    console.error("❌ /api/ask error:", err?.response?.data || err);
    const msg =
      err?.response?.data?.error ||
      err?.message ||
      "Upstream AI request failed";
    res.status(500).json({ error: msg });
  }
}
