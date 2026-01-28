/**
 * Check the structure of the athletes table
 * Run from frontend folder: node scripts/check-table-structure.js
 */

const fs = require('fs');
const path = require('path');

// Load .env from frontend folder
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf8');
  env.split(/\r?\n/).forEach((line) => {
    const trimmed = line.replace(/\r$/, '').trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    process.env[key] = val;
  });
}

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key);

async function main() {
  console.log('Checking athletes table structure...');
  console.log('Supabase project:', url);
  console.log('');

  // Try to get table info by querying information_schema
  // Since we can't directly query information_schema via Supabase client,
  // let's try inserting a test record to see what error we get
  
  const testId = 'test_check_' + Date.now();
  
  // Try with TEXT id
  const { error: error1 } = await supabase
    .from('athletes')
    .insert({
      id: testId,
      first_name: 'Test',
      last_name: 'User',
    })
    .select();

  if (!error1) {
    console.log('✅ Table accepts TEXT ids');
    // Clean up test record
    await supabase.from('athletes').delete().eq('id', testId);
  } else {
    console.log('❌ Error with TEXT id:', error1.message);
    if (error1.message.includes('uuid')) {
      console.log('');
      console.log('⚠️  Your table uses UUID for id column, but we need TEXT.');
      console.log('Run this SQL in Supabase SQL Editor to fix it:');
      console.log('');
      console.log('DROP TABLE IF EXISTS public.athletes CASCADE;');
      console.log('');
      const sqlPath = path.resolve(__dirname, 'create-athletes-table.sql');
      if (fs.existsSync(sqlPath)) {
        console.log(fs.readFileSync(sqlPath, 'utf8'));
      }
    }
  }

  // Check what columns exist by trying to select
  const { data, error: selectError } = await supabase
    .from('athletes')
    .select('*')
    .limit(0);

  if (selectError) {
    console.log('');
    console.log('Error selecting from table:', selectError.message);
  } else {
    console.log('');
    console.log('✅ Table exists and is accessible');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
