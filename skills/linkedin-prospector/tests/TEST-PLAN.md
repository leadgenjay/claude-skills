# Aimfox campaign authoring test plan

Offline subprocess tests use the existing static HTTP mock and request log; unmatched requests cannot reach the network. Tests run both the prospector entry and standalone Aimfox entry from an unrelated directory.

- Validate shell required fields, exact account selection/workspace, INIT state, and identifier/body envelopes.
- Repair blank/nonblank notes, append absent welcome, replace a mismatched first step by deleting from the end and appending the desired step; verify exact token/type/delay/null and existing campaignFacts.
- Refuse active/running/unknown state, ownership ambiguity, workspace mismatch, missing or enabled safety switches and nonblank connect optimization before writes.
- Verify login-token POST has empty body and no account_id, route A then session fallback, no session persistence or output, and no retry/fallback after an uncertain/failed write.
- Reject malformed flags, IDs, names, JSON files and conflicting input modes before HTTP effects; standalone no args/help/preview never writes, preview lists bounded methods and sanitized bodies.
- Fail nonzero on malformed provider envelopes, failed HTTP/write status, changed state or failed final readback. Preserve exact resource IDs in sanitized partial-error context.
- Assert read commands positively project fields and never expose nested session/key/private account fields. Complete-list parsing rejects pagination indicators instead of pretending a partial list is complete.

Run targeted node --test, then the requested full run-tests.sh (including temporary local Postgres SQL tests). No live provider calls, spending, audience changes, campaign-state PATCH or campaign start occur during tests.
