const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=[\"']?(.*?)[\"']?(?:\n|$)/)[1].trim();
const supabaseKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=[\"']?(.*?)[\"']?(?:\n|$)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // 1. Get all profiles
  const { data: profiles } = await supabase.from("profiles").select("*");
  console.log("Profiles in DB:", profiles);

  // 2. Get all access requests
  const { data: requests } = await supabase.from("access_requests").select("*");
  console.log("Access Requests in DB:", requests);
  
  // Combine all possible identity emails and IDs
  const identities = [];
  for (const p of profiles || []) {
    identities.push({ id: p.id, email: p.email, source: 'profile' });
  }
  for (const r of requests || []) {
    if (!identities.some(i => i.email === r.email)) {
      identities.push({ id: r.id, email: r.email, source: 'request' });
    }
  }

  // 3. Count clicks and daily records for each identity
  for (const ident of identities) {
    const { count: clickCount } = await supabase
      .from("shopee_clicks")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", ident.id);
      
    console.log(`Email: ${ident.email} (ID: ${ident.id}, Source: ${ident.source}) - Clicks count: ${clickCount}`);
    
    if (clickCount > 0) {
      const { data: clicksSample } = await supabase
        .from("shopee_clicks")
        .select("click_time, tag_link, technical_source")
        .eq("user_id", ident.id)
        .order("click_time", { ascending: false })
        .limit(5);
      console.log("Latest click samples:", clicksSample);

      // Let's count click dates grouping
      const { data: allClicks } = await supabase
        .from("shopee_clicks")
        .select("click_time")
        .eq("user_id", ident.id);

      const dates = {};
      allClicks.forEach(c => {
        if (!c.click_time) return;
        const d = c.click_time.split('T')[0];
        dates[d] = (dates[d] || 0) + 1;
      });
      console.log("Clicks distribution by date:", dates);
    }

    const { data: dailyRecords } = await supabase
      .from("daily_records")
      .select("date, category, source, clicks, orders, commission")
      .eq("user_id", ident.id)
      .eq("category", "shopee_click")
      .order("date", { ascending: false })
      .limit(10);
      
    console.log(`Daily records for ${ident.email}:`, dailyRecords);
  }
}

run();
