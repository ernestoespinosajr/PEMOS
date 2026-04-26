---
name: query-tickets
description: "Query ticket status. Triggers: 'show tickets', 'status', 'what is pending', 'query tickets'"
---

# Query Tickets

## Purpose
Query and list PEMOS tickets from the vault.

## Workflow

### Step 1: List by Status
Glob for different statuses:
- `vault/tickets/tckt-*-pending.md`
- `vault/tickets/tckt-*-in-progress.md`
- `vault/tickets/tckt-*-completed.md`

### Step 2: Group and Present
- Group by status
- Show title, number, priority

### Step 3: Report Summary
- Total open tickets
- In-progress work
- Recently completed