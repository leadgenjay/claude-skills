# Session Artifact Contract

Each Reeper session lives at:

```text
.reeper/sessions/<session-slug>/
```

## Required files

### `manifest.json`

Machine-readable state: source, target, timestamps, phase statuses, approval state, source commit, license, selected mode, and generated paths.

### `intake.md`

Original request, initial goal, source, target, known constraints, and assumptions.

### `source-profile.md`

Evidence-backed source analysis.

### `target-profile.md`

Evidence-backed target analysis.

### `conflict-matrix.md`

Source/target mismatches, strategies, risk, decision status, and consequences.

### `decisions.md`

Append-only decision log. Each decision includes date, question, recommendation, chosen answer, rationale, affected artifacts, and superseded decisions when applicable.

### `integration-contract.md`

The user-approved source of truth for implementation and verification.

### `plan.md`

Ordered implementation phases, exact files, migrations, rollout, rollback, and checks.

### `tasks.md`

Small executable tasks with dependencies, status, file paths, and validation.

### `verification.md`

Acceptance criteria and evidence.

### `provenance.json`

Machine-readable mapping of source paths/components to target paths/components and transformation strategy.

## Editing rules

- `decisions.md` is append-only except for correcting factual transcription errors.
- Supersede a decision explicitly instead of silently rewriting history.
- The Integration Contract may evolve before approval. After approval, material changes require a new approval entry.
- Profiles contain facts and labeled inference, not user decisions.
- Verification reports facts, failures, and untested items without optimism inflation.
