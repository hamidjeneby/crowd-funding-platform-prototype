const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabaseAdmin.storage.from("project_docs").createSignedUploadUrl("test/foo.pdf", { upsert: true });
  console.log(data, error);
}
run();
