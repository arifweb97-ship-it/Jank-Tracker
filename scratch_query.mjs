import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://cjgsduwhtcmmcxwxcbvu.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqZ3NkdXdodGNtbWN4d3hjYnZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTc0NDMsImV4cCI6MjA5MTIzMzQ0M30.9XkbYd4sw8umPvpR7bxah8wTX_-RvaOiI9VvyKVINmk";
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const adminId = '00000000-0000-0000-0000-000000000000';
  console.log(`Menghapus data nyasar di daily_records untuk admin_id: ${adminId}...`);
  
  const { data, error } = await supabase
    .from('daily_records')
    .delete()
    .eq('user_id', adminId);
    
  if (error) {
    console.error('Gagal menghapus data:', error);
  } else {
    console.log('✅ Berhasil! Data nyasar dari admin sudah dihapus dari database.');
  }
}

main();
