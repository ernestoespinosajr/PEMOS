---
name: create-feature
description: "Create a new feature ticket. Triggers: 'new feature', 'add functionality', 'implement', 'build', 'we need'"
---

# Create Feature

## Purpose
Create a new feature request ticket for PEMOS.

## Workflow

### Step 1: Gather Requirements
Ask user:
- Feature description
- Why needed
- Expected behavior

### Step 2: Find Next Number
Glob for existing tickets, increment.

### Step 3: Create Ticket File
```markdown
---
title: {title}
type: feature
status: pending
priority: medium
created_at: {datetime}
---

## Description
{description}

## Requirements
- 

## Acceptance Criteria
- [ ] 
```

### Step 4: Confirm
- Report ticket number