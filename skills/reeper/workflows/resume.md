> Part of the `reeper` skill. `SKILL.md` holds the operating principles and the
> non-negotiable gates that apply to this workflow.

# Resume a Reeper Session

Locate the requested session. If `$ARGUMENTS` is empty, inspect `.reeper/sessions/` and select the most recently modified session whose `manifest.json` is not complete.

Read, in order:

1. `manifest.json`
2. `source-profile.md`
3. `target-profile.md`
4. `conflict-matrix.md`
5. `decisions.md`
6. `integration-contract.md`
7. `plan.md`, `tasks.md`, and `verification.md` when present

Run:

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/validate_session.py" "<session-dir>" --allow-incomplete
```

Resume from the first incomplete phase. Do not repeat accepted interview questions. Do not discard user edits to session artifacts. Re-open the approval gate only when the Integration Contract changed materially after its last approval.

When resuming implementation, inspect git status and branch/worktree state before modifying files. Never assume an earlier command succeeded merely because it was planned.
