const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function run() {
  const testContent = Buffer.from('test file content');
  const { data, error } = await supabase.storage
    .from('project_docs')
    .upload(`test-diagnostic-${Date.now()}.txt`, testContent, {
      contentType: 'text/plain',
    });

  console.log("SERVICE KEY UPLOAD TEST — data:", data, "error:", error);
}

run();