---
name: presentation
description: Create professional Reveal.js slide presentations with Jay's proven design system. Use when the user mentions 'presentation,' 'slides,' 'deck,' 'slide deck,' 'keynote,' 'talk,' or 'build a presentation.' Covers narrative structure, slide design, typography, screenshot handling, and speaker notes.
---

# Presentation Skill

Create polished Reveal.js presentations using Jay's proven design system.

## Tech Stack

- **Reveal.js 5.1.0** (CDN) — single HTML file, inline CSS
- **Resolution:** 1920x1080, margin: 0
- **Fonts:** Big Shoulders Display (headings) + Manrope (body) via Google Fonts
- **Transition:** fade, fast
- **Plugins:** RevealNotes (speaker notes)

## Design System

### Typography

| Element | Size | Weight | Font |
|---------|------|--------|------|
| Base | 40px | 400 | Manrope |
| h1 | 4.2em | 900 | Big Shoulders Display, uppercase |
| h2 | 3.6em | 800 | Big Shoulders Display, uppercase |
| h3 | 2.6em | 700 | Big Shoulders Display, uppercase |
| Body (p) | 1.3em | 400 | Manrope |
| Caption | 1.05em | 400 | Manrope |

### Colors

| Token | Value | Use |
|-------|-------|-----|
| `--accent` | #ED0D51 | Accent highlights, badges, CTAs |
| `--bg` | #FFFFFF | Light slide backgrounds |
| `--text` | #111111 | Headlines, strong text |
| `--text-body` | #555555 | Body text, captions |
| `--dark-bg` | #0D0D0D | Dark slides (transitions, emphasis) |

### Spacing

- **Standard slides:** `padding: 40px 60px`
- **Screenshot slides:** `padding: 30px 50px` (tighter to maximize image space)
- Content should **FILL the slide** — no wasted whitespace

### Screenshots

- Single: `max-width: 92%`, `max-height: 68vh`
- Wide: `max-width: 96%`
- Pairs: `max-height: 64vh`
- Triples: `max-height: 54vh`
- All: `border-radius: 12px`, `box-shadow: 0 8px 40px rgba(0,0,0,0.12)`, `object-fit: contain`

### Text Rules

- **Maximum ~15 words of body text per slide** — the speaker says the rest
- Detailed explanations go in **speaker notes**, not on the slide
- **Never use the word "terminal"** — sounds too scary for non-technical audiences. Use "Claude Code" or "AI" instead.

## Narrative Structure

Follow the **Duarte Sparkline / PAS framework** with 5 acts:

### ACT 1: Hook + Thesis
Bold claim, establish pain, compressed credibility. Show "the old way" before the solution.

### ACT 2: Objection Handling
Address skepticism with proof. "I'm not a developer either" style objections.

### ACT 3: The Tool
Explain what it is, why it matters, real demos. Capabilities lists come AFTER the explainer.

### ACT 4: The Escalation
From tool to system/employee. Bigger vision. Plant CTA at ~60%.

### ACT 5: Your Turn
Framework summary, resources, CTA, personal close. End on a face, not a URL.

### Key Principles
- Pain before promise
- Credibility compressed to **ONE slide**, not 3-4 separate ones
- Capabilities lists come **AFTER** the explainer, never before
- Plant CTA at ~60%, deliver at 100%
- **End on a face**, not a URL

## Slide Type Catalog

See `references/slide-type-templates.md` for full HTML/CSS templates.

| # | Type | When to Use |
|---|------|-------------|
| 1 | Title Slide | Opening. Photo + headline + logo. Left-aligned text, circular photo right |
| 2 | Outline Slide | Table of contents. Numbered list with accent pill badges |
| 3 | Bold Statement | Thesis/claims. Big headline + 1-line body text |
| 4 | Section Opener | Act transitions. Section badge pill + headline |
| 5 | Stats Row | Data emphasis. Headline + accent numbers with labels |
| 6 | Screenshot | Single demo. Headline + large screenshot + caption |
| 7 | Screenshot Pair | Comparisons. Headline + two screenshots side by side |
| 8 | Screenshot Triple | Montage/proof. Three images with stat badges below |
| 9 | Three-Column | Feature breakdown. Headline + three columns |
| 10 | Two-Column Comparison | Side-by-side with divider |
| 11 | Before/After | Transformation. Gray left (old) + accent right (new) |
| 12 | Cost Breakdown | Stacked cost items + total bar |
| 13 | Dark Slide | Visual interrupt. Dark bg, white text |
| 14 | Pipeline Diagram | Dark bg + horizontal step boxes with arrows |
| 15 | Capabilities List | Arrow-prefixed list items |
| 16 | Numbered Steps | Ordered list with accent badges + CTA section |
| 17 | Personal Close | Circular photo + headline + handle + "Thank you" |
| 18 | CTA Footer | Any slide type + pink CTA footer bar with link |

## Anti-Patterns (Explicitly Rejected)

- **NO red annotation boxes/circles on screenshots** — they're always in the wrong position
- **NO "terminal"** in any visible text — too scary for non-technical audiences
- **NO credibility dump** — never 3+ slides of "who I am" before the promise
- **NO walls of text** — max ~15 words of body text per slide
- **NO capabilities before context** — don't list what a tool does before explaining what it IS
- **NO philosophical text slides** breaking demo momentum
- **NO small screenshots** — they must fill the slide
- **NO small text** — must be readable from the back of the room
- **NO wrong lead magnet URLs** — always verify the correct URL with the user

## Workflow

1. **Gather info:** Ask user for topic, audience, key assets/screenshots, lead magnet URL
2. **Plan narrative arc:** Map content to 5-act structure
3. **Generate HTML:** Full single-file HTML with inline CSS + speaker notes on every slide
4. **Verify with Playwright:** Screenshot all slides, review in batches for overflow/clipping
5. **Fix issues:** Common problems — list overflow, cost breakdowns clipping, CTA slides
6. **Open in browser** for user review

## Speaker Notes

- **Every slide MUST have `<aside class="notes">`** with full talking points
- Notes contain the detailed explanation; slide is the visual anchor
- Include transition phrases between slides
- Notes should read like a natural speaking script, not bullet points

## Verification Checklist

Before delivering:

- [ ] All slides fill the full 1920x1080 frame
- [ ] No text clipping or overflow at edges
- [ ] Screenshots are large and readable
- [ ] No more than ~15 words of body text per slide
- [ ] Speaker notes on every slide
- [ ] CTA URL is correct (verified with user)
- [ ] No "terminal" in visible text
- [ ] Credibility compressed to 1 slide max
- [ ] Dark slides create visual pattern interrupts
- [ ] Narrative follows pain → promise → proof → escalation → action
