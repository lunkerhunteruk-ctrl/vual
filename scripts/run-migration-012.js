const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf-8');
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
});

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  const columns = [
    'contact_email TEXT',
    'contact_phone TEXT',
    'social_instagram TEXT',
    'social_twitter TEXT',
    'social_youtube TEXT',
    'social_line TEXT',
  ];

  for (const col of columns) {
    const name = col.split(' ')[0];
    // Check if column exists by trying to select it
    const { error } = await supabase.from('stores').select(name).limit(1);
    if (error && error.message.includes(name)) {
      console.log(`Column ${name} does not exist yet, needs migration via Supabase Dashboard SQL editor`);
    } else {
      console.log(`Column ${name}: OK`);
    }
  }
}

run();
