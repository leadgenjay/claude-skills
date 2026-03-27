# Redesign Audit — Quality Checklist

Use this checklist when auditing an existing page or component before shipping. Work through each section in order. Log all failures with file path and line number. Fix in priority order (listed at the bottom).

---

## Typography Audit

**Font loading**
- [ ] `preconnect` links present in `<head>` before Google Fonts stylesheet
- [ ] `display: swap` set on all font declarations (prevents FOIT)
- [ ] No visible FOUT — fonts load within 200ms on fast connection
- [ ] Big Shoulders used for headings only (h1–h3), not body text
- [ ] Manrope used for body copy, labels, UI text

**Heading hierarchy**
- [ ] h1 is visually largest and used once per page
- [ ] h2 → h3 hierarchy is visually distinct (size, weight, or spacing difference)
- [ ] No heading skipped (h1 → h3 with no h2)
- [ ] Heading font weight varies for emphasis (700 for primary, 600 for secondary)

**Line height and spacing**
- [ ] Headings: line-height 1.1–1.2 (tight, professional)
- [ ] Body text: line-height 1.5–1.7 (readable)
- [ ] Letter spacing on headings: -0.02em to -0.04em (Big Shoulders needs tightening)
- [ ] Body text letter spacing: 0 or default (never artificially widened)

**Measure (line length)**
- [ ] Body text columns max 65–75 characters wide
- [ ] No text block spans full viewport width without max-width constraint
- [ ] Narrow breakpoints use appropriate font size (not just scaled desktop)

**Orphans**
- [ ] No single-word orphans on headline line breaks
- [ ] Long headlines break at natural phrase boundaries

---

## Color Audit

**Brand color consistency**
- [ ] Primary CTAs use `bg-[#ED0D51]` (no variations or approximate colors)
- [ ] Hover state on CTAs uses `hover:bg-[#d40b48]` (darkened, not lightened)
- [ ] Accent/trust elements use `#0144F8` (not approximations)
- [ ] Emphasis text uses `text-[#ED0D51]` (not gradients, not orange, not other pinks)

**Black and dark colors**
- [ ] No `#000000` or `black` anywhere — use `slate-950` or `zinc-950`
- [ ] Dark section backgrounds use brand-navy variants, not plain black
- [ ] Text on dark backgrounds uses `slate-50` or `white`, not pure white on pure black (too harsh)

**Contrast ratios**
- [ ] Body text on white/light bg: ≥ 4.5:1 (WCAG AA)
- [ ] Large text (18px+ bold): ≥ 3:1
- [ ] UI components and focus indicators: ≥ 3:1
- [ ] Text on brand-pink backgrounds: check white (#fff) achieves 3:1 (it does at full #ED0D51)
- [ ] Text on brand-blue backgrounds: check white achieves contrast

**Shadows**
- [ ] No generic `shadow-md` / `shadow-lg` on cards — shadows are tinted with brand color
- [ ] Shadow intensity matches element importance (more prominent = stronger shadow)
- [ ] No multiple conflicting shadow values on same element

---

## Layout Audit

**Asymmetry**
- [ ] At least one section uses asymmetric column widths (not 50/50 or 33/33/33)
- [ ] Not every element is centered — at least two sections are left-aligned
- [ ] Grid breaking element present (element that bleeds beyond its column or overlaps sections)

**Section rhythm**
- [ ] Section padding varies — not `py-16` uniformly on every section
- [ ] Tight padding used for closely related content (e.g., heading + paragraph = gap-4, not py-16 between)
- [ ] Generous padding before topic changes and after major sections

**Visual hierarchy**
- [ ] Eye enters at intended focal point (primary headline or hero visual)
- [ ] Clear path from entry point → value prop → CTA
- [ ] Secondary content does not compete with primary CTA for visual weight

**Negative space**
- [ ] White space is deliberate — not accident gaps from missing content
- [ ] Tight areas feel intentionally dense, not cluttered
- [ ] Breathing room around primary CTAs (nothing competing within 40px)

**Grid discipline**
- [ ] Elements align to an implicit grid (not scattered with random margins)
- [ ] Consistent gutters within a section
- [ ] Bento-style grids use meaningful size variation (not random col-spans)

**Mobile layout**
- [ ] Mobile layout is designed, not just desktop stacked
- [ ] Touch targets ≥ 44px height
- [ ] Sticky CTA or accessible primary action on mobile
- [ ] Text sizes legible at 375px width without zooming

---

## Interactivity Audit

**Hover states**
- [ ] All `<a>` tags have visible hover state
- [ ] All `<button>` elements have hover feedback (color change, scale, or both)
- [ ] Cards that are clickable have hover elevation or cursor pointer
- [ ] Icons in interactive contexts respond to hover

**Press/active states**
- [ ] Buttons scale down on press (`whileTap={{ scale: 0.97 }}` or `active:scale-[0.97]`)
- [ ] No button feels "stuck" or unresponsive to click
- [ ] Submit buttons show loading state during async operations

**Focus states**
- [ ] All interactive elements have visible focus ring (keyboard navigation)
- [ ] Focus ring uses brand color (`focus:ring-[#ED0D51]`) not browser default blue where inconsistent
- [ ] Focus ring is never `outline: none` without a replacement

**Scroll-triggered animations**
- [ ] Primary content blocks have scroll-reveal on initial view
- [ ] Animations use `once: true` — never re-trigger on scroll back up
- [ ] Intersection threshold set at 0.3 or lower (0.05 for mobile-heavy pages)

**Async states**
- [ ] All forms show loading spinner or button state during submission
- [ ] All data-fetching sections have skeleton loaders (matching content shape)
- [ ] Error states are styled — not browser default or plain text

---

## Content Audit

**AI slop phrases** — scan for and remove all of these:
- "Revolutionary" / "Game-changing" / "Cutting-edge"
- "Supercharge" / "Unlock" / "Revolutionize"
- "Seamlessly" / "Effortlessly" / "Powerful"
- "Take your [X] to the next level"
- "All-in-one" as the primary value proposition

**Social proof quality**
- [ ] Testimonials include full name (not "John D." or "Sarah M.")
- [ ] Testimonials include company or role context
- [ ] Testimonials contain specific, measurable results
- [ ] Numbers in social proof are specific (247 clients, not 200+)
- [ ] No obviously fabricated or generic testimonials

**CTAs**
- [ ] Primary CTAs use action verbs: Get, Claim, Start, Download, Book
- [ ] CTAs explain what happens next ("Get Instant Access" vs. "Submit")
- [ ] No more than one primary CTA per visual section (reduces decision paralysis)

**Placeholder content**
- [ ] Zero Lorem ipsum remaining
- [ ] No "Coming Soon" sections unless intentional
- [ ] All image alt text is descriptive and real
- [ ] No hardcoded test data visible to users

---

## Component Audit

**Cards**
- [ ] Cards have tinted shadows (not generic gray)
- [ ] Card hover state provides clear affordance
- [ ] Cards have consistent internal padding (not mixed 16px and 24px)

**Form inputs**
- [ ] Inputs have visible border in default state
- [ ] Focus state shows brand-color glow (`ring-2 ring-[#ED0D51]/20`)
- [ ] Error state has red border + error message below field
- [ ] Labels are positioned correctly and associated via `htmlFor`

**Skeleton loaders**
- [ ] Skeleton matches actual content dimensions (not generic bars)
- [ ] Skeleton uses `animate-pulse` or shimmer effect
- [ ] Skeleton renders server-side (not flash of empty)

**Empty states**
- [ ] Empty states are designed with message + optional action
- [ ] No "No data" plain text without context or next-step guidance

**Badges and tags**
- [ ] Consistent border-radius across all badges (pick one: `rounded-full` or `rounded-md`)
- [ ] Consistent padding (px-2.5 py-0.5 or px-3 py-1 — not mixed)
- [ ] Color coding is meaningful (not random)

---

## Code Quality Audit

**No inline styles**
- [ ] No `style={{ position: 'absolute' }}` — use Tailwind `absolute`
- [ ] No `style={{ color: '#ED0D51' }}` — use Tailwind `text-[#ED0D51]`
- [ ] No `style={{ zIndex: 9999 }}` — use Tailwind z-index scale

**No overrides abuse**
- [ ] `!important` appears ≤ 2 times per file
- [ ] No specificity wars in CSS modules

**z-index discipline**
- [ ] No z-index value exceeds 49 without comment explaining why
- [ ] z-index values follow the layer scale (0–9, 10–19, 20–29, 30–39, 40–49)

**Animation hygiene**
- [ ] `motion.div` used only for meaningful state changes
- [ ] No Framer Motion in Server Components (missing `'use client'`)
- [ ] All animated properties are `transform` or `opacity` only
- [ ] `will-change: transform` used sparingly, not on every animated element

**Component size**
- [ ] No single component file exceeds 300 lines
- [ ] Business logic not in UI components
- [ ] Section components extracted where files grow beyond 200 lines

---

## Fix Priority Order

When multiple issues are found, fix in this order:

1. **Broken or missing functionality** — broken forms, missing states, 404 links
2. **Accessibility violations** — missing focus states, contrast failures, no alt text
3. **Content issues** — AI slop phrases, placeholder text, generic testimonials
4. **Visual hierarchy problems** — CTA buried, entry point unclear, competing elements
5. **Missing interactions** — hover states, press feedback, loading states
6. **Performance issues** — non-GPU animations, layout-triggering transitions
7. **Polish and refinement** — shadow tinting, spring tuning, stagger timing
