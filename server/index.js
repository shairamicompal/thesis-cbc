// server/index.js
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";
import OpenAI from "openai";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 8000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[FATAL] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

const getGroq = () => new Groq({ apiKey: GROQ_API_KEY });
const getOpenAI = () => new OpenAI({ apiKey: OPENAI_API_KEY });

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (_req, res) => res.json({ ok: true, service: "cbc-server" }));

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password, profile } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { ...profile, source: "cbc-server" },
    });
    if (error) return res.status(400).json({ error: error.message, code: error.status });
    return res.status(201).json({ user: data.user });
  } catch (err) {
    console.error("❌ /api/auth/signup error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* =========================================================================
   AI proxy route
===========================================================================*/
app.post("/api/ask", async (req, res) => {
  try {
    const { provider, model, prompt } = req.body ?? {};
    if (!provider || !model || !prompt) {
      return res.status(400).json({ error: "provider, model, and prompt are required" });
    }

    const stripThink = (t = "") =>
      t.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/^\s+|\s+$/g, "");

    if (provider === "groq") {
      if (!GROQ_API_KEY) return res.status(500).json({ error: "GROQ_API_KEY is not set on server" });
      const groq = getGroq();
      const resp = await groq.chat.completions.create({
        model,
        messages: [
          { role: "system", content: "You are a careful hematology explainer. Be accurate and concise." },
          { role: "user", content: prompt },
        ],
        temperature: 0,          // deterministic
        top_p: 1,
        // max_tokens: 1200,     // optional cap
        presence_penalty: 0,
        frequency_penalty: 0,
      });
      const text = resp?.choices?.[0]?.message?.content?.trim() || "(No content returned)";
      return res.json({ text: stripThink(text) });
    }

    if (provider === "openai") {
      if (!OPENAI_API_KEY) return res.status(500).json({ error: "OPENAI_API_KEY is not set on server" });
      const openai = getOpenAI();
      const resp = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: "You are a careful hematology explainer. Be accurate and concise." },
          { role: "user", content: prompt },
        ],
        temperature: 0,          // deterministic
        top_p: 1,
        // max_tokens: 1200,     // optional cap
        presence_penalty: 0,
        frequency_penalty: 0,
      });
      const text = resp?.choices?.[0]?.message?.content?.trim() || "(No content returned)";
      return res.json({ text: stripThink(text) });
    }

    return res.status(400).json({ error: "Unknown provider (use 'groq' or 'openai')" });
  } catch (err) {
    console.error("❌ /api/ask error:", err?.response?.data || err);
    const msg = err?.response?.data?.error || err?.message || "Upstream AI request failed";
    return res.status(500).json({ error: msg });
  }
});

app.use((req, res) => res.status(404).json({ error: "Not Found", path: req.path }));
app.use((err, _req, res, _next) => {
  console.error("❌ Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
