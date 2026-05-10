# Phase 12 — Agent Preferences & Safety

## Purpose
Configure the reply agent's behavior, confidence thresholds, and approval workflow.

## Pre-checks
- None

## Questions

### Q1 — Daily Auto-Send Cap
**Header**: "Daily cap"
**Type**: AskUserQuestion (single-select)
**Question**: "Maximum auto-sent replies per day (across all personas)?"
**Options**:
- "5 replies"
- "10 replies"
- "15 replies (Recommended)"
- "25 replies"
**Validation**: None
**Persists to**: `config.preferences.daily_auto_send_cap`
**Default**: `15`

### Q2 — Confidence Floor
**Header**: "Confidence"
**Type**: AskUserQuestion (single-select)
**Question**: "Minimum confidence score for auto-send (0=low certainty, 1=high). Higher = more conservative."
**Options**:
- "0.75 (More permissive)"
- "0.85 (Balanced, Recommended)"
- "0.90 (Conservative)"
- "0.95 (Very strict)"
**Validation**: None
**Persists to**: `config.preferences.confidence_floor`
**Default**: `0.85`

### Q3 — Dry Run Mode
**Header**: "Dry run"
**Type**: AskUserQuestion (single-select)
**Question**: "For the first week, should auto-send be ON or OFF?"
**Options**:
- "ON (Recommended) — Draft replies to Telegram, require approval before sending" — Sets `dry_run: true`
- "OFF — Auto-send live immediately" — Sets `dry_run: false`
**Validation**: None
**Persists to**: `config.preferences.dry_run`
**Default**: `true`

### Q4 — Max Per Cycle
**Header**: "Per cycle"
**Type**: AskUserQuestion (single-select)
**Question**: "Maximum replies to process per agent cycle (e.g., every 5 min)? Higher = faster but uses more API."
**Options**:
- "10 replies"
- "20 replies (Recommended)"
- "30 replies"
- "50 replies"
**Validation**: None
**Persists to**: `config.preferences.max_per_cycle`
**Default**: `20`

### Q5 — Classify Model
**Header**: "Classify model"
**Type**: AskUserQuestion (single-select)
**Question**: "Which model to use for classifying replies (interested/objection/not-interested)?"
**Options**:
- "claude-haiku-4-5-20251001 (Fast & cheap, Recommended)"
- "claude-sonnet-4-6 (Slower, more accurate)"
- "claude-opus-4-7 (Slowest, most nuanced)"
**Validation**: None
**Persists to**: `config.preferences.classify_model`
**Default**: `claude-haiku-4-5-20251001`

### Q6 — Draft Model
**Header**: "Draft model"
**Type**: AskUserQuestion (single-select)
**Question**: "Which model to use for drafting replies?"
**Options**:
- "claude-sonnet-4-6 (Balanced, Recommended)"
- "claude-opus-4-7 (Most capable, slower)"
**Validation**: None
**Persists to**: `config.preferences.draft_model`
**Default**: `claude-sonnet-4-6`
