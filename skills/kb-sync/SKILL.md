---
name: kb-sync
description: >
  Extract knowledge from the current project and sync it to the Obsidian knowledge base.
  Use when the user says "kb sync", "sync to kb", "update knowledge base", "knowledge sync",
  "sync knowledge", "push to kb", or "extract knowledge". Works from any project directory.
---

# Knowledge Base Sync

Extract knowledge from project documentation and sync it to the Lead Gen Jay Obsidian knowledge base at `/Users/jayfeldman/Documents/Tech & Dev/knowledge-base/`.

The KB is a git-synced Obsidian vault (`github.com/leadgenjay/knowledge-base`) used by Claude Code, Bob (OpenClaw), and NotebookLM. Knowledge you add here becomes accessible to all AI tools and human reference.

## KB Location

```
/Users/jayfeldman/Documents/Tech & Dev/knowledge-base/
```

## Workflow

### Phase 1: Scan Project for Knowledge Sources

Read these files in the current project (skip any that don't exist):

| Source | What to Extract |
|--------|----------------|
| `CLAUDE.md` | Brand identity, tech stack, offers, integrations, bug fixes, conventions, production URLs, A/B test results |
| `docs/*.md` | Guides, SOPs, architecture decisions, API references |
| `CHANGELOG.md` | Recent features, changes, learnings |
| `~/.claude/projects/*/memory/MEMORY.md` | Stable patterns, architectural decisions, test results, debugging insights |
| `package.json` | Tech stack signals (dependencies, scripts) |
| `.env.example` or env documentation | Integration/service inventory |

> [!important] Scope Control
> Only extract **stable, reusable knowledge** — not session-specific context, in-progress work, or temporary debugging notes. If something would be useful to know 3 months from now, it belongs in the KB.

### Phase 2: Read Existing KB State

Before writing anything, scan the KB to understand what already exists:

1. **List all folders** in the KB root to know available categories
2. **Read `_index.md`** files in relevant folders for the current table of contents
3. **Search for existing notes** that might overlap with what you're about to create — check by title and tags
4. **Read `Business/knowledge-base-rules.md`** for the recency rule and source priority

> [!warning] Recency Rule
> The NEWEST source ALWAYS wins when information conflicts. Tag all extracted knowledge with the source date. If an existing KB note has older information than the project docs, UPDATE the existing note — don't create a duplicate.

### Phase 3: Extract & Categorize

Read each knowledge source and extract discrete topics. Categorize each into a KB folder:

| Knowledge Type | KB Folder | Examples |
|----------------|-----------|----------|
| Offers, products, pricing, positioning | `Business/` | Product features, pricing, target audience, offer matching |
| Tech stack, architecture, infrastructure | `Tech/` | Framework choices, deployment, database patterns, API clients |
| Standard operating procedures | `SOPs/` | Deploy checklists, tracking setup, page creation, testing workflows |
| Copywriting, marketing, conversion data | `Content/` | Copy frameworks, A/B test results, headline patterns, funnel metrics |
| Cold email specific | `Cold Email/` | Email templates, deliverability, sequences, reply rate data |
| Integrations & APIs | `Tech/` | Webhook configs, API clients, third-party services, env vars |
| Bug fixes & lessons learned | `Tech/` | Gotchas, edge cases, debugging patterns, anti-patterns |

**If no existing folder fits**, create a new one with an `_index.md` following the MOC pattern (see Phase 4).

**Granularity rule:** One note per distinct topic. Don't create a single massive note — split into focused notes that can be individually linked and searched. For example, "Supabase Client Patterns" and "Vercel Deployment Gotchas" are separate notes, not one "Tech Stack" dump.

### Phase 4: Generate Obsidian Notes

For each extracted topic, write a note following these conventions:

#### Frontmatter (Required)

```yaml
---
title: "Note Title"
tags:
  - category-tag
  - source-project-name
  - topic-tag
created: YYYY-MM-DD
updated: YYYY-MM-DD
source: "project-name"
source_files:
  - "CLAUDE.md"
  - "docs/relevant-guide.md"
---
```

- `source`: The project name (e.g., "web-designer", "consulti", "knowledge-base")
- `source_files`: Which files this knowledge was extracted from — enables future staleness detection
- `tags`: Always include the KB folder category + source project as tags

#### Content Conventions

Follow these Obsidian-specific patterns:

1. **Wikilinks** for cross-references to other KB notes: `[[note-name]]` or `[[note-name|Display Text]]`
2. **Callouts** for important info:
   ```markdown
   > [!tip] Quick Reference
   > Key point here.

   > [!warning] Common Mistake
   > What to avoid.
   ```
3. **Tables** for reference material (not prose lists)
4. **Code blocks** with language tags for technical content
5. **No emojis** in note content (clean, professional style)
6. **Heading hierarchy**: `# Title` (matches frontmatter title), then `##` for sections, `###` for subsections

#### File Naming

- Lowercase, hyphenated: `supabase-client-patterns.md`
- Descriptive but concise: prefer `ab-test-results-round-3.md` over `results.md`
- Place in the correct KB folder: `Tech/supabase-client-patterns.md`

### Phase 5: Update or Create

For each note:

1. **If a matching note exists** (same topic, same or similar title):
   - Read the existing note
   - Merge new information (newest source wins per recency rule)
   - Update the `updated` date in frontmatter
   - Add any new `source_files` entries
   - Preserve existing content that isn't contradicted

2. **If no matching note exists**:
   - Create the new note in the correct folder
   - Add a wikilink entry to the folder's `_index.md` (if one exists)

3. **If creating a new folder**:
   - Create a `_index.md` with MOC pattern:
     ```markdown
     ---
     title: "Folder Name"
     tags:
       - folder-tag
       - MOC
     created: YYYY-MM-DD
     updated: YYYY-MM-DD
     ---

     # Folder Name

     Description of what this folder covers.

     ## Notes

     | Note | Description |
     |------|-------------|
     | [[note-name]] | Brief description of the note. |
     ```

### Phase 6: Commit & Push

After writing all notes:

```bash
cd /Users/jayfeldman/Documents/Tech\ \&\ Dev/knowledge-base
git add -A
git commit -m "kb-sync: Extract knowledge from [project-name]

Sources: [list of files scanned]
Notes added/updated: [count]
Folders: [list of folders touched]"
git push origin main
```

### Phase 7: Summary

Print a summary for the user:

```
KB Sync Complete
────────────────
Project: [name]
Sources scanned: [count]
Notes created: [list with paths]
Notes updated: [list with paths]
Index files updated: [list]
Commit: [hash]
Pushed to: origin/main
```

## Update vs Create Decision Tree

```
Is there an existing note on this topic?
├── YES → Has the information changed?
│   ├── YES → Update note (bump `updated`, merge content, newest wins)
│   └── NO → Skip (already synced)
└── NO → Is this stable, reusable knowledge?
    ├── YES → Create new note
    └── NO → Skip (too ephemeral)
```

## What NOT to Sync

- Session-specific debugging context
- In-progress work or temporary state
- Credentials, API keys, secrets (even env var names with values)
- Raw code dumps without explanation
- Todo lists or task tracking
- Conversation-specific decisions that won't generalize

## Example: Extracting from CLAUDE.md

Given a CLAUDE.md section like "Bug Fixes & Key Lessons", extract each lesson as knowledge:

**Input** (from CLAUDE.md):
```
- **Fire-and-forget in edge middleware:** Bare `fetch().catch(() => {})` calls in Next.js middleware get terminated on Vercel before completing. Use `after()` from `next/server`.
```

**Output** (new note `Tech/vercel-middleware-gotchas.md`):
```markdown
---
title: "Vercel Middleware Gotchas"
tags:
  - tech
  - vercel
  - next-js
  - web-designer
created: 2026-03-26
updated: 2026-03-26
source: "web-designer"
source_files:
  - "CLAUDE.md"
---

# Vercel Middleware Gotchas

Lessons learned from running Next.js middleware on Vercel's edge runtime.

## Fire-and-Forget Calls

Bare `fetch().catch(() => {})` calls in Next.js edge middleware get terminated on Vercel before completing. The edge runtime doesn't wait for unresolved promises.

**Solution:** Use `after()` from `next/server` to reliably run async work (analytics, logging) after the response is sent.

## Supabase in Serverless

Use `createApiClient()` (anon key, no cookies) for public API routes. The cookie-based `createClient()` causes 500 errors in Vercel serverless functions.

> [!warning] Common Mistake
> Using the cookie-based Supabase server client in public API routes that don't have cookie context will silently fail with 500 errors.

See also: [[infrastructure-map]]
```

## Example: Extracting Offers

**Output** (update to `Business/services-overview.md`):

If the project has offer data not yet in the KB's services overview, merge it. For example, if the Web Designer project documents Consulti.ai as a new offer, add a section following the existing format (URL, Price, Target, What's Included, Key Results).
