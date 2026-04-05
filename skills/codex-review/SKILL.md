---
name: codex-review
description: >
  Codex reviews Claude's code for bugs, edge cases, and security issues.
  Claude critically evaluates Codex's feedback and produces a synthesized result.
  Uses OpenAI Codex CLI for independent peer review of code changes.
triggers:
  - "codex review"
  - "review with codex"
  - "codex check"
  - "second opinion"
  - "cross-review"
  - "peer review codex"
  - "codex code review"
  - "have codex review"
  - "get codex feedback"
  - "codex resume"
tags:
  - review
  - codex
  - code-quality
  - security
  - peer-review
matching: fuzzy
---

# Codex Review - Peer Code Review via OpenAI Codex CLI

## Overview

Use Codex CLI as an independent peer reviewer for code Claude wrote or modified.
Codex reviews for bugs, edge cases, security issues, and correctness. Claude
critically evaluates the feedback and produces a synthesized result.

## Prerequisites

Codex CLI must be installed: `codex --version` should return `codex-cli 0.111.0+`

## Step 1: Check for Resume Request

If the user said "codex resume", "resume codex", or "continue codex session":

```bash
echo "<follow-up prompt>" | codex exec --skip-git-repo-check resume --last 2>/dev/null
```

Skip to Step 5 with the resume output. When resuming to discuss a disagreement,
identify yourself by model name (e.g., "Claude here — I disagree because...").

## Step 2: Model & Effort Selection

Ask the user to configure Codex using a SINGLE AskUserQuestion with 2 questions:

**Question 1 — "Which Codex model?"**
| Option | Description |
|--------|-------------|
| `gpt-5.4` (Recommended) | Most capable, best for complex reviews |
| `gpt-5.3-codex-spark` | Fast and cost-effective |
| `gpt-5.3-codex` | Balanced |

**Question 2 — "Reasoning effort?"**
| Option | Description |
|--------|-------------|
| `high` (Recommended) | Thorough analysis, good balance |
| `xhigh` | Maximum depth, slower |
| `medium` | Quick scan |
| `low` | Surface-level only |

## Step 3: Gather Review Context

Determine what to review based on user input or `$ARGUMENTS`:

- **"last changes" / no argument**: Run `git diff HEAD` (unstaged + staged) or `git diff HEAD~1` (last commit)
- **Specific files**: Read the specified files
- **Directory**: Glob for relevant source files in that directory

Collect the diff or file contents. Keep context focused — don't send the entire codebase.

## Step 4: Execute Codex Review

Build and run the Codex command:

```bash
codex exec -m <model> \
  --config model_reasoning_effort="<effort>" \
  --sandbox read-only \
  --full-auto \
  --skip-git-repo-check \
  "<review_prompt>" 2>/dev/null
```

### Review Prompt Template

Construct the prompt by embedding the code/diff inline:

```
You are reviewing code changes for correctness and quality. Analyze the following
code and provide a structured review.

<CODE>
{paste diff or file contents here}
</CODE>

Review categories (address each):

1. **BUGS**: Logic errors, off-by-one, null/undefined access, race conditions
2. **EDGE CASES**: Missing error handling, empty inputs, boundary values
3. **SECURITY**: Injection, XSS, auth bypass, secrets exposure, OWASP top 10
4. **PERFORMANCE**: N+1 queries, unnecessary re-renders, memory leaks, O(n^2)
5. **CORRECTNESS**: Does the code do what it claims? Type safety issues?

For each finding:
- Severity: CRITICAL / HIGH / MEDIUM / LOW
- File and line reference
- What's wrong
- Suggested fix (code snippet)

If the code looks clean, say so — don't invent issues.
End with a summary: total findings by severity.
```

### Timeout

Set a 120-second timeout on the Bash command. If Codex times out, inform the user
and offer to retry with lower effort or a simpler model.

## Step 5: Critical Evaluation Protocol

**Codex is a peer, NOT an authority.** Claude MUST critically evaluate every finding:

### For each Codex finding, determine:

**AGREE** — Codex identified a real issue that Claude missed or confirms:
- Acknowledge the finding with attribution: "Codex correctly identified..."
- Incorporate the fix into recommendations
- If the fix is straightforward, offer to apply it immediately

**DISAGREE** — Codex is wrong or the suggestion would make things worse:
- Research via codebase context, docs, or WebSearch
- Present evidence: "Codex suggested X, but this is incorrect because [evidence]"
- Claude's position takes precedence when backed by evidence
- Let the user decide if genuinely ambiguous

**UNCERTAIN** — Could go either way:
- Present both perspectives with pros/cons
- Highlight the tradeoff clearly
- Ask the user to decide

### Disagreement Handling

When Claude disagrees with Codex:
1. State the disagreement clearly
2. Cite specific evidence (docs, types, runtime behavior)
3. If needed, use WebSearch to verify claims
4. If resuming Codex to debate, identify as "Claude (Opus 4.6)" in the prompt
5. Present both sides fairly — user has final say

## Step 6: Present Synthesized Review

Format the output:

```
## Code Review Results

### Codex Model: {model} | Effort: {effort}

### Findings

#### CRITICAL (N)
- [Finding with attribution — "Codex found" or "Claude identified"]

#### HIGH (N)
- ...

#### MEDIUM (N)
- ...

#### LOW (N)
- ...

### Disagreements (if any)
- Codex said X. Claude disagrees because [evidence].

### Summary
- Total: N findings (X critical, Y high, Z medium, W low)
- Codex and Claude agreed on: N items
- Disagreements: N items (details above)
```

## Step 7: Offer Next Actions

After presenting the review, offer:

1. **Apply fixes** — Claude implements agreed-upon fixes
2. **Another pass** — Run Codex again (different model/effort, or on updated code)
3. **Resume session** — Pipe a follow-up question to `codex exec resume --last`
4. **Done** — Accept the review as-is

## CLI Reference

| Flag | Purpose |
|------|---------|
| `-m <model>` | Model selection |
| `--config model_reasoning_effort="X"` | Reasoning depth |
| `--sandbox read-only` | Read-only filesystem access |
| `--full-auto` | No interactive prompts |
| `--skip-git-repo-check` | Skip git repository validation |
| `2>/dev/null` | Suppress thinking tokens on stderr |
| `resume --last` | Continue previous Codex session |

## Thinking Tokens

By default, `2>/dev/null` suppresses Codex's thinking tokens (emitted on stderr).
If the user explicitly asks to see thinking (e.g., "show me codex's reasoning"),
remove `2>/dev/null` from the command.

## Error Handling

- **Codex not installed**: Tell user to install via `npm i -g @anthropic-ai/codex`
- **API key missing**: Tell user to set `OPENAI_API_KEY` env var
- **Timeout**: Offer to retry with lower effort or simpler model
- **Empty output**: Codex may have found no issues — report clean bill of health
- **Codex errors on stderr**: If `2>/dev/null` is removed and errors appear, parse and report them
