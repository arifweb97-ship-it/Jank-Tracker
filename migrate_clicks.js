const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=[\"']?(.*?)[\"']?(?:\n|$)/)[1].trim();
const supabaseKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=[\"']?(.*?)[\"']?(?:\n|$)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("🚀 Starting database click aggregation migration...");
  
  // 1. Fetch profiles and access requests to discover all user IDs
  const { data: profiles, error: profErr } = await supabase.from("profiles").select("*");
  if (profErr) {
    console.error("❌ Error fetching profiles:", profErr.message);
    return;
  }
  
  const { data: requests, error: reqErr } = await supabase.from("access_requests").select("*");
  if (reqErr) {
    console.error("❌ Error fetching access requests:", reqErr.message);
    return;
  }
  
  const identities = [];
  for (const p of profiles || []) {
    identities.push({ id: p.id, email: p.email, source: 'profile' });
  }
  for (const r of requests || []) {
    if (!identities.some(i => i.email === r.email)) {
      identities.push({ id: r.id, email: r.email, source: 'request' });
    }
  }
  
  console.log(`Found ${identities.length} unique user identities.`);
  
  for (const ident of identities) {
    console.log(`\n======================================================`);
    console.log(`👤 Processing user: ${ident.email} (${ident.id}) - Source: ${ident.source}`);
    
    // Get total click count for this user in shopee_clicks
    const { count: clickCount, error: countErr } = await supabase
      .from("shopee_clicks")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", ident.id);
      
    if (countErr) {
      console.error(`❌ Error counting clicks for ${ident.email}:`, countErr.message);
      continue;
    }
    
    console.log(`Total raw clicks in shopee_clicks table: ${clickCount}`);
    if (clickCount === 0) {
      console.log(`No clicks to migrate for this user.`);
      continue;
    }
    
    // 2. Fetch and aggregate all clicks in pages
    const MASTER_CLICKS = {}; // key: date|source|tag => count
    const pageSize = 5000;
    let fetched = 0;
    
    console.log(`Fetching raw clicks in batches of ${pageSize}...`);
    while (fetched < clickCount) {
      const { data: clicks, error: fetchErr } = await supabase
        .from("shopee_clicks")
        .select("click_time, technical_source, tag_link")
        .eq("user_id", ident.id)
        .range(fetched, fetched + pageSize - 1);
        
      if (fetchErr) {
        console.error(`❌ Error fetching clicks range [${fetched} - ${fetched + pageSize - 1}]:`, fetchErr.message);
        break;
      }
      
      if (!clicks || clicks.length === 0) {
        break;
      }
      
      // Process in-memory aggregation
      clicks.forEach(c => {
        if (!c.click_time) return;
        const d = c.click_time.split('T')[0];
        const source = c.technical_source || "Others";
        const tag = c.tag_link || "Untagged";
        
        const key = `${d}|${source}|${tag}`;
        MASTER_CLICKS[key] = (MASTER_CLICKS[key] || 0) + 1;
      });
      
      fetched += clicks.length;
      console.log(`  Progress: ${fetched}/${clickCount} clicks fetched and aggregated...`);
    }
    
    console.log(`Aggregation complete. Unique daily records generated: ${Object.keys(MASTER_CLICKS).length}`);
    
    // 3. Prepare click rows for daily_records
    const clickRows = [];
    Object.entries(MASTER_CLICKS).forEach(([key, count]) => {
      const [d, source, tag] = key.split('|');
      clickRows.push({
        date: d,
        category: "shopee_click",
        source: `ANALYTICS_CLICK >>> ${source} >>> ${tag}`,
        clicks: count,
        updated_at: new Date().toISOString(),
        user_id: ident.id
      });
    });
    
    if (clickRows.length === 0) {
      console.log(`No valid click rows after aggregation.`);
      continue;
    }
    
    // 4. Delete existing ANALYTICS_CLICK daily_records for this user
    console.log(`Deleting existing ANALYTICS_CLICK daily_records...`);
    const { error: delErr } = await supabase
      .from("daily_records")
      .delete()
      .eq("category", "shopee_click")
      .like("source", "ANALYTICS_CLICK >>>%")
      .eq("user_id", ident.id);
      
    if (delErr) {
      console.error(`❌ Error deleting old aggregated clicks:`, delErr.message);
      continue;
    }
    console.log(`Deleted successfully.`);
    
    // 5. Insert new daily_records in batches
    console.log(`Inserting ${clickRows.length} aggregated records into daily_records table...`);
    const insertBatchSize = 500;
    let inserted = 0;
    
    for (let i = 0; i < clickRows.length; i += insertBatchSize) {
      const batch = clickRows.slice(i, i + insertBatchSize);
      const { error: insErr } = await supabase
        .from("daily_records")
        .insert(batch);
        
      if (insErr) {
        console.error(`❌ Error inserting aggregated batch:`, insErr.message);
        break;
      }
      inserted += batch.length;
      console.log(`  Inserted: ${inserted}/${clickRows.length} records...`);
    }
    
    console.log(`✅ Success! Successfully migrated and consolidated clicks for ${ident.email}.`);
  }
  
  console.log("\n🏁 Click aggregation migration completed successfully for all users!");
}

run();
