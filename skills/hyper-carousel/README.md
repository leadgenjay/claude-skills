# HyperFrames Carousel Skill

Build animated Instagram carousels with Claude Code + HyperFrames. 8 slides, phone mockup previewer, ready to post.

## What It Does

- Generates 8 animated MP4 slides following a proven design system
- Alternating light/dark/lime backgrounds with billboard typography
- Text-swap animations, terminal mockups, comparison cards, data callouts
- Phone mockup previewer for reviewing before posting
- Parallel agent dispatch -- all slides build simultaneously

## Prerequisites

- [HyperFrames CLI](https://github.com/heygen-com/hyperframes) installed: `npm install -g hyperframes`
- Claude Code with the `/hyperframes` skill available

## Quick Start

### As a Claude Code Skill

```bash
# Copy to your skills directory
cp -r . ~/.claude/skills/carousel/
```

Then in Claude Code:
```
/carousel
```

### As a Standalone Prompt

Copy `SKILL.md` and paste it into a Claude Code session. Fill in the `[VARIABLES]` section with your content.

## How It Works

1. You fill in 8 slide briefs (headline, body, visual element)
2. Claude builds slide 1 directly, dispatches agents for slides 2-8 in parallel
3. Each slide is a HyperFrames composition (HTML + GSAP) rendered to MP4
4. A phone mockup previewer is generated for review
5. Deploy to Vercel or any static host

## Design System

| Element | Spec |
|---------|------|
| Dimensions | 720x900 @ 30fps |
| Headlines | Bebas Neue, ALL CAPS, 85-120px |
| Body | DM Sans italic, 18-20px |
| Labels | DM Sans 700, ALL CAPS, 0.15em spacing |
| Code | JetBrains Mono, 20-24px |
| Light bg | #F5F3EE |
| Dark bg | #111111 |
| Accent | #C5E100 (lime) |
| Backgrounds | Alternate: light/dark/light/dark/lime/light/dark/lime |

## Slide Types

| Type | Template | Use For |
|------|----------|---------|
| Hook | `templates/slide-hook.html` | Slide 1 -- animated text swap, avatar lockup |
| Dark | `templates/slide-dark.html` | Pain, how it works, contrast/comparison slides |
| Light | `templates/slide-light.html` | Solution, toolkit, proof slides |
| Lime | `templates/slide-lime.html` | Why it wins, paradigm shift slides |
| CTA | `templates/slide-cta.html` | Final slide -- centered, comment keyword, avatar |

## Narrative Arc

Every carousel follows Problem-Agitation-Solution-CTA:

| # | Role | Background |
|---|------|------------|
| 1 | Hook | Light |
| 2 | Pain | Dark |
| 3 | Solution | Light |
| 4 | How | Dark |
| 5 | Why / Metrics | Lime |
| 6 | Scale / Proof | Light |
| 7 | Contrast | Dark |
| 8 | CTA | Lime |

## Deploying

Drop your output MP4s into any static hosting. See the workspace repo pattern for Vercel auto-deploy on push.

## License

MIT
