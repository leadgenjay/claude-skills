# Extraction Patterns

Rules for parsing each knowledge source type and avoiding duplicates.

## Source: CLAUDE.md

The richest knowledge source. Parse by section headers and extract each as a separate topic.

| CLAUDE.md Section | KB Category | Note Strategy |
|-------------------|-------------|---------------|
| Brand Identity | `Business/` | Update `services-overview.md` or create `brand-identity-[project].md` |
| Tech Stack | `Tech/` | Create/update `tech-stack-[project].md` — deps, versions, patterns |
| Production URLs | `Business/` or `Tech/` | Merge into relevant service/product notes |
| Bug Fixes & Key Lessons | `Tech/` | Group by system (Vercel, Supabase, Next.js) into `[system]-gotchas.md` |
| A/B Testing Results | `Content/` | Create `ab-test-results-[project].md` with conversion data and learnings |
| Integrations (Hyros, Whop, etc.) | `Tech/` | One note per integration: `[integration]-setup.md` |
| Supabase Clients | `Tech/` | `supabase-patterns.md` |
| Code Conventions | `Tech/` or `SOPs/` | `coding-conventions-[project].md` |
| Workflow Examples | `SOPs/` | `workflow-[project].md` |
| Permissions / Safety | `SOPs/` | `deployment-safety.md` or similar |
| Full-Funnel Journey Tracking | `Tech/` | `journey-tracking-architecture.md` |
| Skills Marketplace | `Tech/` | `skills-marketplace-architecture.md` |

**Parsing strategy:** Split on `## ` (h2) headers. Each h2 section is a candidate for extraction. Subsections (`###`) stay within the parent note.

## Source: docs/*.md

Each documentation file typically maps to one KB note.

| Doc Pattern | KB Category | Note Strategy |
|-------------|-------------|---------------|
| `*-guide.md` | `SOPs/` or `Tech/` | One note per guide, title matches the guide |
| `api-reference.md` | `Tech/` | `api-reference-[project].md` |
| `*-sop.md` | `SOPs/` | Direct mapping |

**Parsing strategy:** Read the full doc. If it covers multiple distinct topics (>3 h2 sections on different subjects), consider splitting. Otherwise keep as one note.

## Source: MEMORY.md

Project memory contains distilled learnings. Extract stable patterns only.

| Memory Pattern | KB Category | Note Strategy |
|----------------|-------------|---------------|
| Library/component inventories | `Tech/` | `[component-type]-library.md` |
| Test results with data | `Content/` | Merge into A/B test results notes |
| Integration configs (PostHog, MCP servers) | `Tech/` | `[tool]-integration.md` |
| Fix histories with root cause | `Tech/` | Merge into relevant gotchas notes |
| Brand/design decisions | `Business/` | Merge into brand identity notes |

**Parsing strategy:** Parse by `## ` headers. Skip anything marked as "session-specific" or "in-progress". Only extract entries that have been confirmed across multiple sessions (check the language — "confirmed", "fixed", "established" vs "trying", "testing", "debugging").

## Source: package.json

Extract tech stack signals only. Don't create a note for every dependency.

**Extract:**
- Framework (Next.js, React, etc.) and version
- Key libraries (Tailwind, shadcn, Framer Motion, Remotion)
- Database/backend (Supabase, Prisma)
- AI services (fal.ai, OpenAI, Anthropic)
- Testing tools (Playwright, Jest, Vitest)

**Skip:**
- Dev dependencies (linters, formatters) unless they reflect a project convention
- Transitive dependencies
- Build tools (webpack, turbopack) unless notable

## Source: CHANGELOG.md

Extract recent features and architectural changes. Focus on the "what and why", not the "when".

**Extract:** New features, breaking changes, architectural decisions
**Skip:** Version bumps, dependency updates, minor fixes

---

## Deduplication Rules

Before creating any note:

1. **Title match:** Search KB for notes with the same or very similar title (fuzzy match — "Supabase Patterns" = "Supabase Client Patterns")
2. **Tag match:** Search for notes with the same `source` and overlapping `tags`
3. **Content overlap:** If >50% of the content you'd write already exists in a KB note, UPDATE that note instead of creating a new one

**When updating:**
- Bump `updated` date in frontmatter
- Add new `source_files` entries (don't remove old ones)
- Merge content: add new sections, update changed sections, preserve unchanged sections
- If information conflicts, apply the recency rule (newest source wins)
- Add a wikilink to the source project if not already present

**When no match found:**
- Create the note in the appropriate folder
- Add it to the folder's `_index.md` table

---

## Freshness Detection

To detect stale KB notes on re-sync:

1. Read the note's `updated` date and `source_files` list
2. Check if the source files have been modified since the `updated` date
3. If source files are newer, re-extract and merge
4. If source files no longer exist, add a callout:
   ```markdown
   > [!warning] Stale Source
   > Original source file(s) no longer exist. Verify this information is still current.
   ```

---

## Multi-Project Awareness

When the same topic appears across multiple projects (e.g., "Supabase patterns" in both Web Designer and Consulti):

- Use ONE note per topic with sections per project, OR
- Use ONE note with the generalized pattern and project-specific callouts
- Always tag with all relevant project names
- Cross-link with wikilinks: `See also: [[consulti-specific-note]]`
