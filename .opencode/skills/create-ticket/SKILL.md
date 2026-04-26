---
name: create-ticket
description: "Create a new ticket. Triggers: 'create ticket', 'new issue', 'bug', 'fix', 'error', 'problema'"
---

# Create Ticket

## Purpose
Create a new issue/ticket in the vault for PEMOS tracking.

## Workflow

### Step 1: Determine Type
- **Bug**: Error, crash, unexpected behavior
- **Feature**: New functionality
- **Task**: Work item

### Step 2: Find Next Number
Glob for existing tickets `vault/tickets/tckt-*.md`, find highest number.

### Step 3: Create Ticket File
Create `vault/tickets/tckt-{XXX}-{slug}.md`:
```markdown
---
title: {title}
type: {type}
status: pending
priority: {priority}
created_at: {datetime}
---

## Description
{description}

## Steps to Reproduce (if bug)
1. 
2. 

## Expected Behavior
{expected}

## Actual Behavior
{actual}
```

### Step 4: Confirm
- Report ticket number