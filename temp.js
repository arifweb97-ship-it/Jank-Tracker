const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=[\"']?(.*?)[\"']?(?:\n|$)/)[1].trim();
const supabaseKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=[\"']?(.*?)[\"']?(?:\n|$)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);
supabase.from('daily_records').select('user_id').limit(1).then(res => console.log(JSON.stringify(res, null, 2)));
