---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, or applications. Generates creative, polished code that avoids generic AI aesthetics.
license: Complete terms in LICENSE.txt
---

This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

The user provides frontend requirements: a component, page, application, or interface to build. They may include context about the purpose, audience, or technical constraints.

## Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. There are so many flavors to choose from. Use these for inspiration but design one that is true to the aesthetic direction.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work - the key is intentionality, not intensity.

Then implement working code (HTML/CSS/JS, React, Vue, etc.) that is:
- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

## Frontend Aesthetics Guidelines

Focus on:
- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics; unexpected, characterful font choices. Pair a distinctive display font with a refined body font.
- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion**: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions. Use scroll-triggering and hover states that surprise.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Visual Details**: Create atmosphere and depth rather than defaulting to solid colors. Add contextual effects and textures that match the overall aesthetic. Apply creative forms like gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, and grain overlays.

NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, Oswald, Impact, Bebas Neue, Anton, system fonts), cliched color schemes (particularly purple gradients on white backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different fonts, different aesthetics. NEVER converge on common choices (Space Grotesk, for example) across generations.

**IMPORTANT**: Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details. Elegance comes from executing the vision well.

Remember: Claude is capable of extraordinary creative work. Don't hold back, show what can truly be created when thinking outside the box and committing fully to a distinctive vision.

## Lead Gen Jay Design Preferences

When building pages for Lead Gen Jay, follow these specific preferences:

### Colors
- **Primary brand color**: #ED0D51 (Razzmatazz) - Use for CTAs, highlights, accents
- **Secondary brand color**: #0144F8 (Blue) - Use for alternating accents, links
- **NO GRADIENTS**: Use solid brand colors only. Do not use gradient backgrounds or gradient buttons.
- For icon backgrounds, alternate between `bg-[#ED0D51]/10` and `bg-[#0144F8]/10`

### Buttons & CTAs
- Use solid `bg-[#ED0D51]` with `hover:bg-[#d40b48]` - no gradients
- Rounded full (`rounded-full`) for primary CTAs
- Include shadow: `shadow-lg shadow-[#ED0D51]/25`
- Include arrow icon with hover animation

### Icons
- Use unique, distinctive Lucide icons for each feature/benefit
- Alternate icon colors between brand pink (#ED0D51) and blue (#0144F8)
- Avoid generic icons - choose specific ones that represent the feature

### Pricing Displays
- For gated/locked pricing, show a blurred mystery price with Lock icon
- Use `blur-md select-none` on the price to create intrigue
- Show regular price with strikethrough alongside the locked exclusive price

### Typography
- Headline text uses brand pink for emphasis: `text-[#ED0D51]`
- Do not use gradient text clips

### Logo
- Always include Lead Gen Jay logo (`/lgj-logo.webp`) at the top of landing pages
- Logo should be `h-10 w-auto`

### Typography Stack (Lead Gen Jay)
- **Headlines**: Big Shoulders (bold, uppercase, `tracking-tighter`)
- **Body & UI**: Manrope (regular for body, medium for labels/buttons)
- **Mono**: SF Mono or Fira Code for code blocks
- **Weight hierarchy**: 700-900 headings, 500 labels, 400 body
- These fonts replace Oswald + Inter. When building LGJ pages, always use this stack.

---

## Anti-AI-Slop Design Rules

These rules prevent generic AI aesthetic patterns. Apply to ALL frontend work.

### Banned AI Words (Copy)

Never use these words in any UI copy, headings, descriptions, or microcopy:

delve, tapestry, realm, landscape, ever-evolving, cutting-edge, robust, transformative, pivotal, vibrant, crucial, compelling, seamless, groundbreaking, leverage, harness, embark, navigate (metaphorical), unveil, facilitate, synergy, game-changer, unlock, unleash, elevate, utilize, endeavour, multifaceted

**Banned phrases:** "In today's ever-evolving...", "Unlock the power of", "Master the art of", "Let's delve into", "Harness the power of", "Push the boundaries of"

**Banned structural patterns:** Opening with rhetorical questions, three parallel bullet points with identical structure, "Imagine if..." openings

### Layout Rules

- **Ban 3-column icon feature grids** — the #1 AI layout fingerprint. Use asymmetric layouts or single-column with large visuals instead.
- Mandate asymmetric layouts, staggered grids, or editorial-style compositions
- Every section must have a distinct visual rhythm — no repeating card patterns

### Radius Hierarchy

| Element | Radius |
|---------|--------|
| Buttons | `2px` (`rounded-sm`) |
| Cards | `8px` (`rounded-lg`) |
| Modals / Sheets | `16px` (`rounded-2xl`) |
| Accent elements | `0px` (sharp corners) |

### Shadow Hierarchy

Three elevation levels. Prefer hard drop shadows over soft blurs:

| Level | Value | Usage |
|-------|-------|-------|
| Low | `4px 4px 0px rgba(0,0,0,0.08)` | Cards, badges |
| Mid | `6px 6px 0px rgba(0,0,0,0.12)` | Elevated cards, dropdowns |
| High | `8px 8px 0px rgba(0,0,0,0.16)` | Modals, popovers |

### Background Treatment

- Require texture on dark backgrounds: SVG noise/grain overlay at 3-5% opacity
- Light backgrounds: subtle dot grid or fine line pattern at 2-3% opacity
- Never use plain flat color backgrounds on hero sections

### Interactive States (Required)

Every interactive element needs ALL of these states:
1. **Hover** — color shift, shadow lift, or subtle scale
2. **Focus ring** — 2px offset ring in brand color
3. **Active/pressed** — slight scale-down (0.98) or color darken
4. **Disabled** — 40% opacity + `cursor-not-allowed`

### Color Enforcement

- **Ban purple/indigo gradients** — Tailwind's `indigo-500` to `purple-500` is the biggest AI tell
- **Ban ALL gradients** for LGJ brand (reinforcing existing rule)
- Enforce **60-30-10 color ratio**: 60% dominant (white/slate-50), 30% secondary (slate-900 text), 10% accent (#ED0D51)
- `#ED0D51` appears on: CTAs, key metrics, and max ONE accent element per section

### Animation Standards

**Branded easing curves:**
- Entries: `cubic-bezier(0.16, 1, 0.3, 1)` — fast start, gentle settle
- Exits: `cubic-bezier(0.7, 0, 0.84, 0)` — gradual start, fast finish

**Duration scale:**
| Type | Duration |
|------|----------|
| Micro-interactions (hover, press) | `150ms` |
| State changes (toggle, expand) | `250ms` |
| Layout shifts (accordion, panel) | `350ms` |
| Page reveals (hero, section entry) | `500ms+` |

**Rules:**
- Ban uniform fade-ins on every element — looks like AI generated the page
- One orchestrated page-load sequence per page: staggered reveals with 150ms delays between elements
- Exit animations must be 60-70% of entry duration

### Forbidden AI Tells

- No pure `#000000` — use off-black (`slate-900` / `#0f172a`) for depth
- No oversized H1 without visual counterweight (subtext, image, or spatial break)
- No generic placeholder names (John Doe, Acme Corp, Jane Smith) — use real-ish names
- No `linear` easing — use spring physics or branded cubic-bezier curves
- No emojis as structural UI elements (use Lucide SVG icons)

### Realistic Content

- Use organic data: 47.2% not 50%, $12,847 not $10,000, 1,247 not 1,000
- Vary bar chart heights, progress bars, and stat cards — no suspiciously round numbers
- Names should feel real (not "Alex Johnson" or "Sarah Williams")

### Motion Standards

- **Spring physics**: stiffness 100, damping 20 for natural feel (Framer Motion)
- **Transform + opacity only** — never animate width/height/top/left
- **Skeleton loaders** over spinners for content loading states
- **No uniform fade-ins** — one orchestrated page-load sequence per page

### Complete States (Mandatory)

Every component must design for all states — not as afterthoughts:
- **Loading**: Skeleton shimmer matching the content shape
- **Empty**: Helpful message + action (not blank space)
- **Error**: Clear cause + recovery path (not just "Something went wrong")

### Image & Illustration Rules

- **Ban Corporate Memphis / blob people illustrations** — immediately signals AI/generic
- Prefer: real photos, annotated screenshots, hand-drawn SVG, or geometric abstract
- AI-generated images must have grain overlay + slight color grade shift to avoid uncanny look
- Every visual must carry information — no purely decorative illustrations

### Copy Rules for Landing Pages

- Every claim needs a metric, timeframe, or named tool (not vague superlatives)
- Start with bold claims or metrics, never rhetorical questions
- Vary sentence length and structure — no parallel three-bullet patterns