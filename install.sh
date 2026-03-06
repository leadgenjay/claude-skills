#!/bin/bash
# LGJ n8n Skills Installer for Claude Code
# Installs 8 n8n workflow-building skills into your project's .claude/skills/

set -e

SKILLS_DIR=".claude/skills"
REPO="leadgenjay/claude-skills"
BRANCH="LGJ-n8n-skills"
TEMP_DIR=$(mktemp -d)

echo "🔧 Installing LGJ n8n Skills..."

# Clone just the skills branch
git clone --depth 1 --branch "$BRANCH" "https://github.com/$REPO.git" "$TEMP_DIR" 2>/dev/null

# Create skills directory if it doesn't exist
mkdir -p "$SKILLS_DIR"

# Copy each skill
INSTALLED=0
for skill_dir in "$TEMP_DIR/skills/"*/; do
  skill_name=$(basename "$skill_dir")
  if [ -f "$skill_dir/SKILL.md" ]; then
    cp -r "$skill_dir" "$SKILLS_DIR/$skill_name"
    echo "  ✓ $skill_name"
    INSTALLED=$((INSTALLED + 1))
  fi
done

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Installed $INSTALLED n8n skills to $SKILLS_DIR/"
echo ""
echo "Skills activate automatically in Claude Code when you work on:"
echo "  • JavaScript/Python in n8n Code nodes"
echo "  • n8n expression syntax and validation"
echo "  • Workflow building and node configuration"
echo "  • MCP tool usage for n8n management"
