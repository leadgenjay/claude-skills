# Note Templates

Obsidian note templates for each coaching knowledge type. Replace bracketed values. Follow the same conventions as the `kb-sync` skill (frontmatter, wikilinks, callouts, no emojis).

---

## Framework Note

For 3+ step systems, mental models, and structured methodologies.

```markdown
---
title: "[Framework Name]"
tags:
  - coaching
  - framework
  - [topic-tag]
created: [YYYY-MM-DD]
updated: [YYYY-MM-DD]
source: "coaching-call"
source_call: "[YYYY-MM-DD] [Coachee Name]"
fathom_id: "[call-id]"
---

# [Framework Name]

[One-sentence description of what this framework does and when to use it.]

## Steps

1. **[Step Name]** — [What to do and why]
2. **[Step Name]** — [What to do and why]
3. **[Step Name]** — [What to do and why]

## When to Use

[Situations or client types where this framework applies best.]

## Examples

- **[Coachee/Context]:** [How it was applied in the call]

## Common Mistakes

> [!warning] Watch Out
> [The most common way people get this framework wrong.]

See also: [[_index|Coaching Index]], [[related-framework]]
```

---

## Strategy Note

For specific, actionable approaches to concrete problems.

```markdown
---
title: "[Strategy Name]"
tags:
  - coaching
  - strategy
  - [topic-tag]
created: [YYYY-MM-DD]
updated: [YYYY-MM-DD]
source: "coaching-call"
source_call: "[YYYY-MM-DD] [Coachee Name]"
fathom_id: "[call-id]"
---

# [Strategy Name]

[One-sentence description of what problem this strategy solves.]

## The Approach

[Step-by-step description of what to do.]

1. [Step 1]
2. [Step 2]
3. [Step 3]

## Benchmarks

| Metric | Target | Notes |
|--------|--------|-------|
| [metric] | [value] | [context] |

## Tools & Resources

- [Tool/platform referenced]
- [Resource or template mentioned]

## Origin

First discussed in coaching with [Coachee] on [date]. [Brief context of the problem it solved.]

See also: [[_index|Coaching Index]], [[related-strategy]]
```

---

## Objection Note

For common concerns raised by coachees and proven reframes.

```markdown
---
title: "[Objection Summary]"
tags:
  - coaching
  - objection
  - [topic-tag]
created: [YYYY-MM-DD]
updated: [YYYY-MM-DD]
source: "coaching-call"
source_call: "[YYYY-MM-DD] [Coachee Name]"
fathom_id: "[call-id]"
---

# [Objection Summary]

## The Objection

> "[The objection in the coachee's words or close paraphrase]"

**Underlying belief:** [What the coachee really means or fears.]

## The Reframe

[The response that works. Write it as if coaching someone right now.]

**Why it works:** [The principle behind the reframe — social proof, recontextualization, analogy, etc.]

## Variations

- **[Variation 1]:** "[Slightly different version of the same objection]" — *Reframe adjustment:* [1-sentence explaining how to modify the core reframe for this variation. REQUIRED — never leave variations without reframe adjustments.]

## Times Encountered

| Date | Coachee | Context | Accepted? |
|------|---------|---------|-----------|
| [date] | [name] | [brief context] | Yes/Partially/No |

See also: [[_index|Coaching Index]], [[related-objection]]
```

---

## Lesson Note

For coaching practice insights — how to coach better, not what was coached.

```markdown
---
title: "[Lesson Summary]"
tags:
  - coaching
  - lesson
  - coaching-practice
created: [YYYY-MM-DD]
updated: [YYYY-MM-DD]
source: "coaching-call"
source_call: "[YYYY-MM-DD] [Coachee Name]"
fathom_id: "[call-id]"
---

# [Lesson Summary]

[One-sentence description of the coaching insight.]

## What Happened

[The situation that revealed this lesson.]

## The Insight

[What was learned about coaching practice, technique, or approach.]

## Application

[When and how to apply this lesson in future coaching calls.]

> [!tip] Quick Reminder
> [One-line version of this lesson for quick reference.]

See also: [[_index|Coaching Index]], [[_coaching-patterns]]
```

---

## Call Archive Note

One per coaching call, linking to all extracted knowledge. Stored in `Coaching/calls/`.

```markdown
---
title: "Coaching Call — [Coachee Name] ([YYYY-MM-DD])"
tags:
  - coaching
  - call-archive
  - [coachee-first-name]
created: [YYYY-MM-DD]
updated: [YYYY-MM-DD]
source: "fathom"
fathom_id: "[call-id]"
duration: "[X] min"
coachee: "[Full Name]"
---

# Coaching Call — [Coachee Name] ([YYYY-MM-DD])

## Call Info

| Field | Value |
|-------|-------|
| **Date** | [YYYY-MM-DD] |
| **Duration** | [X] min |
| **Coachee** | [Name] |
| **Fathom ID** | [id] |

## Summary

[Fathom's AI summary or a 3-5 sentence human summary of what was covered.]

## Knowledge Extracted

### Frameworks
- [[framework-name-1]]
- [[framework-name-2]]

### Strategies
- [[strategy-name-1]]

### Objections
- [[objection-topic-1]]

### Lessons
- [[lesson-insight-1]]

## Key Moments

- [Timestamp or topic] — [What happened and why it mattered]

## Follow-Up

- [Any action items or topics for the next call]

See also: [[_index|Coaching Index]], [[_coaching-patterns]]
```

---

## Usage Notes

- All templates follow the `kb-sync` conventions: YAML frontmatter, wikilinks, callouts, tables for reference data
- The `source_call` field is unique to coaching notes — it links knowledge back to the specific call
- The `fathom_id` field enables linking back to the original recording in Fathom
- **`fathom_id` must always be a single ID** — use the call where the topic was discussed most substantially. When a note draws from multiple calls, `source_call` handles multi-call attribution (e.g., `"2026-03-24 Melissa DeRosier, 2026-03-16 Michael Hartley"`). Never comma-separate `fathom_id` values — tools that parse frontmatter expect a single integer or string.
- When updating an existing note, add new `source_call` entries but don't remove old ones (shows the framework was discussed in multiple calls)
- **Disambiguate team members** — When referencing people by name, always specify their affiliation: "(LGJ team member)", "(3CI client)", "(DCI VP Sales)". Never write just "(team member)" — it's ambiguous whether they're on the LGJ team or the client's team.
- File naming uses the type prefix: `framework-`, `strategy-`, `objection-`, `lesson-`
