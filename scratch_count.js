require('dotenv').config({path: '.env'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { count } = await supabase.from('daily_records').select('*', { count: 'exact', head: true });
  console.log('Total rows:', count);
}
run();
