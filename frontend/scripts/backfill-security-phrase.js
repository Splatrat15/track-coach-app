/**
 * Backfill security_phrase_hash for existing coaches using the default phrase.
 * Run once after adding the security_phrase_hash column: node scripts/backfill-security-phrase.js
 * Requires: npm install dotenv @supabase/supabase-js node-fetch (or use existing Supabase from frontend)
 *
 * Or run the SQL in add-security-phrase.sql (with pgcrypto) to backfill instead.
 */

const crypto = require('crypto');

function sha256Hex(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

const DEFAULT_PHRASE = 'DVTFNumber1';

async function main() {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey);
  const hash = sha256Hex(DEFAULT_PHRASE);
  const { data, error } = await supabase
    .from('coaches')
    .update({ security_phrase_hash: hash, updated_at: new Date().toISOString() })
    .is('security_phrase_hash', null)
    .select('id');
  if (error) {
    console.error('Backfill failed:', error);
    process.exit(1);
  }
  console.log('Backfilled security phrase for', data?.length ?? 0, 'coach(es).');
}

main();
