---
name: video-diagram
version: 1.0.0
description: "Create hand-drawn Excalidraw diagrams for YouTube videos and course content. Analyzes concepts and produces the clearest visual explanation using shorthand copy. This skill should be used when the user wants to create a diagram, flowchart, concept map, whiteboard visual, or any visual explanation for video/course content. Also use when the user mentions 'diagram,' 'flowchart,' 'concept map,' 'whiteboard,' 'visual diagram,' 'draw this out,' 'map this out,' 'diagram this,' or 'explain visually.'"
---

# Video Diagram — Excalidraw Visual Builder

You create **pre-drawn diagrams** that Jay annotates live on camera with Apple Pencil. Output: `.excalidraw` JSON files — hand-drawn aesthetic, editable, opens on iPad + Mac.

## Core Job

Read a script or concept → identify the 1-2 moments that NEED a visual → choose the BEST diagram type → generate shorthand labels → output `.excalidraw` file.

---

## Before Starting

**Gather from user (ask if not provided):**

| Context | Why |
|---------|-----|
| Topic / script | What concept needs a visual? |
| Audience level | Beginner = simpler, fewer nodes. Advanced = more detail OK |
| Key relationships | What connects to what? Sequential? Comparative? Hierarchical? |

**If user pastes a full script:** Scan it and identify the 1-2 concepts that would benefit MOST from a visual. Don't diagram everything — pick the moment where a visual makes the concept click.

---

## Diagram Type Selection (Critical Intelligence)

Do NOT default to flowcharts. Analyze the concept and pick the BEST format:

| Format | When to Use | Signal Words |
|--------|-------------|--------------|
| `flowchart` | Sequential steps, decision points, processes | "how to," "steps," "process," "setup" |
| `funnel` | Narrowing stages, conversion, filtering | "funnel," "pipeline," "stages," "conversion" |
| `concept-map` | Relationships, interconnected ideas, ecosystems | "ecosystem," "connected," "relates to," "pillars" |
| `comparison` | Two-column old vs new, pros/cons, A vs B | "vs," "compared to," "old way," "manual vs" |
| `matrix` | 2x2 categorization, effort/impact, quadrants | "quadrant," "categorize," "prioritize," "high/low" |
| `timeline` | Chronological progression, phases, roadmap | "timeline," "day 1," "phases," "over time" |
| `hierarchy` | Tree structure, org chart, layers, taxonomy | "layers," "breakdown," "under," "sub-categories" |
| `cycle` | Repeating process, feedback loop, flywheel | "loop," "cycle," "repeating," "feeds back," "flywheel" |

### Selection Rules
1. **Comparison beats flowchart** when there are two contrasting approaches
2. **Concept map beats hierarchy** when connections go both ways (not just parent→child)
3. **Cycle beats flowchart** when the last step feeds back to the first
4. **Funnel beats flowchart** when each stage filters/narrows
5. **Matrix beats comparison** when there are 2 dimensions to evaluate against

---

## Copy Style Rules (Non-Negotiable)

These rules are what make the diagrams feel like expert whiteboard notes, not AI slop:

| Rule | Example |
|------|---------|
| **MAX 4 words per label** (ideal: 2-3) | "Buy 3 Domains" not "Purchase three domain names" |
| **Use arrows** → and symbols | "Leads → MQL → SQL" |
| **Use abbreviations** | "infra," "config," "auth," "2wk," "10x," "$0" |
| **Use symbols** | ✓, ✗, $, %, #, @ |
| **NO articles** (a, an, the) | "Setup Mailbox" not "Set up the mailbox" |
| **NO filler verbs** (is, are, has) | "3 Domains" not "There are 3 domains" |
| **Use newlines** for 2-concept labels | "Warmup\n2 wks" |
| **Numbers > words** | "$300/mo" not "three hundred per month" |
| **Fragments > sentences** | "Ready?" not "Is it ready to send?" |

### Banned in Labels
- Complete sentences
- Articles (a, an, the)
- Banned AI words from CLAUDE.md (delve, leverage, seamless, etc.)
- Marketing fluff (powerful, amazing, incredible)

---

## JSON Spec Format

Generate this JSON and write to a temp file. The script handles all layout math.

```json
{
  "type": "flowchart",
  "title": "Cold Email Infra",
  "direction": "vertical",
  "nodes": [
    { "id": "domains", "label": "3 Domains", "shape": "box" },
    { "id": "warmup", "label": "Warmup\n2 wks", "shape": "box" },
    { "id": "ready", "label": "Ready?", "shape": "diamond" },
    { "id": "send", "label": "Send!", "shape": "box", "color": "green" }
  ],
  "edges": [
    { "from": "domains", "to": "warmup" },
    { "from": "warmup", "to": "ready" },
    { "from": "ready", "to": "send", "label": "Yes" }
  ]
}
```

### Field Reference

**Top-level:**
| Field | Required | Values |
|-------|----------|--------|
| `type` | Yes | `flowchart`, `funnel`, `concept-map`, `comparison`, `matrix`, `timeline`, `hierarchy`, `cycle` |
| `title` | Yes | Short title (under 5 words) |
| `direction` | No | `vertical` (default) or `horizontal` — flowchart/hierarchy only |
| `axes` | No | `{ "x": "Label", "y": "Label" }` — matrix only |

**Nodes:**
| Field | Required | Values |
|-------|----------|--------|
| `id` | Yes | Unique string identifier |
| `label` | Yes | Display text (MAX 4 words, use `\n` for line breaks) |
| `shape` | No | `box` (default), `rounded`, `diamond`, `circle` |
| `color` | No | `red`, `blue`, `green`, `orange` (default: black ink) |
| `group` | No | `left`/`right` or `a`/`b` or `old`/`new` — comparison only |
| `quadrant` | No | `tl`, `tr`, `bl`, `br` — matrix only |
| `center` | No | `true` — concept-map center node |

**Edges:**
| Field | Required | Values |
|-------|----------|--------|
| `from` | Yes | Source node ID |
| `to` | Yes | Target node ID |
| `label` | No | Edge label (1-2 words max) |

### Shape Usage Guide
| Shape | When |
|-------|------|
| `box` | Default, most concepts |
| `rounded` | Start/end states, soft items |
| `diamond` | Decision points, questions (Yes/No branches) |
| `circle` | Central/key concepts, hub nodes |

### Color Usage (Minimalist)
- **Default (black):** 80%+ of elements — most nodes should be black ink
- **Red:** Bad things, warnings, old way, problems
- **Green:** Good things, success, new way, goals
- **Blue:** Categories, grouping, neutral differentiation
- **Orange:** Caution, in-progress, transition states

---

## Examples Per Type

### Comparison
```json
{
  "type": "comparison",
  "title": "Manual vs AI",
  "nodes": [
    { "id": "m-vol", "label": "50 emails/day", "group": "left", "color": "red" },
    { "id": "m-cost", "label": "$4K/mo SDR", "group": "left", "color": "red" },
    { "id": "m-pers", "label": "Generic ✗", "group": "left", "color": "red" },
    { "id": "a-vol", "label": "1000+ /day", "group": "right", "color": "green" },
    { "id": "a-cost", "label": "$300/mo", "group": "right", "color": "green" },
    { "id": "a-pers", "label": "Personalized ✓", "group": "right", "color": "green" }
  ],
  "edges": []
}
```

### Concept Map
```json
{
  "type": "concept-map",
  "title": "Content Engine",
  "nodes": [
    { "id": "center", "label": "Content\nEngine", "shape": "circle", "center": true },
    { "id": "edu", "label": "Educational", "color": "blue" },
    { "id": "auth", "label": "Authority", "color": "green" },
    { "id": "engage", "label": "Engagement", "color": "orange" },
    { "id": "leads", "label": "Lead Gen", "shape": "rounded" }
  ],
  "edges": [
    { "from": "center", "to": "edu" },
    { "from": "center", "to": "auth" },
    { "from": "center", "to": "engage" },
    { "from": "edu", "to": "leads" },
    { "from": "auth", "to": "leads" },
    { "from": "engage", "to": "leads" }
  ]
}
```

### Cycle
```json
{
  "type": "cycle",
  "title": "Content Loop",
  "nodes": [
    { "id": "create", "label": "Create" },
    { "id": "publish", "label": "Publish" },
    { "id": "engage", "label": "Engage" },
    { "id": "analyze", "label": "Analyze" },
    { "id": "optimize", "label": "Optimize" }
  ]
}
```

---

## Workflow

1. **Analyze** the concept — what visual format would make this click?
2. **Pick the BEST type** — use selection rules above, not defaulting to flowchart
3. **Write shorthand labels** — MAX 4 words, fragments not sentences
4. **Generate JSON spec** — write to `/tmp/diagram-spec-{slug}.json`
5. **Run the script:**
   ```bash
   node scripts/generate-diagram.mjs /tmp/diagram-spec-{slug}.json
   ```
6. **Open for review:**
   ```bash
   open output/diagrams/{slug}.excalidraw
   ```
7. **Save winner to Nextcloud** (after review passes):
   ```bash
   mkdir -p ~/Nextcloud/YouTube/Diagrams/{video-slug}/
   cp output/diagrams/{slug}.excalidraw ~/Nextcloud/YouTube/Diagrams/{video-slug}/
   ```
   Each video gets its own subfolder inside `Diagrams/`. Use the video's slug (e.g., `openclaw-to-channels-2026`, `ai-plan-video-1`). All diagrams for that video go in the same folder.
8. **Tell Jay** the file is ready — synced to Nextcloud and opens on iPad + Mac via excalidraw.com

### If Output Needs Adjustment
- Edit the JSON spec (add/remove nodes, change type, adjust labels)
- Re-run the script — it overwrites the output

---

## Quality Checklist

Before delivering, verify:

- [ ] Diagram type is the BEST choice for this concept (not just a flowchart)
- [ ] ALL labels are 4 words or fewer
- [ ] No complete sentences anywhere
- [ ] Uses shorthand/abbreviations where natural
- [ ] 4-15 nodes total (not too sparse, not cluttered)
- [ ] Color used sparingly (80%+ black ink)
- [ ] Shapes are semantically correct (diamonds only for decisions)
- [ ] Title is under 5 words
- [ ] Key concepts from the brief are all represented
- [ ] No banned AI words in any label
- [ ] Edges create meaningful relationships (not random connections)
- [ ] Enough spacing for Jay to annotate with Apple Pencil
- [ ] **NO overlapping lines** — every arrow must be traceable from source to target
- [ ] **NO overlapping shapes** — every node must have clear separation from neighbors
- [ ] **Concept-map sub-items are near their parent** — tier 2 nodes radiate outward from tier 1, not scattered randomly

---

## Mandatory Self-Review (Non-Negotiable)

**ALWAYS review each generated diagram before delivering to Jay.** After running `generate-diagram.mjs`:

### Step 1: Programmatic Position Audit (REQUIRED)

Run this verification script for EVERY generated diagram:
```bash
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('output/diagrams/SLUG.excalidraw','utf8'));
const shapes = data.elements.filter(e => ['rectangle','ellipse','diamond'].includes(e.type));
const texts = data.elements.filter(e => e.type === 'text' && e.containerId);
shapes.forEach(s => {
  const t = texts.find(t => t.containerId === s.id);
  const label = t ? t.text.replace(/\n/g,' ') : '???';
  console.log(\`\${label.padEnd(30)} x=\${s.x.toFixed(0)} y=\${s.y.toFixed(0)} w=\${s.width.toFixed(0)} h=\${s.height.toFixed(0)}\`);
});
for (let i = 0; i < shapes.length; i++) {
  for (let j = i+1; j < shapes.length; j++) {
    const a = shapes[i], b = shapes[j];
    if (a.x < b.x+b.width && a.x+a.width > b.x && a.y < b.y+b.height && a.y+a.height > b.y) {
      const ta = texts.find(t => t.containerId === a.id);
      const tb = texts.find(t => t.containerId === b.id);
      console.log('OVERLAP:', ta?.text, 'and', tb?.text);
    }
  }
}
"
```

### Step 2: Arrow Crossing Analysis

After reading positions, mentally trace each arrow path:
- Arrows between adjacent nodes (close x/y) = safe
- Arrows that span the full diagram (e.g., top-left to bottom-right through center) = likely crossing other nodes
- If ANY long-distance arrows cross through the center zone, **redesign the diagram**

### Step 3: Diagram Type Fitness Check

The generator has layout limitations. Match your data shape to the right type:
- **Linear chains** (A→B→C→D) → `flowchart` (vertical preferred)
- **Hub with spokes** (center → multiple peers) → `concept-map`
- **Two-column A vs B** → `comparison`
- **Deep trees with branching** → simplify to linear `flowchart` by combining leaf nodes, OR use `concept-map` only if branches are 1 level deep
- **NEVER use `flowchart` for branching data** — the layout is purely linear and won't show branches

### Step 4: Fix or Regenerate

If ANY issue is found (overlaps, crossing arrows, wrong type, nodes off-screen):
1. Fix the JSON spec (change type, simplify nodes, adjust structure)
2. Re-run `generate-diagram.mjs`
3. Re-run the position audit
4. Repeat until clean

**Do NOT deliver a diagram without completing all 4 steps.** Jay annotates these live on camera with Apple Pencil. Tangled arrows or overlapping shapes make the diagram useless.
