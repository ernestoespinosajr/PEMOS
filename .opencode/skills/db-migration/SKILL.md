---
name: db-migration
description: "Create Supabase migration. Triggers: 'migration', 'schema change', 'add column', 'create table'"
---

# Database Migration

## Purpose
Create a Supabase/PostgreSQL migration for PEMOS.

## Workflow

### Step 1: Identify Change
- New table
- Column addition
- Function/trigger
- RLS policy

### Step 2: Generate SQL
Write migration SQL in `supabase/migrations/`:
```sql
-- Migration: {description}
-- Created: {datetime}

ALTER TABLE {table} ADD COLUMN {column} {type};
```

### Step 3: Apply to Local
```bash
npx supabase db reset
# or
npx supabase migration new {name}
```

### Step 4: Verify
- Check schema.sql updates
- Run local dev to verify

## Notes
- Always backup before migrations
- Test locally first