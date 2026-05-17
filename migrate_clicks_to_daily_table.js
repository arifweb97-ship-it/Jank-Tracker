const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=[\"']?(.*?)[\"']?(?:\n|$)/)[1].trim();
const supabaseKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=[\"']?(.*?)[\"']?(?:\n|$)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("🚀 Starting daily click summary migration (Paginated)...");

  // 1. Fetch pre-aggregated click records from daily_records in pages
  console.log("Reading existing aggregates from daily_records table...");
  const { count, error: countErr } = await supabase
    .from("daily_records")
    .select('*', { count: 'exact', head: true })
    .eq("category", "shopee_click")
    .like("source", "ANALYTICS_CLICK >>>%");

  if (countErr) {
    console.error("❌ Error counting aggregates:", countErr.message);
    return;
  }

  console.log(`Found a total of ${count} records to migrate.`);

  let allRecords = [];
  const pageSize = 1000;
  for (let i = 0; i < count; i += pageSize) {
    const { data: chunk, error: fetchErr } = await supabase
      .from("daily_records")
      .select("date, source, clicks, user_id")
      .eq("category", "shopee_click")
      .like("source", "ANALYTICS_CLICK >>>%")
      .range(i, i + pageSize - 1);

    if (fetchErr) {
      console.error(`❌ Error fetching chunk [${i}]:`, fetchErr.message);
      break;
    }
    allRecords = allRecords.concat(chunk || []);
  }

  console.log(`Successfully fetched ${allRecords.length} records from daily_records.`);

  if (allRecords.length === 0) {
    console.log("No records to migrate.");
    return;
  }

  // 2. Parse and format for shopee_clicks_daily
  const parsedRows = [];
  allRecords.forEach(r => {
    let source = "Others";
    let tag = "Untagged";
    
    if (r.source && r.source.startsWith("ANALYTICS_CLICK >>> ")) {
      const parts = r.source.split(" >>> ");
      if (parts.length >= 3) {
        source = parts[1];
        tag = parts[2];
      }
    }

    parsedRows.push({
      date: r.date,
      technical_source: source,
      tag_link: tag,
      clicks: r.clicks,
      user_id: r.user_id,
      created_at: new Date().toISOString()
    });
  });

  // 3. Clear existing shopee_clicks_daily table
  console.log("Clearing any existing shopee_clicks_daily records...");
  const { error: delErr } = await supabase
    .from("shopee_clicks_daily")
    .delete()
    .neq("user_id", "00000000-0000-0000-0000-000000000000"); // deletes all rows

  if (delErr) {
    console.error("❌ Error clearing shopee_clicks_daily:", delErr.message);
    return;
  }
  console.log("Table cleared.");

  // 4. Insert into shopee_clicks_daily
  console.log(`Inserting ${parsedRows.length} rows into shopee_clicks_daily...`);
  const batchSize = 200;
  let inserted = 0;

  for (let i = 0; i < parsedRows.length; i += batchSize) {
    const batch = parsedRows.slice(i, i + batchSize);
    const { error: insErr } = await supabase
      .from("shopee_clicks_daily")
      .insert(batch);

    if (insErr) {
      console.error(`❌ Error inserting batch [${i}]:`, insErr.message);
      break;
    }
    inserted += batch.length;
    console.log(`  Inserted: ${inserted}/${parsedRows.length} rows...`);
  }

  console.log("\n🏁 Daily click summary table migration completed successfully! 🎉");
}

run();
