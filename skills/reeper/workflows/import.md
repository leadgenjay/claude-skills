> Part of the `reeper` skill. `SKILL.md` holds the operating principles and the
> non-negotiable gates that apply to this workflow.

# Reeper Import

Adapt an external repository to the current project without treating either codebase as disposable.

## Non-negotiable gates

1. Do not run source install, build, setup, migration, hook, or executable scripts during analysis.
2. Do not copy secrets, `.env` values, tokens, private keys, generated credentials, or local machine state.
3. Do not modify application code until the user explicitly approves the written Integration Contract.
4. Do not overwrite target architecture by default. Preserve target conventions unless a recorded decision says otherwise.
5. Pin the source to an exact commit SHA and record its license before implementation.
6. Use an isolated branch or worktree for implementation when the target is a Git repository.
7. Keep imported code attributable. Record copied, adapted, replaced, and rejected components in provenance artifacts.

## Inputs

Parse `$ARGUMENTS` into:

- `source`: first repository URL, `owner/repo`, or local path
- `goal`: remaining text; if missing, infer only the broad goal and obtain specifics during the interview
- `target`: current working directory unless the user explicitly names another directory

If the source cannot be identified, ask only for the source repository. Otherwise begin immediately.

## Load the operating guides

Read these before proceeding:

- `${CLAUDE_SKILL_DIR}/references/workflow.md`
- `${CLAUDE_SKILL_DIR}/references/security.md`
- `${CLAUDE_SKILL_DIR}/references/conflict-resolution.md`
- `${CLAUDE_SKILL_DIR}/references/interview-taxonomy.md`
- `${CLAUDE_SKILL_DIR}/references/artifact-contract.md`

Read `${CLAUDE_SKILL_DIR}/references/packaging.md` only if the requested outcome includes a callable skill, command, plugin, agent, MCP server, or reusable automation.

## Phase 0 — Create a durable session

Run:

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/new_session.py" \
  --source "<source>" \
  --target "<target>" \
  --goal "<goal>"
```

Use the returned session directory for every artifact. Never create parallel ad-hoc planning files elsewhere.

Update `manifest.json` as phases advance. A phase is complete only when its required artifact exists and contains no unresolved placeholder for that phase.

## Phase 1 — Evidence-first analysis

Analyze source and target independently before comparing them.

### Source analysis

Prefer a read-only source analyst subagent. For a remote repository, prefer Repomix when available:

```bash
npx repomix@latest --remote <source> --compress --output /tmp/reeper-<session>-source.xml
```

Fallback: clone with the bundled safe clone script. Do not install dependencies or initialize submodules.

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/safe_clone.sh" \
  "<source>" "<session-dir>/source-checkout"
```

Run the fingerprint tool against the resulting local tree when one exists:

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/repo_fingerprint.py" \
  "<source-path>" --json-out "<session-dir>/source-fingerprint.json"
```

Write `source-profile.md` with evidence-backed findings:

- exact source URL/path, branch/ref, commit SHA, license, and repository status
- product purpose and primary workflows
- architecture and module boundaries
- runtime, language, frameworks, package manager, and build/test commands
- authentication, authorization, database, billing, storage, queues, email, analytics, observability, and deployment assumptions
- environment variable names only, never values
- schema and migration behavior
- reusable feature slices and their dependency closure
- generated code, vendored code, binaries, migrations, hooks, scripts, and supply-chain risks
- what must not be executed before trust approval

Every important finding must cite a source path, symbol, manifest entry, or configuration file.

### Target analysis

Use a separate read-only target analyst subagent when available. Run:

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/repo_fingerprint.py" \
  "<target>" --json-out "<session-dir>/target-fingerprint.json"
```

Write `target-profile.md` covering:

- existing architecture and conventions
- project instructions from `CLAUDE.md`, `AGENTS.md`, rules, skills, and package-level guidance
- protected systems and likely non-negotiables
- auth, data, billing, UI/design system, integrations, deployment, testing, and CI
- current git state and active user changes
- extension points where the source can integrate cleanly
- constraints inferred from actual code versus assumptions still needing confirmation

Do not call something a conflict until both profiles contain supporting evidence.

## Phase 2 — Build the conflict matrix

Compare source and target using `${CLAUDE_SKILL_DIR}/references/conflict-resolution.md`.

Write `conflict-matrix.md`. Each row must contain:

- area
- source behavior and evidence
- target behavior and evidence
- impact if copied unchanged
- viable strategies
- recommended strategy
- decision status: `auto-resolved`, `needs-user`, `deferred`, or `rejected`
- implementation consequence
- verification consequence

Also classify each source capability as one of:

- preserve unchanged
- adapt
- reimplement against target interfaces
- replace with target capability
- isolate behind an adapter
- vendor as a dependency
- reject
- reference only

Use target-preserving defaults for low-risk conflicts. Mark high-risk, product-defining, irreversible, expensive, security-sensitive, data-destructive, or license-sensitive choices as `needs-user`.

## Phase 3 — Deep conflict interview

Interview only after the conflict matrix exists.

Rules:

1. Ask exactly one question per message.
2. Ask only questions whose answers materially alter architecture, scope, data handling, security, integration behavior, rollout, verification, maintenance, licensing, or packaging.
3. Lead with a recommendation grounded in the profiles and conflict matrix.
4. Prefer 2–4 mutually exclusive options, plus a concise custom-answer route when useful.
5. Explain the consequence of each option in one sentence.
6. Never reveal a backlog of future questions.
7. After every accepted answer:
   - append it to `decisions.md`
   - update affected conflict rows
   - update the draft `integration-contract.md`
   - remove contradicted assumptions rather than leaving both versions
8. If the user says to use your judgment, auto-resolve low- and medium-risk items. Continue asking high-risk questions.
9. Continue until all blocking conflicts are resolved. Depth is determined by real conflicts, not an arbitrary question count.

Interview areas are defined in `interview-taxonomy.md`. Skip any area already proven by the repositories or the user's earlier answers.

## Phase 4 — Present the Integration Contract

Complete `integration-contract.md` with:

- outcome and success criteria
- selected integration mode
- exact capabilities in and out of scope
- target systems that remain authoritative
- source components to preserve, adapt, replace, reimplement, isolate, vendor, reject, or reference
- dependency and version decisions
- data model and migration rules
- environment variable names and ownership
- API and integration mappings
- UI/design-system mapping
- security and trust boundaries
- license and attribution obligations
- rollout and rollback approach
- testing and acceptance criteria
- packaging/distribution plan, when applicable
- unresolved non-blockers and assumptions

Run a self-review for contradictions, unsupported claims, placeholders, hidden destructive operations, and untestable acceptance criteria.

Then show the user a concise contract summary and ask this exact gate question:

> Approve this Integration Contract and begin implementation?

Do not implement unless the user clearly approves.

## Phase 5 — Plan and implement in isolation

After approval:

1. Create or select an isolated branch/worktree named `reeper/<session-slug>` unless the user specifies another strategy.
2. Write `plan.md` with ordered phases, exact files, dependency order, migration steps, rollback steps, and verification commands.
3. Write `tasks.md` with small independently verifiable tasks. Mark safe parallel tasks.
4. Prefer adapters and target-native reimplementation over wholesale copying when source and target architectures differ.
5. Preserve git history or source attribution where practical.
6. Never silently replace a target integration merely because the source implementation is easier to copy.
7. Implement incrementally and validate after each coherent slice.
8. Update `provenance.json` with every imported or materially adapted source path.
9. Stop and return to the interview if implementation reveals a new blocking conflict.

## Phase 6 — Verify the result

Use the verification auditor agent when available. Verify against the Integration Contract, not merely against compilation.

Write `verification.md` containing:

- commands run and results
- acceptance criteria status
- source capability parity status
- target regression checks
- data migration and rollback checks
- security and secret scan results
- license/attribution check
- runtime/browser verification when applicable
- remaining risks, manual checks, and known deviations

Run:

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/validate_session.py" "<session-dir>"
```

Do not claim completion while required artifacts fail validation or acceptance criteria remain unreported.

## Phase 7 — Optional skillification

When the user wants the imported/customized repository exposed as a callable workflow, invoke the skillify workflow (`workflows/skillify.md`) conceptually and follow `packaging.md`.

Distinguish between:

- a reference skill that teaches Claude how the repo works
- an action skill that runs a repeatable workflow
- a Claude Code plugin that bundles skills, agents, hooks, scripts, or MCP servers
- a standalone application that should not be disguised as a skill

A repository is not automatically a good skill. Package the smallest stable workflow interface, not the entire codebase dump.

## Completion response

Report:

- session directory
- source commit and license
- integration mode
- key decisions
- files/features integrated
- checks passed and failed
- packaging command if created
- branch/worktree and next human action

Never hide deviations from the approved contract.
