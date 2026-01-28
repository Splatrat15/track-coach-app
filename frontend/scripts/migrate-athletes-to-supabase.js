/**
 * Migration script to move athlete data from DEFAULT_ATHLETES to Supabase
 * Run from frontend folder: node scripts/migrate-athletes-to-supabase.js
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

// Default athletes data from athletes.ts
const DEFAULT_ATHLETES = [
  { id: 'athlete_1', firstName: 'Carter', lastName: 'Frisk', gender: 'male', rank: 'veteran', goal1600m: '4:20' },
  { id: 'athlete_2', firstName: 'Jesse', lastName: 'Hancock', gender: 'male', rank: 'veteran', goal1600m: '5:08' },
  { id: 'athlete_3', firstName: "La'a", lastName: 'Hancock', gender: 'male', rank: 'varsity', goal1600m: '4:13' },
  { id: 'athlete_4', firstName: 'Lydia', lastName: 'Leeman', gender: 'female', rank: 'varsity', goal1600m: '6:07' },
  { id: 'athlete_5', firstName: 'Ben', lastName: 'Leeman', gender: 'male', rank: 'veteran', goal1600m: '5:23' },
  { id: 'athlete_6', firstName: 'Luke', lastName: 'Littlefield', gender: 'male', rank: 'varsity', goal1600m: '4:05' },
  { id: 'athlete_7', firstName: 'Ethan', lastName: 'Magaron', gender: 'male', rank: 'rookie', goal1600m: '6:35' },
  { id: 'athlete_8', firstName: 'Nicolette', lastName: 'Magaron', gender: 'female', rank: 'veteran', goal1600m: '6:40' },
  { id: 'athlete_9', firstName: 'Bailey', lastName: 'Orr', gender: 'female', rank: 'veteran/varsity', goal1600m: '5:40' },
  { id: 'athlete_10', firstName: 'Jocelyn', lastName: 'Prather', gender: 'female', rank: 'veteran/varsity', goal1600m: '5:35' },
  { id: 'athlete_11', firstName: 'Evelyn', lastName: 'Shearer', gender: 'female', rank: 'rookie', goal1600m: '8:29' },
  { id: 'athlete_12', firstName: 'Peyton', lastName: 'Starke', gender: 'female', rank: 'veteran', goal1600m: '7:36' },
  { id: 'athlete_13', firstName: 'Robert', lastName: 'Thiel', gender: 'male', rank: 'varsity', goal1600m: '5:00' },
  { id: 'athlete_14', firstName: 'Caleb', lastName: 'Wheeler', gender: 'male', rank: 'veteran', goal1600m: '5:29' },
  { id: 'athlete_15', firstName: 'Bethany', lastName: 'Yaso', gender: 'female', rank: 'varsity', goal1600m: '6:29' },
];

async function main() {
  console.log('Migrating athletes to Supabase...');
  console.log('Supabase project:', url);
  console.log('');

  // Check if athletes table exists and has data
  const { data: existingAthletes, error: checkError } = await supabase.from('athletes').select('id');
  
  if (checkError) {
    console.error('Error checking athletes table:', checkError.message);
    console.error('');
    console.error('Make sure the athletes table exists in Supabase.');
    console.error('Run the SQL from: frontend/scripts/create-athletes-table.sql');
    console.error('Or copy/paste it into Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql');
    console.error('');
    console.error('SQL to run:');
    const fs = require('fs');
    const sqlPath = path.resolve(__dirname, 'create-athletes-table.sql');
    if (fs.existsSync(sqlPath)) {
      console.log(fs.readFileSync(sqlPath, 'utf8'));
    }
    process.exit(1);
  }

  if (existingAthletes && existingAthletes.length > 0) {
    console.log(`Found ${existingAthletes.length} existing athletes in database.`);
    console.log('Skipping migration - athletes already exist.');
    console.log('If you want to re-migrate, delete all athletes from Supabase first.');
    return;
  }

  // Prepare athletes with timestamps (Supabase expects ISO strings)
  // Use snake_case column names (PostgreSQL convention)
  const now = new Date().toISOString();
  const athletesToInsert = DEFAULT_ATHLETES.map(athlete => ({
    id: athlete.id,
    first_name: athlete.firstName,
    last_name: athlete.lastName,
    gender: athlete.gender,
    rank: athlete.rank,
    goal_1600m: athlete.goal1600m,
    created_at: now,
    updated_at: now,
  }));

  // Insert all athletes
  const { data, error } = await supabase.from('athletes').insert(athletesToInsert).select();

  if (error) {
    console.error('Error inserting athletes:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }

  console.log(`Successfully migrated ${data.length} athletes to Supabase!`);
  console.log('');
  console.log('Athletes inserted:');
  data.forEach(athlete => {
    console.log(`  - ${athlete.firstName} ${athlete.lastName} (${athlete.id})`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
