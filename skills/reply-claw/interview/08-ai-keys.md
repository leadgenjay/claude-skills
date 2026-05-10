# Phase 8 — AI API Keys

## Purpose
Ensure `ANTHROPIC_API_KEY` is available in `.env` for the reply agent's classification and drafting models.

## Pre-checks
- Check `.env` for `ANTHROPIC_API_KEY`
- If present, skip Phase 8 (but allow override)

## Questions

### Q1 — Anthropic API Key (if missing)
**Header**: "Anthropic key"
**Type**: free-text (masked input)
**Question**: "Paste your Anthropic API key (for Claude). Get one at https://console.anthropic.com/keys"
**Validation**:
- Non-empty
- Test: `POST https://api.anthropic.com/v1/messages` with model `claude-haiku-4-5-20251001`, max_tokens=1, system="test", messages=[{role: user, content: "test"}]
- Must return 200 + valid message response
- On failure: "Invalid key. Check https://console.anthropic.com/keys and retry."
**Persists to**: `.env` as `ANTHROPIC_API_KEY={key}`
**Skip condition**: If already in `.env`, ask AskUserQuestion: "ANTHROPIC_API_KEY found. Use existing? [Yes, use existing / No, update with new key]"
