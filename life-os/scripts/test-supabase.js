const fs = require('fs');
(async () => {
  try {
    // load .env.local if exists
    const envPath = './.env.local';
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\n/).forEach((line) => {
        const m = line.match(/^([^=]+)=(.*)$/);
        if (m) {
          const key = m[1].trim();
          let val = m[2].trim();
          // remove surrounding quotes
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          process.env[key] = val;
        }
      });
    }

    const { createClient } = require('@supabase/supabase-js');
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
      process.exit(2);
    }

    const supabase = createClient(url, key);

    console.log('Supabase client created. Fetching one habit...');
    const { data, error } = await supabase.from('habits').select('*').limit(1).throwOnError();
    if (error) {
      console.error('Query error:', error);
      process.exit(3);
    }
    console.log('Result:', data);
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
