# /handoff — Manual Session Handoff

Save current session context as a handoff for resuming after `/clear`.

## When to Use
- Before running `/clear` to start fresh
- When context is getting high (70%+) and you want a clean breakpoint
- Before switching to a different task in the same project

## Trigger
- `/handoff`
- `/handoff [description]`

## Instructions

When this skill is invoked:

1. **Assess current session state** by reviewing your conversation context:
   - What was the user's original request?
   - What have you accomplished so far?
   - What decisions were made and why?
   - What files were modified or read?
   - What's left to do?
   - Are there any blockers or errors?

2. **Write a YAML handoff file** to `{cwd}/.omc/handoffs/{timestamp}_{description}.yaml`:

```yaml
# Handoff — {timestamp}
goal: "The user's original request in one sentence"
now: "What was being worked on when handoff was created"
done_this_session:
  - "Completed item 1"
  - "Completed item 2"
blockers:
  - "Any blockers or issues" # or []
decisions:
  - "Key decision 1 and rationale"
  - "Key decision 2 and rationale"
findings:
  - "Important discovery or learning"
next:
  - "Next step 1"
  - "Next step 2"
files:
  modified:
    - "path/to/file1"
    - "path/to/file2"
  read:
    - "path/to/file3"
errors:
  - "Any unresolved errors" # or []
git_branch: "current-branch"
```

3. **Write a plan-formatted markdown handoff** to `~/.claude/plans/handoff-{timestamp}.md`:

```markdown
# Session Handoff — {timestamp}

## Goal
{goal}

## Current State
{what was being worked on}

## Done This Session
{files modified, commands run}

## Key Decisions
{decisions and rationale}

## Next Steps
{what to do next}

## Files
**Modified:** {list}
**Read:** {list}

## Git
Branch: `{branch}`

## Instructions
This is an auto-generated handoff. Resume from the goal above.
```

4. **Keep both files concise** (~2000 chars max). Truncate aggressively:
   - `goal` and `now`: max 200 chars each
   - List items: max 150 chars each
   - `files.modified`: max 10 entries
   - `files.read`: max 10 entries
   - `decisions`: max 5 entries

5. **Rotate old handoff files:**
   - Keep last 5 YAML files in `.omc/handoffs/`
   - Keep last 3 plan files matching `handoff-*.md` in `~/.claude/plans/`

6. **Confirm** and tell the user:
   - "Handoff saved. Run `/clear` for a clean start."
   - "To resume: enter plan mode, select the handoff plan file, choose 'Yes, clear context and continue'."

## How It Works

- **`/clear`** is always a clean clear — no auto-injection
- **`/handoff`** is the only way to manually save context
- **PreCompact** also auto-generates handoff files during automatic compaction
- **Resume** by entering plan mode with the handoff plan file — native "clear context and continue" reloads it

## File Naming
- YAML: `{YYYY-MM-DDTHH-MM-SS}_{description}.yaml`
- Plan: `handoff-{YYYY-MM-DDTHH-MM-SS}.md`
- Description from argument or auto-derived from goal
