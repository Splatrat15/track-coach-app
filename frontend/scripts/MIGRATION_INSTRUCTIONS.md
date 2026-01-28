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
