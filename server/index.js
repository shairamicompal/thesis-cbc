// server/index.js
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 8000;

// --- Required env (never expose SERVICE_ROLE to frontend) ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // secret
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[FATAL] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// --- Middleware ---
app.use(cors({ origin: true, credentials: true }));
app.use(express.json()); // <-- ensures req.body is parsed as JSON
app.use(morgan("dev"));

// --- Health check ---
app.get("/", (_req, res) => res.json({ ok: true, service: "cbc-server" }));

// --- Auth: Admin-create user (appears in Supabase > Authentication > Users) ---
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password, profile } = req.body ?? {};
    console.log("🟢 /api/auth/signup body:", req.body);

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    // Create the user via Admin API (service role)
    // Set email_confirm to true for instant creation w/o email verification (useful in dev)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // set to false if you want email confirmation flow
      user_metadata: {
        ...profile,        // e.g., { firstname, lastname }
        source: "cbc-server",
      },
    });

    if (error) {
      // Forward Supabase error but keep JSON
      return res.status(400).json({ error: error.message, code: error.status });
    }

    // Optional: add the user to a "profiles" table (if you have one)
    // const { error: profErr } = await supabaseAdmin
    //   .from("profiles")
    //   .insert({ user_id: data.user.id, ...profile });
    // if (profErr) {
    //   return res.status(201).json({
    //     user: data.user,
    //     warning: "User created but profile insert failed",
    //     profile_error: profErr.message
    //   });
    // }

    return res.status(201).json({ user: data.user });
  } catch (err) {
    // Ensure we ALWAYS return JSON, never HTML
    console.error("❌ /api/auth/signup error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// --- 404 JSON fallback (prevents HTML error pages) ---
app.use((req, res) => {
  res.status(404).json({ error: "Not Found", path: req.path });
});

// --- Error handler that returns JSON ---
app.use((err, _req, res, _next) => {
  console.error("❌ Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
