/**
 * One-off script to list what's in the Supabase database.
 * Run from frontend folder: node scripts/check-supabase.js
 */

const fs = require('fs');
const path = require('path');

// Load .env from frontend folder (script is in frontend/scripts/)
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

const tables = ['athletes', 'workouts', 'attendance_records', 'messages', 'board_messages', 'oyo_submissions'];

async function main() {
  console.log('Supabase project:', url);
  console.log('');
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.log(table + ':', 'Error –', error.message);
    } else {
      const count = Array.isArray(data) ? data.length : 0;
      console.log(table + ':', count, 'row(s)');
      if (count > 0) console.log(JSON.stringify(data, null, 2));
    }
    console.log('');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
