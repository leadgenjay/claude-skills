---
name: coaching-call
description: >
  Process coaching call transcripts from Fathom into structured Obsidian knowledge notes.
  Use when the user says "coaching call", "process call", "extract coaching", "fathom transcript",
  "coaching notes", "process coaching", "extract framework from call".
---

# Coaching Call Processor

Transform coaching call recordings (from Fathom) into searchable, reusable knowledge in the Obsidian knowledge base. Pipeline: **Fathom transcript -> NotebookLM analysis -> Obsidian notes -> git push**.

## KB Location

```
/Users/jayfeldman/Documents/Tech & Dev/knowledge-base/Coaching/
```

## NotebookLM Notebook

Use a dedicated "Coaching Calls" notebook in NotebookLM for archival and extraction. Create it on first run if it doesn't exist.

---

## Phase 1: List & Select Calls

Pull recent calls from Fathom, apply filters, and let the user choose which to process.

### Filtering Rules

Apply these filters **before** displaying calls to the user:

1. **Recorded by Jay only** — `recorded_by.email` must be `jay@leadgenjay.com`
2. **45+ minutes** — Only calls where recording duration is >= 45 minutes
3. **Exclude "Follow up"** — Skip any call with "Follow up" or "follow up" in the title
4. **Exclude internal-only** — Skip calls where `calendar_invitees_domains_type` is `only_internal` (unless it's a group coaching call like AMA/AIA)

### Steps

1. Use Fathom MCP `list_meetings` to fetch recent calls. Paginate through all results (the API returns 10 per page — use `cursor` to get more).
2. Filter the results using the rules above.
3. Display matching calls in a table:

```
Coaching Calls (recorded by Jay, 45+ min)
------------------------------------------
#  | Date       | Title                              | Duration | Attendees
1  | 2026-03-26 | Exclusive LGJ Insiders AMA         | 88 min   | 1 (group)
2  | 2026-03-26 | AIA Bonus call                     | 62 min   | 10+
3  | 2026-03-24 | Buildout Strategy x Melissa D.     | 57 min   | 4
```

4. Ask the user which call(s) to process (single number, comma-separated, or "all")

### Fallback Inputs

If Fathom MCP is unavailable or the API key isn't set:

- Accept a **pasted transcript** directly in chat
- Accept a **file path** to a transcript file (`.txt`, `.md`, `.vtt`)
- Accept a **Fathom share URL** (attempt to fetch via WebFetch)

> [!important] API Key Required
> Fathom MCP needs `FATHOM_API_KEY` in the environment. If missing, inform the user:
> "Add your Fathom API key to `.env` or shell profile as `FATHOM_API_KEY`, then restart Claude Code."

---

## Phase 2: Pull Transcript & Summary

For each selected call, retrieve the full data from Fathom.

### Steps

1. Use Fathom MCP to get the **full transcript** (speaker-labeled, timestamped)
2. Use Fathom MCP to get the **AI summary** (if available — Fathom generates these automatically)
3. Note the call metadata:
   - Date
   - Duration
   - Attendees / coachee name
   - Fathom call ID (for linking back)

Store these in working memory for the next phases. If the transcript is very long (>50k chars), note that NotebookLM will handle the full text — don't truncate.

---

## Phase 3: Feed to NotebookLM for Analysis

Add the transcript to NotebookLM and run targeted extraction queries.

### Steps

1. **Find or create** the "Coaching Calls" notebook:
   - Use `notebook_list` to search for an existing "Coaching Calls" notebook
   - If not found, use `notebook_create` with title "Coaching Calls"

2. **Add transcript as source:**
   - Use `source_add` with `source_type="text"`, passing the full transcript
   - Title: `"[YYYY-MM-DD] Coaching — [Coachee Name]"`
   - Set `wait=true` to ensure processing completes

3. **Run extraction queries** using `notebook_query`:
   - Consult the "Query Selection by Call Type" matrix in `references/extraction-prompts.md`
   - Always run queries 1-4. Run queries 5-7 based on call type (try all, accept thin results)
   - Use the same `conversation_id` for follow-up context if needed
   - Save each response for Phase 4

> [!tip] Query Strategy
> Run queries against just the newly added source (pass `source_ids`) to avoid cross-contamination with previous calls. The archival value comes from having all transcripts in one notebook for later cross-call analysis.

---

## Phase 4: Structure Extracted Knowledge

Categorize NotebookLM outputs into discrete, typed knowledge notes.

### Steps

1. Review all 7 extraction responses from Phase 3
2. For each distinct piece of knowledge, classify using `references/frameworks-taxonomy.md`:
   - **Framework** — A 3+ step system or mental model the coachee should master
   - **Strategy** — A specific, actionable approach to a concrete problem
   - **Objection** — A common concern raised + the proven reframe/response
   - **Lesson** — A coaching practice insight (how to coach better, not what was coached)

3. Deduplicate:
   - Check existing `Coaching/` notes for overlapping frameworks or strategies
   - If a framework already exists, plan to UPDATE it with new examples rather than create a duplicate

4. Present a summary to the user for approval:

```
Extraction Summary — Coaching with Alex R. (2026-03-25)
-------------------------------------------------------
Frameworks (3):
  - The 3-Layer Outbound Stack (new)
  - AIDA for Cold Email (update existing)
  - Objection Reframe Loop (new)

Strategies (2):
  - LinkedIn Warm-Up Sequence
  - Reply Rate Optimization via Send Time

Objections (1):
  - "Cold email is spam" reframe

Lessons (1):
  - Ask before prescribing — let coachee arrive at the answer

Proceed with generating notes? [Y/n]
```

5. Wait for user approval before writing files

### Filtering Rules

**Include:**
- Reusable frameworks that apply beyond this one coachee
- Strategies with clear steps that could help other clients
- Objection-response pairs that come up repeatedly
- Coaching technique insights

**Exclude:**
- Scheduling logistics, personal details, small talk
- One-off troubleshooting specific to the coachee's unique setup
- Sensitive personal/financial information
- Action items (those belong in the coachee's own system, not the KB)

---

## Phase 5: Generate Obsidian Notes

Write each approved knowledge item as a structured Obsidian note.

### Steps

1. For each item, select the appropriate template from `references/note-templates.md`
2. Write the note with:
   - **YAML frontmatter**: title, tags, dates, source call info, Fathom ID
   - **Structured content**: following the template sections
   - **Wikilinks**: to related KB notes (check existing notes in `Coaching/` and other folders)
3. File naming convention:
   - `framework-[kebab-name].md` (e.g., `framework-3-layer-outbound-stack.md`)
   - `strategy-[kebab-name].md` (e.g., `strategy-linkedin-warmup-sequence.md`)
   - `objection-[kebab-topic].md` (e.g., `objection-cold-email-is-spam.md`)
   - `lesson-[kebab-insight].md` (e.g., `lesson-ask-before-prescribing.md`)
4. Place all notes in `/Users/jayfeldman/Documents/Tech & Dev/knowledge-base/Coaching/`
5. Create the **archive note** for the call:
   - Path: `Coaching/calls/[YYYY-MM-DD]-[coachee-kebab].md`
   - Links to all extracted notes
   - Contains the Fathom summary and metadata

### Update vs Create

Follow the same rules as `kb-sync`:

```
Does a note on this topic already exist in Coaching/?
├── YES → Merge new content, bump `updated` date, add new source
└── NO → Create new note, add to _index.md
```

> [!warning] Recency Rule
> If an existing framework note has older information, UPDATE it — newest source always wins.
> Add new examples, refine steps, but preserve the core structure.

---

## Phase 6: Update Index & Patterns

Keep the Coaching MOC and patterns file current.

### Steps

1. **Update `Coaching/_index.md`**:
   - Add wikilinks for any NEW notes created
   - Update descriptions for any notes that were significantly modified
   - Keep the table sorted by type (Frameworks, Strategies, Objections, Lessons)

2. **Update `Coaching/_coaching-patterns.md`**:
   - Read the current patterns file
   - For each extraction, check: is this a recurring theme?
   - If a theme appears in 2+ calls, add/update it in the patterns file with:
     - Theme name
     - How many calls it's appeared in
     - Wikilinks to the relevant notes
     - Brief description of the pattern
   - **Verify call counts:** Before writing a "Seen in: N calls" claim, confirm the theme was actually discussed (not just tangentially mentioned) in each listed call. Don't attribute a theme to a call just because a related keyword appeared — the theme's core concept must have been substantively discussed.

---

## Phase 7: Git Commit & Push

Commit all changes to the knowledge base repo.

### Steps

```bash
cd "/Users/jayfeldman/Documents/Tech & Dev/knowledge-base"
git add Coaching/
git commit -m "coaching: Extract knowledge from [Coachee] call ([YYYY-MM-DD])

Notes created: [count new]
Notes updated: [count updated]
Types: [X frameworks, Y strategies, Z objections, W lessons]
Source: Fathom call [call-id]"
git push origin main
```

---

## Phase 8: Summary

Print a completion report for the user.

```
Coaching Call Processed
-----------------------
Call: Coaching with Alex R. (2026-03-25, 47 min)
Fathom ID: [id]
NotebookLM: Source added to "Coaching Calls" notebook

Notes Created (4):
  - Coaching/framework-3-layer-outbound-stack.md
  - Coaching/framework-objection-reframe-loop.md
  - Coaching/strategy-linkedin-warmup-sequence.md
  - Coaching/objection-cold-email-is-spam.md

Notes Updated (1):
  - Coaching/framework-aida-cold-email.md (added new examples)

Archive:
  - Coaching/calls/2026-03-25-alex-r.md

Patterns Updated:
  - "Outbound layering" (now seen in 3 calls)

Commit: abc1234
Pushed to: origin/main
```

---

## Batch Processing

When processing multiple calls:

1. Run Phases 1-2 for all calls first (gather all transcripts)
2. Add all transcripts to NotebookLM as sources
3. Run extraction queries per-call (not across calls — keep knowledge attributed to specific calls)
4. Deduplicate across the batch in Phase 4
5. Generate all notes in Phase 5
6. Single git commit in Phase 7 covering all calls

---

## Coachee Privacy

- **Default to real names** for context and searchability
- If the user says "anonymous" or "no names", use initials or generic labels
- Never include sensitive personal information (financials, health, family details)
- Phone numbers, email addresses, and social handles are excluded unless they're business-relevant
- The user can override any of these defaults per-call
