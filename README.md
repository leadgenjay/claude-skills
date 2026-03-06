# LGJ n8n Skills for Claude Code

8 production-tested skills that make Claude Code an expert n8n workflow builder. Built from 24+ documented bugs, patches, and operational lessons.

## Quick Install

**One-liner** (run from your project root):

```bash
bash <(curl -s https://raw.githubusercontent.com/leadgenjay/claude-skills/LGJ-n8n-skills/install.sh)
```

**Or clone and copy manually:**

```bash
git clone --depth 1 --branch LGJ-n8n-skills https://github.com/leadgenjay/claude-skills.git /tmp/lgj-n8n-skills
cp -r /tmp/lgj-n8n-skills/skills/* .claude/skills/
rm -rf /tmp/lgj-n8n-skills
```

## What's Included

| Skill | Triggers When... |
|-------|-----------------|
| **n8n-code-javascript** | Writing JavaScript in n8n Code nodes |
| **n8n-code-python** | Writing Python in n8n Code nodes |
| **n8n-expression-syntax** | Using `{{ }}` expressions in n8n |
| **n8n-mcp-tools-expert** | Managing workflows via MCP tools |
| **n8n-node-configuration** | Configuring any n8n node |
| **n8n-safety** | Creating/updating/deleting workflows |
| **n8n-validation-expert** | Encountering validation errors |
| **n8n-workflow-patterns** | Designing workflow architecture |

## Key Bugs & Gotchas Embedded

These skills surface critical warnings automatically when relevant:

- **Code Node `.item` hang** — n8n v2 silently hangs forever when using `$('Node').item.json` in "All Items" mode
- **Think Tool schema** — Agent node typeVersion ≤ 2.2 breaks with both Anthropic and OpenAI
- **Wait Node** — Only accepts seconds, never milliseconds
- **Data Table** — Requires `__rl: true` and full schema in resourceMapper
- **PostgreSQL 9+ params** — `queryReplacement` breaks with 9+ parameters
- **GHL OAuth** — Tokens expire unpredictably; use v1 API key instead
- **Error handler cascading** — Email rate limits cause error notifications to fail

## Requirements

- [Claude Code](https://claude.ai/claude-code) CLI
- Skills are placed in `.claude/skills/` in your project directory
- No dependencies — skills are pure markdown that Claude reads automatically

## Structure

```
skills/
├── n8n-code-javascript/
│   ├── SKILL.md              # Main skill (auto-loaded)
│   ├── BUILTIN_FUNCTIONS.md  # $helpers, DateTime, $jmespath
│   ├── COMMON_PATTERNS.md    # 10 production patterns
│   ├── DATA_ACCESS.md        # $input, $node, v2 compat
│   └── ERROR_PATTERNS.md     # Top 5 errors
├── n8n-code-python/
│   ├── SKILL.md
│   ├── COMMON_PATTERNS.md
│   ├── DATA_ACCESS.md
│   ├── ERROR_PATTERNS.md
│   └── STANDARD_LIBRARY.md
├── n8n-expression-syntax/
│   ├── SKILL.md
│   ├── COMMON_MISTAKES.md
│   └── EXAMPLES.md
├── n8n-mcp-tools-expert/
│   ├── SKILL.md
│   ├── SEARCH_GUIDE.md
│   ├── VALIDATION_GUIDE.md
│   └── WORKFLOW_GUIDE.md
├── n8n-node-configuration/
│   ├── SKILL.md
│   ├── DEPENDENCIES.md
│   ├── OPERATION_PATTERNS.md
│   └── references/
│       ├── NODE_GOTCHAS.md
│       └── N8N_V2_MIGRATION.md
├── n8n-safety/
│   └── SKILL.md
├── n8n-validation-expert/
│   ├── SKILL.md
│   ├── ERROR_CATALOG.md
│   └── FALSE_POSITIVES.md
└── n8n-workflow-patterns/
    ├── SKILL.md
    ├── ai_agent_workflow.md
    ├── database_operations.md
    ├── http_api_integration.md
    ├── scheduled_tasks.md
    └── webhook_processing.md
```

## License

MIT

## Credits

Built by [Lead Gen Jay](https://leadgenjay.com) from production n8n workflow experience across LeadGenJay and NextWave instances.
