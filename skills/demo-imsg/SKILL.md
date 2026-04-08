---
name: demo-imsg
version: 1.1.0
description: Generate an iMessage conversation video simulating Jay texting Bob (his AI assistant) to showcase any Claude Code skill. Renders as transparent ProRes .mov or MP4 via Remotion.
triggers: "imessage demo, imessage video, text demo, bob demo, phone demo, message demo, simulate imessage"
---

# iMessage Demo Generator

You generate short MOV/MP4 videos that simulate an iMessage conversation between Jay and Bob (his AI assistant) inside a full-screen iPhone frame. You read a target skill's SKILL.md, extract its most impressive capabilities, and script a realistic text exchange that showcases the skill.

No live execution. You author a scripted conversation based on deep skill analysis.

## Invocation

```
/demo-imsg {skill-name}
```

Maps to `.claude/skills/{skill-name}/SKILL.md`. If the skill is not found, list available skills with `ls .claude/skills/` and suggest the closest match.

---

## Pipeline

### Step 1: Read target skill

Read `.claude/skills/{skill-name}/SKILL.md` completely. Extract:
- The single most impressive output (a score, a dollar amount, a time saved, a volume processed)
- Specific tools, APIs, or MCP servers used (these become Bob's "I'm using X" lines)
- The end deliverable (report, image, video, dataset, email sequence)
- Any numbers that demonstrate scale (e.g., "303 ads scraped", "97.8% score", "$30K in 2 months")

If the skill has no quantifiable results or clear deliverable, focus on the workflow automation angle: "what would take a human hours, Bob does in minutes."

### Step 2: Script the conversation

Write the `priorMessages` (static background) and `messages` (animated conversation).

#### Prior messages (fill the screen)

Write 7-10 prior messages to fill the screen above the new conversation. These are static and visible from frame 1. They establish that Jay and Bob have an ongoing working relationship.

**Prior message rules:**
- Alternate between Jay and Bob
- Reference real past tasks (publishing, research, ads, email campaigns)
- Last 1-2 prior messages should have `readReceipt` (e.g., "Read 2:34 PM")
- Keep casual and short (5-15 words each)

**Example prior messages:**
```json
[
  { "sender": "jay", "text": "Can you check if that carousel posted?" },
  { "sender": "bob", "text": "Posted to IG and LinkedIn. 47 likes in the first hour." },
  { "sender": "jay", "text": "Nice. What about the email blast?" },
  { "sender": "bob", "text": "Sent to 2,400 subscribers. 38% open rate so far." },
  { "sender": "jay", "text": "Perfect" },
  { "sender": "bob", "text": "Your 3pm call with Daniel starts in 10 minutes." },
  { "sender": "jay", "text": "Thanks, joining now" },
  { "sender": "bob", "text": "Good luck!", "readReceipt": "Read 2:51 PM" }
]
```

#### Animated messages (the demo)

Write 4-8 new messages that showcase the target skill. These animate in with typing indicators.

**Conversation constraints:**

| Rule | Constraint |
|------|-----------|
| Max characters per bubble | 120 chars (longer text wraps awkwardly at 75% bubble width) |
| Jay's first message | Casual request in everyday language ("Hey Bob, can you...") |
| Bob typing indicator | Shown before every Bob message (1.5s default). Jay messages appear instantly |
| Required: specific number | At least one Bob message must cite a concrete result (count, percentage, dollar amount, time) |
| Required: Jay reaction | At least one Jay message expresses genuine reaction ("That's insane", "Wait, seriously?", "Perfect") |
| Required: deliverable | Bob's final message confirms where the output lives or what happens next |
| Consecutive same-sender | Maximum 2 consecutive messages from the same sender |
| Tone | Jay: casual texting. Bob: helpful, concise, slightly formal. No emojis unless the skill output naturally includes them |

**Good example (meta-research skill):**
```json
[
  { "sender": "jay", "text": "Hey Bob, find cold email competitors and scrape their ads" },
  { "sender": "bob", "text": "Running meta-research pipeline..." },
  { "sender": "bob", "text": "Found 12 competitors, scraped 303 ads, transcribed 108 videos. Brief is ready." },
  { "sender": "jay", "text": "How long did that take?" },
  { "sender": "bob", "text": "4 minutes. Intelligence brief saved to your dashboard." },
  { "sender": "jay", "text": "Perfect, I'll review it now" }
]
```

**Bad example (too vague, no numbers, no deliverable):**
```json
[
  { "sender": "jay", "text": "Hey can you help me with some research?" },
  { "sender": "bob", "text": "Sure! I'd be happy to help with that." },
  { "sender": "jay", "text": "Great, do the competitor analysis thing" },
  { "sender": "bob", "text": "Done! I found some really interesting results." },
  { "sender": "jay", "text": "Awesome thanks" }
]
```

### Step 3: Set dateSeparator

Add a `dateSeparator` string between prior messages and new messages. Use today's date formatted as iMessage shows it:

```json
"dateSeparator": "Today 9:38 AM"
```

### Step 4: Generate manifest

Write the full manifest JSON:

```json
{
  "version": 1,
  "priorMessages": [
    { "sender": "jay", "text": "Can you check if that carousel posted?" },
    { "sender": "bob", "text": "Posted to IG and LinkedIn. 47 likes in the first hour." },
    { "sender": "jay", "text": "Nice. What about the email blast?" },
    { "sender": "bob", "text": "Sent to 2,400 subscribers. 38% open rate so far." },
    { "sender": "jay", "text": "Perfect" },
    { "sender": "bob", "text": "Your 3pm call with Daniel starts in 10 minutes." },
    { "sender": "jay", "text": "Thanks, joining now" },
    { "sender": "bob", "text": "Good luck!", "readReceipt": "Read 2:51 PM" }
  ],
  "dateSeparator": "Today 9:38 AM",
  "messages": [ ... ],
  "contactName": "Bob",
  "contactAvatarPath": "/Users/jayfeldman/Nextcloud/bob icon.png",
  "typingDurationFrames": 45,
  "pauseBetweenFrames": 30,
  "outputPreset": {
    "name": "vertical",
    "width": 1080,
    "height": 1920,
    "fps": 30,
    "crf": 23
  }
}
```

Save to: `~/Downloads/imessage-demo-{skill}/manifest.json`

#### Duration calculation

The composition auto-calculates total frames from your messages:
- Each Bob message: `typingDurationFrames` (45) + `pauseBetweenFrames` (30) = 75 frames (2.5s)
- Each Jay message: `pauseBetweenFrames` (30) = 30 frames (1s)
- End hold: 60 frames (2s)
- **Estimate:** 6 messages at default timing = ~12s video

### Step 5: Render

```bash
cd "/Users/jayfeldman/Documents/Tech & Dev/Studio Apps/social-media-tool"
npx tsx scripts/render-imessage-demo.ts ~/Downloads/imessage-demo-{skill}/manifest.json
```

Default output: ProRes 4444 `.mov` with transparency (same directory as manifest).

For MP4 (opaque black background):
```bash
npx tsx scripts/render-imessage-demo.ts ~/Downloads/imessage-demo-{skill}/manifest.json --mp4
```

For custom output path:
```bash
npx tsx scripts/render-imessage-demo.ts ~/Downloads/imessage-demo-{skill}/manifest.json ~/Desktop/demo.mov
```

**If render fails:** Check that Remotion is installed (`npx remotion --version`). The avatar file at `contactAvatarPath` must exist or the render will warn and show a gray initial instead.

### Step 6: Verify

Open the rendered video:
```bash
open ~/Downloads/imessage-demo-{skill}/imessage-demo.mov
```

Verify all of the following:
- [ ] iPhone frame fills entire 1080x1920 canvas with Dynamic Island and status bar
- [ ] Prior messages visible from first frame, filling the screen
- [ ] Date separator ("Today 9:38 AM") appears between prior and new messages
- [ ] Bob messages preceded by typing indicator (3 bouncing dots)
- [ ] Jay messages appear instantly (no typing indicator)
- [ ] Blue bubbles (#007AFF) for Jay (right), gray bubbles (#E5E5EA) for Bob (left)
- [ ] All text legible - no bubble text wrapping more than 3 lines
- [ ] Bob's avatar displays in nav bar
- [ ] Duration feels natural (10-20 seconds)
- [ ] At least one message contains a specific number or result

---

## Visual Specifications (Locked)

These are implementation constants. Do not modify unless changing the Remotion components.

| Element | Value |
|---------|-------|
| Canvas | 1080x1920 (phone fills entire canvas) |
| Bezel | #1C1C1E, 140px border radius, 30px padding |
| Dynamic Island | 320x95px pill, centered at top |
| Status bar | 120px height, "9:41", full signal/wifi/battery |
| Nav bar | 130px, "< Messages" + avatar + contact name |
| Input bar | 140px, camera icon + "iMessage" placeholder + send button |
| Jay bubbles | #007AFF (blue), right-aligned, 75% max width |
| Bob bubbles | #E5E5EA (gray), left-aligned, 75% max width |
| Font | SF Pro Text / system-ui, 42px messages, 38px status bar |
| Bubble padding | 24px vertical, 40px horizontal, 50px radius |
| Message entrance | Spring animation (damping: 28, stiffness: 180, mass: 0.8), opacity only |
| Typing indicator | 3 dots, 20px each, 14px gap, bounce cycle every 20 frames |
| Background | Transparent (ProRes 4444). Black with `--mp4` flag |

---

## Customization

### Timing presets

| Style | typingDurationFrames | pauseBetweenFrames | Effect |
|-------|--------------------:|-------------------:|--------|
| Default | 45 | 30 | Natural texting pace |
| Fast | 30 | 20 | Snappy, energetic |
| Dramatic | 60 | 45 | Builds suspense |
| Mixed | varies | varies | Set per-message in code |

### Change contact
- `contactName`: any name (default "Bob")
- `contactAvatarPath`: absolute path to avatar image (falls back to gray circle with initial)

### Canvas size
- Vertical (default): 1080x1920 - phone fills entire frame
- Square: 1080x1080 - phone will be smaller but centered

---

## Output Files

| File | Description |
|------|-------------|
| `manifest.json` | Remotion input props (editable for re-renders) |
| `imessage-demo.mov` | ProRes 4444 with transparency (default) |
| `imessage-demo.mp4` | H.264 opaque (only with `--mp4` flag) |

**Output location:** `~/Downloads/imessage-demo-{skill}/`

---

## Technical Details

- **Composition**: `remotion/compositions/imessage-demo/`
- **Render script**: `scripts/render-imessage-demo.ts`
- **Schema**: `remotion/compositions/imessage-demo/schemas/manifest.ts` (Zod validated)
- **Registered in**: `remotion/Root.tsx` as `IMessageDemo`
- **Dependencies**: Remotion v4 (already installed), no additional packages
- **Avatar handling**: Render script copies avatar into bundle directory via hard link (falls back to file copy)
