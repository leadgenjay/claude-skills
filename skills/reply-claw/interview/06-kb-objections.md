# Phase 6 — Knowledge Base: Objections

## Purpose
Collect common objections and recommended responses to populate KB/objections files. One markdown file per objection.

## Pre-checks
- None

## Questions

### Q1 — Objection Count
**Header**: "Objection count"
**Type**: AskUserQuestion (single-select)
**Question**: "How many objections do you want to document for the reply agent?"
**Options**:
- "3 objections"
- "4 objections"
- "5 objections"
**Persists to**: Used by wizard to loop through objections

### Q2 — Objection Text (per objection, loop)
**Header**: "Objection"
**Type**: free-text
**Question**: "Objection {N}: What's the complaint? (Example: 'We already have a solution for this')"
**Validation**: Non-empty, max 150 chars
**Persists to**: `config.kb.objections[].objection`

### Q3 — Response (per objection)
**Header**: "Response"
**Type**: free-text
**Question**: "Your recommended response. (1-2 sentences, warm and direct.)"
**Validation**: Non-empty, max 500 chars
**Persists to**: `config.kb.objections[].response`
**Render to**: `kb/{slug}/objections/{slug}-{N}.md` (one file per objection)
