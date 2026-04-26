---
name: show-project-health
description: "Show project health. Triggers: 'project health', 'overview', 'dashboard', 'status', 'how is the project'"
---

# Show Project Health

## Purpose
Display an overview of PEMOS project status.

## Workflow

### Step 1: Check Git Status
- `git status` - Current branch, changes
- `git log --oneline -5` - Recent commits

### Step 2: List Components
- src/: Next.js frontend
- supabase/: Database
- scripts/: Utilities
- vault/: Tickets

### Step 3: Query Tickets
- Open tickets count
- In-progress count

### Step 4: Present Summary
- Recent activity
- Blockers/Issues