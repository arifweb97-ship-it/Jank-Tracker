const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=[\"']?(.*?)[\"']?(?:\n|$)/)[1].trim();
const supabaseKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=[\"']?(.*?)[\"']?(?:\n|$)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function wipe() {
  const userId = "fddedcc3-e4d9-408f-aba7-d8db4b5ee116";
  console.log("Wiping clicks for user", userId);
  const { data, error } = await supabase
    .from("shopee_clicks")
    .delete()
    .eq("user_id", userId);
    
  if (error) {
    console.error("Failed to delete", error);
  } else {
    console.log("Deleted successfully!");
  }
}
wipe();
