---
name: taste
description: Quality enforcement layer for eliminating generic AI aesthetics in frontend code. This skill should be used when building or reviewing UI components, pages, or applications to ensure premium visual quality, authentic content, and distinctive design that avoids common AI-generated patterns.
---

# Taste — Quality Enforcement Layer

## 1. Purpose & Activation

Taste is a quality enforcement layer that complements the `frontend-design` skill. The relationship is:

- **frontend-design** = "what to build" — creative direction, brand lock, aesthetic choice
- **taste** = "how to build it with premium quality" — anti-slop rules, detail enforcement, interaction fidelity

Neither skill replaces the other. Run `frontend-design` for direction, then apply `taste` to enforce craft standards throughout implementation.

**Activate this skill when:**
- Starting any new page or component from scratch
- Reviewing existing UI for quality issues before shipping
- Auditing a page for AI-generated aesthetic patterns
- Implementing animations or micro-interactions
- Choosing between implementation approaches at the detail level

**Load reference files selectively:**
- Auditing an existing page → load `references/redesign-audit.md`
- Starting a checkout or editorial page → load `references/style-archetypes.md`
- Reviewing code for AI patterns → load `references/anti-slop-patterns.md`
- Implementing complex animations → load `references/motion-choreography.md`

---

## 2. Configuration Dials

Three tunable parameters govern the intensity of taste enforcement. LGJ defaults are calibrated for conversion-focused marketing pages.

| Dial | Range | LGJ Default | What It Controls |
|------|-------|-------------|------------------|
| `DESIGN_VARIANCE` | 1–10 | **6** | 1 = perfectly symmetric, 10 = deliberate chaos. 6 = asymmetric layouts with intentional structure. |
| `MOTION_INTENSITY` | 1–10 | **5** | 1 = no animation, 10 = cinematic sequences. 5 = purposeful reveals + interactions, Core Web Vitals safe. |
| `VISUAL_DENSITY` | 1–10 | **4** | 1 = extreme whitespace, 10 = content-packed. 4 = clean conversion layouts with breathing room. |

**When to override defaults:**
- Checkout/payment pages → `DESIGN_VARIANCE: 4`, `MOTION_INTENSITY: 3` (reduce friction)
- Resource/editorial pages → `DESIGN_VARIANCE: 5`, `VISUAL_DENSITY: 3` (readability priority)
- Hero/above-fold sections → `MOTION_INTENSITY: 7` (first impression matters)

---

## 3. LGJ Brand Lock (Overrides)

When taste rules conflict with LGJ brand rules, use the Resolution column. Brand rules always win.

| Conflict | Taste Default | LGJ Rule | Resolution |
|----------|--------------|----------|------------|
| Heading font | Ban generic fonts | Big Shoulders | **Aligned.** Bold + distinctive. Use weight range 400–900, tight tracking (-0.02em to -0.04em). |
| Body font | Ban system fonts | Manrope | **Aligned.** Geometric, readable. Use 400–600 weight range. |
| Gradients | Use for surface differentiation | Banned entirely | **LGJ wins.** Use solid colors, opacity layering, tinted shadows instead. |
| Icons | Prefer Phosphor/Radix | Use Lucide | **LGJ wins.** Keep Lucide, enforce stroke consistency (strokeWidth 1.5–2.0 only). |
| Accent colors | Maximum 1 accent | Pink #ED0D51 + Blue #0144F8 | **LGJ wins.** Two brand accents allowed. Pink for CTAs/emphasis, blue for trust/secondary. |
| Pure black | Banned | No explicit rule | **Adopt taste rule.** Use slate-950 or zinc-950 instead of #000000. |
| Generic content | Banned | No explicit rule | **Adopt taste rule.** Real names, specific numbers, zero AI clichés. |
| Emojis | Banned | No explicit rule | **Adopt taste rule.** Use Lucide icons instead of emoji in all UI. |

---

## 4. Anti-Slop Rules

Full pattern library in `references/anti-slop-patterns.md`. This is the summary for fast recall.

### Visual Bans
- Equal-width columns on every layout element
- Cards forced to identical heights with `min-h`
- `text-center` on everything — center only headlines and CTAs, left-align body text
- `shadow-md` applied uniformly to all cards and buttons
- Generic hero: large heading + subtext + button + stock photo background

### Layout Bans
- Symmetric padding on every section (`py-16` everywhere)
- Predictable section order: hero → features → testimonials → pricing → CTA
- Three-column equal feature grid as the only layout pattern
- Divider `<hr>` lines between every section (use whitespace instead)

### Clarity-Over-Aesthetics Rule
- Design serves clarity. If a visual effect slows comprehension by even 1 second, remove it.
- No complex parallax on landing pages. No cognitive overload.
- Test: can a new visitor understand the offer in 4-5 seconds? If no, design is too complex.
- This doesn't mean boring — bold typography, clean spacing, and striking color all serve clarity.
- See `hero-section-designer` for the Above-Fold Constraint (6 elements max).

### Content Bans
- Generic section headings that communicate nothing when scanned: "How It Works", "Features", "About Us", "Our Process", "Why Choose Us", "What You Get" (see `conversion-copywriting` Scan-Only Headline Rule for replacements)
- Superlatives: "Revolutionary", "Game-changing", "Supercharge", "Revolutionize", "Unlock", "Seamlessly", "Cutting-edge"
- Vague social proof: "Trusted by 1,000+ companies"
- Generic testimonials: "Great product! — John D."
- Round numbers: "100+ clients", "10x growth"
- Emoji as bullet points or list markers
- Any Lorem ipsum or placeholder text shipped to production

### Code Bans
- Inline styles for positioning (`style={{ position: 'absolute', top: 20 }}`)
- `!important` more than twice per file
- `z-index` values above 50
- `motion.div` wrapping every element regardless of purpose
- Hardcoded hex colors inline instead of Tailwind classes or CSS variables

---

## 5. Premium Implementation Patterns

Apply these patterns by default when implementing components.

### Tactile Feedback
```tsx
// Button press feedback
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.97 }}
  transition={{ type: "spring", stiffness: 400, damping: 30 }}
>

// Input focus glow — use brand color at 20% opacity
<input className="focus:ring-2 focus:ring-[#ED0D51]/20 focus:border-[#ED0D51]" />
```

### Tinted Shadows
```tsx
// Never use generic grey shadows
// Wrong:
className="shadow-md"
// Right: tinted with brand color at 5–10% opacity
className="shadow-[0_4px_24px_rgba(237,13,81,0.08)]"
// Or for cards and containers:
className="shadow-[0_2px_16px_rgba(1,68,248,0.06)]"
```

### Spring Physics
```tsx
// Standard spring for most transitions
const spring = { type: "spring", stiffness: 300, damping: 30 }

// Snappy for toggles and checkboxes
const snappy = { type: "spring", stiffness: 400, damping: 30 }

// Soft for modals and overlays
const soft = { type: "spring", stiffness: 200, damping: 25 }
```

### Skeleton Loaders
```tsx
// Match actual content shape — never generic bars
// For a testimonial card:
<div className="animate-pulse">
  <div className="flex gap-3 mb-4">
    <div className="h-10 w-10 rounded-full bg-slate-200" />   {/* avatar */}
    <div className="space-y-2 flex-1">
      <div className="h-4 w-32 rounded bg-slate-200" />       {/* name */}
      <div className="h-3 w-24 rounded bg-slate-200" />       {/* company */}
    </div>
  </div>
  <div className="space-y-2">
    <div className="h-3 w-full rounded bg-slate-200" />
    <div className="h-3 w-5/6 rounded bg-slate-200" />
    <div className="h-3 w-4/6 rounded bg-slate-200" />
  </div>
</div>
```

### Staggered Reveals
```tsx
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,   // lists
      delayChildren: 0.1,
    },
  },
}
// For card grids: staggerChildren: 0.12
// For nav items: staggerChildren: 0.03

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
}
```

### Micro-Interactions
```tsx
// Checkbox fills with spring
<motion.div
  animate={{ scale: checked ? 1 : 0 }}
  transition={{ type: "spring", stiffness: 400, damping: 30 }}
  className="h-full w-full bg-[#ED0D51] rounded-sm"
/>

// Card hover — lift 2px, tinted shadow increases
<motion.div
  whileHover={{ y: -2, boxShadow: "0 8px 32px rgba(237,13,81,0.10)" }}
  transition={{ duration: 0.2, ease: "easeOut" }}
/>

// Toggle slides with bounce
<motion.div
  layout
  transition={{ type: "spring", stiffness: 300, damping: 15 }}
  className="absolute inset-y-1 rounded-full bg-white shadow-sm"
/>
```

---

## 6. Style Archetypes

Full specs in `references/style-archetypes.md`. Load that file when starting an archetype page.

### Standard (default)
Full LGJ brand expression. All dials at default. Use for: landing pages, homepage, feature pages. Most content at this site uses Standard.

### Soft-Premium
For: checkout, payment flows, high-stakes conversions. Reduces visual noise, builds trust, slows the eye down. Key markers: double-bezel cards, 2x padding, muted pink, Manrope throughout. Motion is minimal and purposeful.

### Editorial-Minimal
For: resource pages, blog posts, documentation. Readability-first. Key markers: 720px content max-width, warm monochrome, bento grid where applicable, typography dominates, motion is nearly invisible.

---

## 7. Performance Guardrails

### GPU-Only Animation Rule
Only animate `transform` and `opacity`. These properties run on the compositor thread and never trigger layout recalculation.

```tsx
// Correct — GPU accelerated
animate={{ opacity: 1, y: 0, scale: 1 }}

// Wrong — triggers layout recalculation
animate={{ width: "100%", height: "auto", padding: "16px" }}
```

### RSC Isolation
Animations live in Client Components only. Never import Framer Motion in Server Components.

```tsx
// Add to any file using motion.*
'use client'
import { motion } from 'framer-motion'
```

### z-index Discipline Scale
| Layer | Range | Use Case |
|-------|-------|----------|
| Base | 0–9 | Normal document flow |
| Dropdown | 10–19 | Menus, popovers, tooltips |
| Sticky | 20–29 | Sticky headers, floating elements |
| Modal | 30–39 | Dialogs, drawers, lightboxes |
| Toast | 40–49 | Notifications, alerts |

Never exceed 49 without documenting why.

### Font Loading
```tsx
// In layout.tsx — preconnect before font load
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />

// Google Fonts config
const bigShoulders = Big_Shoulders_Display({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
})

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})
```

### Image Optimization
```tsx
// Always use next/image
<Image
  src={src}
  alt={alt}
  width={800}
  height={600}
  loading="lazy"          // below fold
  placeholder="blur"      // blurDataURL for known images
  className="object-cover"
/>
// Above-fold hero image: loading="eager" priority={true}
```

---

## 8. Reference File Index

| File | When to Load |
|------|-------------|
| `references/redesign-audit.md` | Auditing existing pages for quality issues |
| `references/style-archetypes.md` | Starting a checkout page or editorial/resource page |
| `references/anti-slop-patterns.md` | Reviewing code for AI-generated patterns |
| `references/motion-choreography.md` | Implementing complex animations or page choreography |

Load reference files on demand — they are detail supplements, not required reading for every task. When a task is purely compositional (adding a button, updating copy), apply the core rules in sections 1–7 without loading references.
