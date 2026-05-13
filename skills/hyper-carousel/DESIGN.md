# Design System — Animated Carousel (Ash Harris Reference)

## Style Prompt

High-contrast tech editorial. Billboard typography on alternating light/dark backgrounds. Ultra-condensed ALL CAPS headlines filling 40-50% of the slide height. Lime/chartreuse accent color creates neon-on-paper energy. Terminal mockups and code blocks as visual proof elements. Clean, generous padding. Industrial, direct, aggressive. Not elegant — punchy.

## Colors

| Role | Hex | Name |
|------|-----|------|
| Light background | #F5F3EE | Warm off-white |
| Dark background | #111111 | Near-black |
| Primary text (on light) | #111111 | Near-black |
| Primary text (on dark) | #FFFFFF | White |
| Accent | #C5E100 | Lime/chartreuse |
| Accent dark | #4A5500 | Olive |
| Danger/before | #8B2020 | Dark red |
| Highlight swap | #A855F7 | Purple (text swap only) |
| Terminal bg | #1A1A1A | Terminal black |

## Typography

- **Headlines**: `Bebas Neue` — ultra-condensed, ALL CAPS, 900 weight feel. Tracking: -0.02em
- **Body copy**: `DM Sans` — italic for supporting text, 300-400 weight
- **Section labels**: `DM Sans` — 700 weight, ALL CAPS, letter-spacing: 0.15em, 18-20px
- **Code/terminal**: `JetBrains Mono` — 400 weight, 20-24px
- **Page number / handle**: `DM Sans` — 600 weight, 18px

## Layout Grid (720x900)

- Side padding: 50px
- Top padding: 60px
- Bottom padding: 50px
- Content width: 620px
- Section label to headline gap: 16px
- Headline to body gap: 24px
- Body to visual element gap: 32px

## Footer Component (every slide)

- Handle: @DOCTABLADEMD — left-aligned, 16px, DM Sans 600, ALL CAPS, letter-spacing 0.1em
- Progress bar: 2px height, lime fill width = (slideNum/8 * 100%), gray remainder
- Page number: N/8 — right-aligned, 18px, DM Sans 600
- Footer sits 40px from bottom edge

## What NOT to Do

- No gradients on dark slides (flat black only)
- No rounded corners on headlines or section labels
- No drop shadows on text
- No more than one accent color per slide (lime OR purple, never both except in animation cycling)
- No serif fonts anywhere in this format
- No centered text — everything left-aligned except CTA slide (8)
