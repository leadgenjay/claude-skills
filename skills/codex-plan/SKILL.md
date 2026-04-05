---
name: codex-plan
description: >
  Get Codex's independent architectural perspective on a plan or approach.
  Claude presents a plan, Codex critiques it, Claude synthesizes into a
  stronger plan. Uses OpenAI Codex CLI for collaborative planning.
triggers:
  - "codex plan"
  - "plan with codex"
  - "codex architect"
  - "codex design"
  - "codex perspective"
  - "ask codex about the plan"
  - "codex architecture"
  - "codex resume"
tags:
  - planning
  - codex
  - architecture
  - design
  - collaboration
matching: fuzzy
---

# Codex Plan - Collaborative Planning via OpenAI Codex CLI

## Overview

During planning, get Codex's independent architectural perspective. Claude
creates or reads an existing plan, Codex critiques it, Claude synthesizes the
feedback into a stronger plan.

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
| `gpt-5.4` (Recommended) | Most capable, best for architectural analysis |
| `gpt-5.3-codex-spark` | Fast and cost-effective |
| `gpt-5.3-codex` | Balanced |

**Question 2 — "Reasoning effort?"**
| Option | Description |
|--------|-------------|
| `high` (Recommended) | Thorough analysis, good balance |
| `xhigh` | Maximum depth, slower |
| `medium` | Quick feedback |
| `low` | Surface-level only |

## Step 3: Gather Plan Context

Determine the plan to review:

- **`$ARGUMENTS` is a file path**: Read the plan file (e.g., `.omc/plans/*.md`)
- **`$ARGUMENTS` is a description**: Use it as the plan text
- **No argument**: Check `.omc/plans/` for the most recent plan file. If none,
  ask the user to describe the plan or provide a file path.
- **Plan mode active**: Read the current plan from the active plan file

Also gather relevant codebase context:
- Project structure (key directories, package.json/tsconfig if relevant)
- Existing patterns that the plan should align with

## Step 4: Execute Codex Plan Review

Build and run the Codex command:

```bash
codex exec -m <model> \
  --config model_reasoning_effort="<effort>" \
  --sandbox read-only \
  --full-auto \
  --skip-git-repo-check \
  "<plan_review_prompt>" 2>/dev/null
```

### Plan Review Prompt Template

```
You are an independent architect reviewing a software plan. Provide critical,
constructive feedback.

<PLAN>
{paste plan contents here}
</PLAN>

<CODEBASE_CONTEXT>
{paste relevant project structure, tech stack, existing patterns}
</CODEBASE_CONTEXT>

Review the plan across these dimensions:

1. **ARCHITECTURE**: Is the design sound? Are there better patterns?
   Suggest alternatives with tradeoffs.

2. **SCALABILITY**: Will this approach scale? What breaks at 10x/100x?

3. **EDGE CASES**: What scenarios does the plan miss? Error states?
   Failure modes?

4. **RISKS**: What could go wrong? Dependencies? Breaking changes?
   Migration concerns?

5. **ALTERNATIVES**: Are there simpler or more proven approaches?
   What would you do differently?

6. **MISSING PIECES**: What's not addressed? Testing strategy?
   Rollback plan? Monitoring?

For each concern:
- Severity: CRITICAL / HIGH / MEDIUM / LOW
- What's the issue
- Your recommended alternative

If the plan is solid, say so — don't invent problems.
End with: overall assessment (APPROVE / APPROVE WITH CHANGES / RETHINK)
```

### Timeout

Set a 120-second timeout on the Bash command. If Codex times out, inform the user
and offer to retry with lower effort or a simpler model.

## Step 5: Critical Evaluation Protocol

**Codex is a peer, NOT an authority.** Claude MUST critically evaluate every point:

### For each Codex suggestion, determine:

**AGREE** — Codex raised a valid concern or better approach:
- Acknowledge: "Codex correctly identified..."
- Integrate into the enhanced plan

**DISAGREE** — Codex is wrong or the suggestion doesn't fit this context:
- Research via codebase context, docs, or WebSearch
- Present evidence: "Codex suggested X, but [evidence] shows Y is better here"
- Claude's position takes precedence when backed by evidence

**UNCERTAIN** — Genuine tradeoff:
- Present both approaches with pros/cons
- Let the user decide

### Disagreement Handling

Same protocol as codex-review: state disagreement, cite evidence, use WebSearch
if needed, identify as "Claude (Opus 4.6)" when resuming, user has final say.

## Step 6: Present Enhanced Plan

Format the output:

```
## Enhanced Plan

### Codex Model: {model} | Effort: {effort}
### Codex Assessment: {APPROVE / APPROVE WITH CHANGES / RETHINK}

### Original Plan Summary
{brief summary}

### Codex Feedback Integrated

#### Accepted Changes
- [Change with attribution and reasoning]

#### Rejected Suggestions
- Codex suggested X. Rejected because [evidence].

#### Open Questions
- [Tradeoff for user to decide]

### Updated Plan
{The enhanced plan with Codex insights integrated. This should be a
complete, actionable plan — not just a diff of changes.}

### Risk Register
| Risk | Severity | Mitigation |
|------|----------|------------|
| ... | ... | ... |
```

## Step 7: Offer Next Actions

After presenting the enhanced plan:

1. **Proceed to implementation** — Start building based on the enhanced plan
2. **Another Codex pass** — Iterate with updated plan (different model/effort)
3. **Resume session** — Pipe a follow-up to `codex exec resume --last`
4. **Save plan** — Write the enhanced plan to `.omc/plans/`
5. **Done** — Accept the plan as-is

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

## Integration with .omc/plans/

When plans exist in `.omc/plans/`:
- Read the most recent `.md` file as input
- After enhancement, offer to write the updated plan back
- Use the same filename with a `-v2` suffix or overwrite with user permission
