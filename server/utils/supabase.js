import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in server/.env");
}

// Node/server client. No service_role here; just anon for public auth flows.
export const supabase = createClient(url, anon, {
  auth: {
    persistSession: false, // server side
  },
});
