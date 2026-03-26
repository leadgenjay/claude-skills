# Note Templates

Copy-paste templates for each KB note category. Replace bracketed values.

---

## Business / Offer Note

```markdown
---
title: "[Offer Name]"
tags:
  - business
  - offer
  - [project-name]
created: [YYYY-MM-DD]
updated: [YYYY-MM-DD]
source: "[project-name]"
source_files:
  - "CLAUDE.md"
---

# [Offer Name]

[One-sentence description of what this offer is.]

## Overview

| Field | Value |
|-------|-------|
| **URL** | [url] |
| **Price** | [price] |
| **Type** | [subscription / one-time / DFY / SaaS] |
| **Target** | [who this is for] |

## What's Included

- [Feature/benefit 1]
- [Feature/benefit 2]
- [Feature/benefit 3]

## Key Results

- [Case study or metric 1]
- [Case study or metric 2]

## Positioning

[How this offer fits relative to other LGJ offers. When to recommend it.]

See also: [[services-overview]]
```

---

## Tech / Architecture Note

```markdown
---
title: "[Technology/Pattern Name]"
tags:
  - tech
  - [specific-tech-tag]
  - [project-name]
created: [YYYY-MM-DD]
updated: [YYYY-MM-DD]
source: "[project-name]"
source_files:
  - "[file-path]"
---

# [Technology/Pattern Name]

[One-sentence description of this technology or pattern and why it matters.]

## Architecture

[How it works, key design decisions, data flow.]

## Key Files

| File | Purpose |
|------|---------|
| `[path]` | [what it does] |

## Configuration

[Key env vars, settings, or setup steps.]

## Gotchas

> [!warning] [Gotcha title]
> [Description of the gotcha and how to avoid it.]

See also: [[infrastructure-map]], [[related-note]]
```

---

## SOP Note

```markdown
---
title: "[Process Name]"
tags:
  - sop
  - [category]
  - [project-name]
created: [YYYY-MM-DD]
updated: [YYYY-MM-DD]
source: "[project-name]"
source_files:
  - "[file-path]"
---

# [Process Name]

[When to use this SOP and what it achieves.]

## Prerequisites

- [What you need before starting]

## Steps

1. **[Step name]** — [What to do and why]
2. **[Step name]** — [What to do and why]
3. **[Step name]** — [What to do and why]

## Verification

- [ ] [How to confirm step 1 worked]
- [ ] [How to confirm step 2 worked]

> [!tip] Common Shortcuts
> [Any time-saving tips for experienced users.]

See also: [[related-sop]]
```

---

## Integration Note

```markdown
---
title: "[Service Name] Integration"
tags:
  - tech
  - integration
  - [service-name]
  - [project-name]
created: [YYYY-MM-DD]
updated: [YYYY-MM-DD]
source: "[project-name]"
source_files:
  - "[file-path]"
---

# [Service Name] Integration

[What this integration does and which projects use it.]

## Setup

| Field | Value |
|-------|-------|
| **Service** | [name + URL] |
| **Auth** | [API key / OAuth / webhook secret] |
| **Env Var** | `[ENV_VAR_NAME]` |

## How It Works

[Data flow: what triggers it, what it sends, what it receives.]

## Key Files

| File | Purpose |
|------|---------|
| `[path]` | [what it does] |

## Webhook Payload

```json
{
  "field": "example"
}
```

> [!warning] Security
> [Any security considerations — HMAC verification, rate limits, etc.]

See also: [[infrastructure-map]]
```

---

## Lessons Learned / Gotchas Note

```markdown
---
title: "[System/Tool] Gotchas"
tags:
  - tech
  - gotchas
  - [system-name]
  - [project-name]
created: [YYYY-MM-DD]
updated: [YYYY-MM-DD]
source: "[project-name]"
source_files:
  - "CLAUDE.md"
---

# [System/Tool] Gotchas

Lessons learned and common pitfalls when working with [system/tool].

## [Gotcha Title]

**Problem:** [What goes wrong and when.]

**Root Cause:** [Why it happens.]

**Solution:** [How to fix or avoid it.]

```[language]
// Example fix
```

---

## [Another Gotcha Title]

**Problem:** [Description.]

**Root Cause:** [Why.]

**Solution:** [Fix.]

See also: [[related-note]]
```

---

## Content / A/B Test Results Note

```markdown
---
title: "A/B Test Results — [Project/Page]"
tags:
  - content
  - ab-testing
  - conversion
  - [project-name]
created: [YYYY-MM-DD]
updated: [YYYY-MM-DD]
source: "[project-name]"
source_files:
  - "CLAUDE.md"
  - "docs/ab-testing.md"
---

# A/B Test Results — [Project/Page]

Conversion optimization test results and learnings.

## [Round/Test Name]

**Period:** [date range]

| Variant | Views | Conversions | Rate | Outcome |
|---------|-------|-------------|------|---------|
| Control | [n] | [n] | [%] | |
| A ([description]) | [n] | [n] | [%] | [Winner/Inconclusive] |

**Key Learning:** [What we learned and why it matters.]

**Action:** [What was done with the result — baked into control, needs more traffic, etc.]

---

## Patterns Across Tests

[Synthesized insights that apply beyond a single test.]

- [Pattern 1: e.g., "Reducing form fields consistently improves conversion"]
- [Pattern 2: e.g., "Popup CTAs hurt on cold traffic pages"]

See also: [[ab-testing-playbook]]
```

---

## MOC (Map of Contents) Index

Use this for `_index.md` files in new folders:

```markdown
---
title: "[Folder Name]"
tags:
  - [folder-tag]
  - MOC
created: [YYYY-MM-DD]
updated: [YYYY-MM-DD]
---

# [Folder Name]

[One-sentence description of what this folder covers.]

> [!tip] Quick Start
> New here? Start with:
> 1. [[first-note]] — [why to read first]
> 2. [[second-note]] — [why to read second]

---

## [Category 1]

| Note | Description |
|------|-------------|
| [[note-name]] | [Brief description.] |
| [[note-name]] | [Brief description.] |

---

## [Category 2]

| Note | Description |
|------|-------------|
| [[note-name]] | [Brief description.] |
```
