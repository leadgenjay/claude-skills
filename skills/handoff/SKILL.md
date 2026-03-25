# /handoff — Manual Session Handoff

Create a structured YAML handoff that preserves session context across `/clear` or compaction.

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

3. **Keep the YAML under 2000 characters** (~400-500 tokens). Truncate aggressively:
   - `goal` and `now`: max 200 chars each
   - List items: max 150 chars each
   - `files.modified`: max 10 entries
   - `files.read`: max 10 entries
   - `decisions`: max 5 entries

4. **Confirm** the handoff was saved and suggest:
   - "Handoff saved. Run `/clear` to start fresh — the handoff will auto-load."

## File Naming
- Format: `{YYYY-MM-DDTHH-MM-SS}_{description}.yaml`
- Description from argument or auto-derived from goal
- Example: `2026-03-25T14-30-00_smart-context-system.yaml`

## Rotation
Keep only the 5 most recent handoff files. Delete older ones after writing.
