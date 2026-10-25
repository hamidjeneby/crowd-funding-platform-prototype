/**
 * FILE: tests/diagnostics/test-db.js
 * PURPOSE:
 *   Quick diagnostic to verify that the Supabase client can authenticate with
 *   SUPABASE_SERVICE_ROLE_KEY and read from `public.project_docs`.
 *
 * HOW TO RUN:
 *   node --env-file=.env.local tests/diagnostics/test-db.js
 */

const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabaseAdmin = createClient(url, key);

async function run() {
  const { data, error } = await supabaseAdmin.from("project_docs").select("*").limit(1);
  if (error) {
    console.error("Database connection error:", error);
  } else {
    console.log("Database connection OK. Sample row:", data);
  }
}

run();
