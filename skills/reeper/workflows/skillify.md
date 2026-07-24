> Part of the `reeper` skill. `SKILL.md` holds the operating principles and the
> non-negotiable gates that apply to this workflow.

# Reeper Skillify

Package a stable workflow interface, not a repository dump.

Read:

- `${CLAUDE_SKILL_DIR}/references/packaging.md`
- `${CLAUDE_SKILL_DIR}/references/security.md`
- `${CLAUDE_SKILL_DIR}/references/artifact-contract.md`

## 1. Analyze before designing

Identify:

- what users repeatedly ask the repository to do
- deterministic operations that belong in scripts
- judgment-heavy operations that belong in instructions
- inputs, outputs, side effects, permissions, and failure modes
- required CLIs, services, MCP servers, environment variables, and credentials
- whether it is primarily reference knowledge, an action workflow, a specialized agent, an MCP integration, or a standalone application

Use Repomix or the fingerprint script for large repositories, but read the actual entry points and docs before deciding on commands.

## 2. Focused interface interview

Ask exactly one material question at a time. Resolve:

- the primary callable job
- expected arguments
- whether Claude or only the user may invoke it
- read-only versus write/destructive behavior
- permission boundaries and approval gates
- required integrations and fallback behavior
- persistent state and generated artifacts
- installation scope: project skill, personal skill, plugin, or marketplace
- command names and discoverability triggers
- success and failure outputs

Recommend the narrowest interface that satisfies the job.

## 3. Design

Prefer this progression:

1. one action skill
2. supporting references and deterministic scripts
3. subagents only when context isolation or specialized permissions materially help
4. plugin wrapper when distribution or multiple components require it
5. marketplace wrapper only when installation from a Git repository is desired

Keep each `SKILL.md` under 500 lines when practical. Put large references in `references/`, executable helpers in `scripts/`, templates/assets in their own directories, and eval prompts in `evals/`.

## 4. Scaffold

For a standalone skill:

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/scaffold_skill.py" \
  --output <output-dir> \
  --name <skill-name> \
  --description "<what and when>"
```

For a plugin, create:

```text
<plugin>/
├── .claude-plugin/plugin.json
├── skills/<skill-name>/SKILL.md
├── agents/                 # only when justified
├── scripts/
├── references/
└── evals/
```

For marketplace distribution, add a repository-root `.claude-plugin/marketplace.json` and keep the plugin self-contained beneath its declared source path.

## 5. Validate and test

Create at least:

- three should-trigger prompts
- three should-not-trigger prompts
- two happy-path execution prompts
- two ambiguity/conflict prompts
- one denied or unsafe operation prompt
- one missing-dependency prompt

Validate locally when Claude Code supports it:

```bash
claude plugin validate <marketplace-or-plugin-path>
```

Test the exact installation and invocation commands. Report any validation that could not be run.

## 6. Deliver

Provide:

- generated path
- installation command
- callable command(s)
- required dependencies/integrations
- permission and security notes
- test/eval status
- version bump guidance
