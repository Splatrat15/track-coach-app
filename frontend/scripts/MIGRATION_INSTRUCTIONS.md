# Athletes Migration to Supabase

## Step 1: Create the Database Table

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to SQL Editor: https://supabase.com/dashboard/project/_/sql
4. Copy and paste the contents of `create-athletes-table.sql`
5. Click "Run" to execute the SQL

This creates the `athletes` table with the correct schema.

## Step 2: Migrate the Data

Run the migration script to insert all athlete data:

```bash
cd frontend
node scripts/migrate-athletes-to-supabase.js
```

This will:
- Check if athletes already exist (skip if they do)
- Insert all 15 default athletes into Supabase
- Show a confirmation message

## Step 3: Verify Migration

You can verify the data was migrated by running:

```bash
node scripts/check-supabase.js
```

You should see 15 athletes listed.

## What Changed

- ✅ `athletes.ts` now uses Supabase instead of AsyncStorage
- ✅ All athlete CRUD operations (add, update, delete) sync with Supabase
- ✅ Athletes are loaded from Supabase on app initialization
- ✅ Attendance records still use AsyncStorage (local only)
- ✅ All existing function signatures remain the same - no code changes needed elsewhere

## Notes

- The migration script is idempotent - it won't duplicate data if run multiple times
- If you need to reset, delete all rows from the `athletes` table in Supabase, then re-run the migration
- The app will automatically load athletes from Supabase when it starts

---

# Workouts Migration to Supabase

## Create the Database Tables

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to SQL Editor: https://supabase.com/dashboard/project/_/sql
4. Copy and paste the contents of `create-workouts-tables.sql`
5. Click "Run" to execute the SQL

This creates:

- **workouts** – one row per workout (date, name, workout type, location, is OYO, athlete IDs, etc.)
- **workout_exercises** – warm-up, main workout, and post-workout exercises for each workout (linked by `workout_id`)

## What Changed

- Workouts, exercises, and location are now stored in Supabase instead of AsyncStorage.
- Location is stored on each workout row (`location`, `is_oyo`). “Location for date” is derived from the first workout on that date.
- Warm-up and other exercises are stored in `workout_exercises` and loaded with each workout.
- The app loads workouts in the 3-week window from Supabase on init and when the workout tab is focused.
- `data/locations.ts` now delegates to workouts (location comes from the database).
