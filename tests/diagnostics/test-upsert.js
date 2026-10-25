/**
 * FILE: tests/diagnostics/test-upsert.js
 * PURPOSE:
 *   Diagnostic script to verify that `createSignedUploadUrl` supports `{ upsert: true }`
 *   on the `project_docs` Supabase Storage bucket for document uploads.
 *
 * HOW TO RUN:
 *   node --env-file=.env.local tests/diagnostics/test-upsert.js
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
  const { data, error } = await supabaseAdmin.storage
    .from("project_docs")
    .createSignedUploadUrl("test/foo.pdf", { upsert: true });

  if (error) {
    console.error("Signed upload URL generation error:", error);
  } else {
    console.log("Signed upload URL generation OK:", data);
  }
}

run();
