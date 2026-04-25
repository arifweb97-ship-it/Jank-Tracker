const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=[\"']?(.*?)[\"']?(?:\n|$)/)[1].trim();
const supabaseKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=[\"']?(.*?)[\"']?(?:\n|$)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
  console.log("Starting fetch...");
  let allClicks = [];
  let hasMore = true;
  let from = 0;
  const pageSize = 1000;
  
  while (hasMore) {
    console.log(`Fetching from ${from}...`);
    const { data, error } = await supabase
      .from("shopee_clicks")
      .select("tag_link, technical_source, click_time")
      .range(from, from + pageSize - 1);
      
    if (error) {
      console.error(error);
      break;
    }
    
    if (data && data.length > 0) {
      allClicks.push(...data);
      if (data.length < pageSize) hasMore = false;
      else from += pageSize;
    } else {
      hasMore = false;
    }
  }
  console.log(`Total clicks fetched: ${allClicks.length}`);
}

testFetch();
