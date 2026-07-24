# Reeper Workflow

Reeper is an adaptation workflow, not a clone-and-pray command.

## Phase model

| Phase | Name | Required output | Gate |
|---|---|---|---|
| 0 | Session | `manifest.json`, `intake.md` | source and target identified |
| 1 | Independent analysis | `source-profile.md`, `target-profile.md`, fingerprints | evidence sufficient to compare |
| 2 | Reconciliation | `conflict-matrix.md` | blocking conflicts identified |
| 3 | Interview | `decisions.md`, updated matrix | blocking decisions resolved |
| 4 | Contract | `integration-contract.md` | explicit user approval |
| 5 | Implementation | `plan.md`, `tasks.md`, code changes, `provenance.json` | checks executed |
| 6 | Verification | `verification.md` | acceptance status reported |
| 7 | Packaging | optional generated skill/plugin | install and invocation tested |

## Integration modes

### Transplant

Bring selected capabilities into the target while preserving target architecture. Default for existing applications.

### Reimplement

Recreate source behavior against target-native interfaces. Default when source architecture conflicts with target auth, data, billing, UI, or deployment systems.

### Fork

Use the source as the new application's base and adapt it. Choose only when the source should remain the architectural center of gravity.

### Vendor

Consume the source as a package, subtree, submodule, or vendored library behind a stable interface. Appropriate for libraries, engines, or isolated components.

### Reference only

Use source patterns and behavior as design evidence without copying code. Appropriate when licensing, quality, security, or architectural mismatch makes direct reuse undesirable.

## Evidence hierarchy

Prefer, in order:

1. source code and tests
2. manifests, schema, migrations, config, and CI
3. repository instructions and architectural docs
4. recent commit history and issues when available
5. README claims
6. inference

Label inference explicitly. Never convert an unverified README claim into an implementation requirement.

## Target-preserving principle

When integrating into an established target, its public contracts and operational systems remain authoritative unless the user deliberately approves replacement. Convenience is not a reason to replace auth, data, billing, deployment, or design systems.

## New-conflict rule

If implementation reveals a conflict that could change product behavior, data, security, external contracts, cost, rollout, or maintenance ownership, stop and return to the interview. Low-risk mechanical details can be resolved using recorded principles.
