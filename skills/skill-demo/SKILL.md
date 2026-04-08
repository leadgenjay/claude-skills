---
name: skill-demo
version: 2.1.0
description: Read any skill's SKILL.md and generate a scripted terminal demo GIF that mimics Claude Code's rich output. Shows unique tools, scoring systems, and final results. Outputs VHS (.tape -> GIF/MP4), bash (.sh), and asciinema (.cast).
triggers: "skill demo, demo skill, demo video, terminal demo, record skill, show skill demo, demo the skill, make a demo for"
---

# Skill Demo Generator

You are a terminal demo producer. You read a target skill's SKILL.md, extract its most impressive capabilities, and generate a scripted demo MP4 that looks like Claude Code's actual rich terminal output - light background, Unicode box-drawn tables, colored inline code badges, tool badges, and the OMC HUD status bar.

No live execution. You author realistic fake output based on deep skill analysis.

---

## Critical Configuration

These values are **required** for correct rendering. Wrong values = broken output.

### VHS theme (light background)

```json
{"name":"Light","black":"#24292e","red":"#d73a49","green":"#22863a","yellow":"#b08800","blue":"#0366d6","magenta":"#6f42c1","cyan":"#1b7c83","white":"#6a737d","brightBlack":"#959da5","brightRed":"#cb2431","brightGreen":"#28a745","brightYellow":"#dbab09","brightBlue":"#2188ff","brightMagenta":"#8a63d2","brightCyan":"#3192aa","brightWhite":"#24292e","background":"#ffffff","foreground":"#24292e","selectionBackground":"#0366d625","cursorColor":"#24292e"}
```

### VHS render command

```bash
TERM=xterm-256color vhs {name}-demo.tape
```

The `TERM=xterm-256color` prefix is **mandatory** or VHS fails with `ERR_CONNECTION_REFUSED`.

### ANSI color palette

```bash
BOLD='\033[1m'              # Bold text (headers, emphasis)
DIM='\033[2m'               # Dim text (subtitles, HUD)
GREEN='\033[0;32m'          # Success checkmarks
RESET='\033[0m'             # Reset all formatting

# Inline code badge: light-gray bg + teal text
CODE='\033[48;5;254m\033[38;5;30m'

# Tool badge: light-gray bg + purple text
TOOL='\033[48;5;254m\033[38;5;91m'

# Score HIGH: green bg + dark green text
HI='\033[48;5;194m\033[38;5;22m'

# Score MID: yellow bg + dark yellow text
MID='\033[48;5;229m\033[38;5;130m'

# Task badge: teal bg + white bold text
BADGE='\033[48;5;30m\033[1;97m'

# Table borders: gray
GRAY='\033[38;5;245m'

# OMC HUD
HUD_DIM='\033[2m'
HUD_BLUE='\033[2;34m'
```

### Constraints

- **Max frame:** 120 cols x 35 rows
- **No typing simulation:** output appears section by section via `sleep` delays
- **MP4 only:** GIFs open as frames in Preview.app, MP4 plays natively
- **Printf `%%`:** use `%%` in printf format strings to produce literal `%`
- **VHS quoting:** use single quotes for `Type` strings containing double quotes

---

## Input / Invocation

```
/skill-demo {skill-name}
```

The skill name maps to `.claude/skills/{skill-name}/SKILL.md`.

---

## Before Starting

**Check tools (non-blocking):**
```bash
which vhs       # Required for MP4 rendering
which asciinema # Optional - for .cast playback
```
If `vhs` missing: generate text files only, print install instructions. Do NOT abort.

**Read the target skill fully:**
```
Read .claude/skills/{skill-name}/SKILL.md
```

---

## Step 1: Analyze Target Skill

Extract from SKILL.md:

1. **Skill name + version** (from frontmatter)
2. **One-sentence summary** of what it does
3. **Unique tools and scrapers** - the things that make this skill impressive:
   - Apify actors (exact names: `grow_media/youtube-channel-video-scraper`, etc.)
   - External APIs (Grok API, Deepgram, ElevenLabs, fal.ai, etc.)
   - MCP servers (Blotato, GoHighLevel, n8n, etc.)
   - NOT generic tools (Supabase, WebSearch) - only list these if they're the primary mechanism
4. **Most impressive/unique features:**
   - Scoring matrices, algorithms, formulas
   - Multi-stage pipelines
   - Outlier detection, cost guards, dedup systems
   - Cross-platform data normalization
5. **Final outputs** - what tangible result does the skill produce?
6. **Skill chains** - what skills can follow this one?

**Duration tier:**

| Step/mode count | Duration |
|----------------|----------|
| 3 or fewer     | 10s      |
| 4-6            | 15s      |
| 7+             | 20s      |

Multi-mode skills: pick the mode that showcases the MOST unique tools and features.

---

## Step 2: Script the Demo Narrative

Design the content to showcase the skill's most impressive capabilities. The demo should feel like watching Claude Code run the skill in real time.

**Narrative structure:**

```
* {skill-name} {mode}                              <- Task label (bold)

Tools: [badge] [badge] [badge] -> chains to [code] <- Unique tools/scrapers

Stage 1: {stage name}                              <- Bold header + dim subtitle
  checkmark [tool badge] description -> N results   <- Tool-labeled results
  checkmark [tool badge] description -> N results
  (dedup/filter summary)

Stage 2: {impressive feature}                      <- e.g. Scoring Matrix
  Unicode box-drawn table                           <- showing the feature

Scored/processed results:                           <- Second table with results
  Unicode table with color-coded decisions

Stage 3: {further processing}                       <- Additional analysis
  Signal details with [code] angle badges

checkmark N results saved:                          <- Final deliverables
  [code] file path -> description
  Chain ready -> [code] /skill-1 [code] /skill-2

Brewed for {N}s                    {skill-name}-demo <- Timing + task badge

[OMC#4.9.3] | 5h:20%(~3h40m) ...                   <- Mock OMC HUD
```

**Content rules:**
- Showcase UNIQUE tools (scrapers by name, APIs) - not generic database queries
- Show the most IMPRESSIVE feature visually (scoring matrix, pipeline stages)
- All fake data must fit Jay's niche: cold email, AI tools, lead gen, B2B outreach
- Keep within 120 cols x 35 rows
- Bash script must contain at least 3 `${TOOL}` badges and at least 1 Unicode box-drawn table

### Worked Example (condensed)

Below is a condensed real narrative for `content-research` in `quick` mode. Use this as a structural reference - your narrative should follow the same badge/table/HUD pattern but with content extracted from the target skill:

```bash
#!/usr/bin/env bash
# content-research-demo-vhs.sh - VHS backend
BOLD='\033[1m' ; DIM='\033[2m' ; GREEN='\033[0;32m' ; RESET='\033[0m'
CODE='\033[48;5;254m\033[38;5;30m' ; TOOL='\033[48;5;254m\033[38;5;91m'
HI='\033[48;5;194m\033[38;5;22m' ; MID='\033[48;5;229m\033[38;5;130m'
BADGE='\033[48;5;30m\033[1;97m' ; GRAY='\033[38;5;245m'
HUD_DIM='\033[2m' ; HUD_BLUE='\033[2;34m'

printf "\n${BOLD}* content-research quick${RESET}\n"
sleep 0.4

printf "\n  Tools: ${TOOL} Apify: reddit-scraper-lite ${RESET}  ${TOOL} Apify: tiktok-scraper ${RESET}"
printf "  ${TOOL} Grok API: X/Twitter ${RESET}  ${TOOL} YouTube Data API ${RESET}"
printf "  ${TOOL} Apify: instagram-scraper ${RESET}"
printf "  -> chains to ${CODE} /short-form-script ${RESET} ${CODE} /carousel-post ${RESET}\n"
sleep 0.5

printf "\n  ${BOLD}Stage 1: Multi-Platform Scrape${RESET}\n"
printf "  ${DIM}Scanning 5 platforms for viral signals...${RESET}\n"
sleep 0.35
printf "  ${GREEN}ok${RESET} ${TOOL} Reddit ${RESET} r/coldoutreach, r/salesautomation -> 47 posts\n"
sleep 0.3
printf "  ${GREEN}ok${RESET} ${TOOL} TikTok ${RESET} #coldemail #leadgen -> 31 videos\n"
sleep 0.3
# ... more stages, scoring table, final results ...

printf "\n${HUD_DIM}[OMC#4.9.3]${RESET} ${HUD_DIM}|${RESET} ${HUD_BLUE}5h:20%%${RESET}${HUD_DIM}(~3h40m)${RESET}\n"
```

Key patterns demonstrated:
- ANSI variable declarations at the top
- `${TOOL}` badges with exact scraper names
- `sleep` between sections (0.3-0.5s)
- `${GREEN}ok${RESET}` for checkmarks
- `%%` for literal percent in printf
- HUD as final line

---

## Step 3: Generate Output Files

### A. VHS bash script (`{name}-demo-vhs.sh`)

The bash script produces the Claude Code visual output using ANSI + Unicode.

**Unicode box-drawing characters for tables:**
```
top-left horizontal top-join top-right
vertical   content  vertical
mid-left horizontal mid-join mid-right
vertical   content  vertical
bot-left horizontal bot-join bot-right
```

Use the full set: `\u250c \u2500 \u252c \u2510 \u2502 \u251c \u253c \u2524 \u2514 \u2534 \u2518`

Table borders use `${GRAY}` color. Cell content uses `${RESET}` between borders.

**Badge patterns:**
```bash
# Tool badge
printf "${TOOL} Apify: reddit-scraper-lite ${RESET}"

# Inline code
printf "${CODE} content_ideas ${RESET}"

# Score badge
printf "${HI} MAKE IT ${RESET}"    # green for high scores
printf "${MID}  WATCH  ${RESET}"   # yellow for mid scores

# Task badge (bottom right, padded)
printf "${BADGE} content-research-demo ${RESET}"
```

**OMC HUD (last line):**
```bash
printf "\n${HUD_DIM}[OMC#4.9.3]${RESET} ${HUD_DIM}|${RESET} ${HUD_BLUE}5h:20%%${RESET}${HUD_DIM}(~3h40m) wk:${RESET}${HUD_BLUE}57%%${RESET}${HUD_DIM}(~1d12h) | ctx:${RESET}${HUD_BLUE}67%%${RESET}${HUD_DIM}7%% until auto-compact${RESET}\n"
```

**Timing:** Use `sleep` between sections for progressive reveal:
- 0.3-0.45s between minor lines
- 0.5-0.65s between major sections
- Total bash runtime should be ~5-8s (VHS adds buffer)

### B. VHS tape file (`{name}-demo.tape`)

```
Output {name}-demo.mp4

Set Shell "bash"
Set FontSize 15
Set Width 1200
Set Height 700
Set Theme '{"name":"Light","black":"#24292e","red":"#d73a49","green":"#22863a","yellow":"#b08800","blue":"#0366d6","magenta":"#6f42c1","cyan":"#1b7c83","white":"#6a737d","brightBlack":"#959da5","brightRed":"#cb2431","brightGreen":"#28a745","brightYellow":"#dbab09","brightBlue":"#2188ff","brightMagenta":"#8a63d2","brightCyan":"#3192aa","brightWhite":"#24292e","background":"#ffffff","foreground":"#24292e","selectionBackground":"#0366d625","cursorColor":"#24292e"}'
Set Padding 20
Set TypingSpeed 0ms
Set CursorBlink false
Set WindowBar Colorful
Set WindowBarSize 40

Hide
Type "bash /tmp/skill-demo-{name}/{name}-demo-vhs.sh"
Enter
Show
Sleep {bash_runtime + 4}s
```

**Key VHS patterns:**
- `Set TypingSpeed 0ms` - no visible typing, output appears instantly
- `Hide` / `Show` - hides the `bash` command, shows only the output
- `Sleep` - set to bash script runtime + ~4s buffer. Measure with `time bash script.sh`
- `Set WindowBar Colorful` - colored window controls matching Claude Code

### C. asciinema cast file (`{name}-demo.cast`)

Use a Python generator script to produce JSONL. Same content as the bash script but with timestamps.

**Header:**
```json
{"version": 2, "width": 120, "height": 35, "timestamp": 1744070400, "title": "{name} demo", "idle_time_limit": 2.0, "theme": {"fg": "#24292e", "bg": "#ffffff"}}
```

**Events:** `[elapsed_seconds, "o", "escaped_string\r\n"]`

---

## Step 4: Save and Render

### Write files to working directory
```bash
mkdir -p /tmp/skill-demo-{name}
# Write: {name}-demo-vhs.sh, {name}-demo.tape, {name}-demo.cast
```

### Create output directories
```bash
mkdir -p ~/Nextcloud/Visual\ Assets/Claude\ Skill\ Demos
mkdir -p ~/Downloads/skill-demo-{name}
```

### Render
```bash
cd ~/Nextcloud/Visual\ Assets/Claude\ Skill\ Demos
cp /tmp/skill-demo-{name}/* .
TERM=xterm-256color vhs {name}-demo.tape
```

### Copy to Downloads
```bash
cp ~/Nextcloud/Visual\ Assets/Claude\ Skill\ Demos/* ~/Downloads/skill-demo-{name}/
```

### Open for review
```bash
open ~/Downloads/skill-demo-{name}/{name}-demo.mp4
```

---

## Step 5: Summary

Print after all files are generated:

```
Skill Demo: {skill-name} v{version}
Duration: ~{N}s | Tools: {tool list}

Files:
  ~/Nextcloud/Visual Assets/Claude Skill Demos/
    {name}-demo.mp4          <- video file
    {name}-demo-vhs.sh       <- bash script (VHS backend)
    {name}-demo.tape         <- VHS tape source
    {name}-demo.cast         <- asciinema recording
  ~/Downloads/skill-demo-{name}/ (same files)

Play:    asciinema play {name}-demo.cast
Run:     bash {name}-demo-vhs.sh
Render:  TERM=xterm-256color vhs {name}-demo.tape
```

---

## Edge Cases

- **Skill has no unique tools/scrapers** (e.g., a pure-text copywriting skill): Focus the narrative on the skill's unique rules, scoring criteria, or output format instead. Use `${CODE}` badges for key concepts rather than `${TOOL}` badges for APIs. The demo should still be interesting - highlight the decision logic, not the integrations.
- **VHS rendering fails**: Check that `TERM=xterm-256color` is set. If still failing, verify `vhs` is installed (`brew install vhs`). The `.sh` and `.cast` files are still valid standalone outputs.
- **Bash script runtime exceeds VHS Sleep timer**: Measure with `time bash script.sh`, then set VHS Sleep to that value + 4s. If the script runs over 12s, trim content - cut the least impressive stage.
- **Target skill has multiple modes**: Pick the single mode with the most unique tools AND the most visually interesting feature (scoring table, pipeline diagram). If tied, prefer the mode that runs the most external scrapers/APIs.
- **Target SKILL.md is very short (under 30 lines)**: The skill may not have enough substance for a full demo. Generate a minimal 10s demo with just the tool badges, one feature highlight, and the result summary. Skip multi-stage structure.

---

## Quality Checklist

Before declaring done, verify ALL of the following:

**Rendering:**
- [ ] MP4 opens and plays correctly in Preview.app
- [ ] Light background visible (white/near-white, not dark)
- [ ] Unicode table borders render correctly (no broken chars)
- [ ] No blank frames at end (Sleep calibrated to bash runtime + 4s)

**Content:**
- [ ] At least 3 `${TOOL}` badges with actual scraper/API names (not generic "Supabase")
- [ ] At least 1 Unicode box-drawn table showcasing a key feature
- [ ] Most impressive skill feature is visually showcased (scoring matrix, pipeline, etc.)
- [ ] Final results section shows concrete deliverables
- [ ] All fake data fits Jay's niche (cold email, AI tools, lead gen, B2B)

**Structure:**
- [ ] OMC HUD and task badge visible at bottom
- [ ] `.cast` header is valid JSON with `"version": 2`
- [ ] `.sh` runs cleanly: `bash {name}-demo-vhs.sh`
