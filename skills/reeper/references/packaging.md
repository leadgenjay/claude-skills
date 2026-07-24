# Packaging a Repository as a Callable Skill or Plugin

## Choose the correct primitive

### Reference skill

Use when Claude needs conventions, APIs, domain knowledge, or repository architecture while doing other work. It should not pretend to execute a workflow.

### Action skill

Use for a repeatable multi-step job with clear inputs, outputs, guardrails, and completion checks. It becomes a slash command.

### Subagent

Use when work should happen in isolated context, requires specialized tool access, or repeatedly reads many files. A subagent is not a substitute for a user-facing command; it usually supports a skill.

### Plugin

Use when distribution needs multiple skills, agents, hooks, scripts, MCP servers, or shared references. Plugin skills are invoked as `/plugin-name:skill-name`.

### Marketplace

Use when users should install the plugin from a Git repository with `/plugin marketplace add owner/repo` and `/plugin install plugin@marketplace`.

### MCP server

Use when the core value is reliable interaction with an external service or API. Keep judgment-heavy workflow guidance in a skill and deterministic API operations in MCP tools.

### Standalone application

Do not disguise an application, daemon, service, or UI as a skill. A skill can operate it, but packaging instructions are not the application itself.

## Interface design

Define:

- one primary job per skill
- concrete invocation examples and argument format
- what Claude can infer and what requires a question
- side effects and approval gates
- deterministic helper scripts
- persistent state and artifact locations
- dependencies and fallback behavior
- success, partial success, and failure outputs

## Progressive disclosure

Recommended layout:

```text
skills/<name>/
├── SKILL.md
├── references/
├── scripts/
├── templates/
├── examples/
└── evals/
```

Keep the main skill concise. Load detailed references only when their phase or condition applies. Execute deterministic scripts rather than asking the model to reproduce fragile transformations manually.

## Invocation safety

Use `disable-model-invocation: true` for workflows that write files, publish, deploy, delete, migrate, send messages, or incur meaningful cost. Use automatic invocation only for safe reference knowledge or clearly bounded read-only workflows.

## Distribution layout

```text
repo-root/
├── .claude-plugin/
│   └── marketplace.json
└── plugins/<plugin-name>/
    ├── .claude-plugin/plugin.json
    ├── skills/<skill-name>/SKILL.md
    ├── agents/
    ├── scripts/
    └── references/
```

Install:

```text
/plugin marketplace add owner/repo
/plugin install <plugin-name>@<marketplace-name>
```

Invoke:

```text
/<plugin-name>:<skill-name> <arguments>
```

## Evaluation set

At minimum, test:

- should trigger
- should not trigger
- direct invocation with valid arguments
- missing argument recovery
- ambiguous or conflicting requirements
- unsafe or denied operation
- missing dependency or integration
- partial failure and resumability
- idempotent rerun behavior

## Repository-derived skills

A generated repository reference from Repomix can accelerate understanding, but it is not a finished action skill. Curate the interface, strip irrelevant implementation detail, define permissions, and add workflow-specific tests.
