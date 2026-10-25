/**
 * FILE: tests/diagnostics/test-service-upload.js
 * PURPOSE:
 *   Diagnostic script to verify that `SUPABASE_SERVICE_KEY` has permission
 *   to upload binary/text files directly into the `project_docs` Supabase
 *   Storage bucket.
 *
 * HOW TO RUN:
 *   node --env-file=.env.local tests/diagnostics/test-service-upload.js
 */

const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  const testContent = Buffer.from("test file content for diagnostic upload");
  const filename = `test-diagnostic-${Date.now()}.txt`;

  const { data, error } = await supabase.storage
    .from("project_docs")
    .upload(filename, testContent, {
      contentType: "text/plain",
    });

  if (error) {
    console.error("SERVICE KEY UPLOAD TEST — FAILED:", error);
  } else {
    console.log("SERVICE KEY UPLOAD TEST — SUCCESS:", data);
  }
}

run();
