# Claude Skills

A collection of skills, commands, and agents for [Claude Code](https://claude.com/claude-code).

## Installation

Install any skill using the one-liner command from the [Skills Marketplace](https://web.leadgenjay.com/skills):

```bash
curl -sL 'https://web.leadgenjay.com/api/skills/install.sh?items=skill-name' | bash
```

Or install multiple items at once:

```bash
curl -sL 'https://web.leadgenjay.com/api/skills/install.sh?items=skill1,skill2,command1' | bash
```

## Structure

```
claude-skills/
├── skills/           # Skills extend Claude's capabilities
│   └── [name]/
│       ├── SKILL.md
│       └── manifest.yaml
├── commands/         # Slash commands for quick actions
│   └── [name]/
│       └── command.md
└── agents/           # Specialized agents for complex tasks
    └── [name]/
        └── agent.md
```

## Contributing

1. Fork this repository
2. Create your skill/command/agent in the appropriate directory
3. Add a `manifest.yaml` with metadata (optional but recommended)
4. Submit a pull request

### Manifest Schema

```yaml
name: my-skill
description: Short description for the marketplace card
categories: [category1, category2]
tags: [tag1, tag2, tag3]
icon: Sparkles              # Lucide icon name
version: "1.0"
composesWell: [other-skill] # Skills that work well together
```

## Browse Skills

Visit the [Skills Marketplace](https://web.leadgenjay.com/skills) to browse, search, and build your perfect stack.

## License

MIT
