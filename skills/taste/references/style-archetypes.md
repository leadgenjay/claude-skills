# Style Archetypes

Three distinct visual modes for LGJ pages. Each archetype carries its own layout rules, typography scale, motion behavior, and shadow system. Pick the archetype before building — never mix archetype conventions within a single page.

---

## Standard (Default)

**Use for:** Landing pages, homepage, feature pages, sales pages, most content.

**Dials:** `DESIGN_VARIANCE: 6`, `MOTION_INTENSITY: 5`, `VISUAL_DENSITY: 4`

This is full LGJ brand expression. No constraints beyond the base brand lock rules. Sections vary in padding, layout, and density. Typography makes a strong statement. Pink is used confidently.

### Typography Scale
```
h1: Big Shoulders, 900 weight, 64–80px, -0.03em tracking, lh 1.1
h2: Big Shoulders, 800 weight, 40–52px, -0.02em tracking, lh 1.15
h3: Big Shoulders, 700 weight, 28–36px, -0.01em tracking, lh 1.2
body-lg: Manrope, 400 weight, 18–20px, 0 tracking, lh 1.6
body: Manrope, 400 weight, 16px, 0 tracking, lh 1.6
label: Manrope, 600 weight, 14px, 0.04em tracking, uppercase
```

### Layout Principles
- Section padding varies: 80px–120px vertical, 96px on major breaks
- At least one full-bleed section per page (dark or colored background)
- Asymmetric feature layouts preferred: 7/5 or 3/5 column splits
- Hero section: primary content left-aligned, visual element right

### Motion
- Page load choreography: shell → hero text (100ms) → hero CTA (200ms) → supporting elements (350ms)
- Scroll reveals on all content blocks below fold
- Spring config: `stiffness: 300, damping: 30` (snappy but not jarring)
- Stagger for card grids: `staggerChildren: 0.12`

### Shadows
- Cards: `shadow-[0_4px_24px_rgba(237,13,81,0.08)]` — pink-tinted
- Buttons: `shadow-[0_4px_16px_rgba(237,13,81,0.20)]` on primary CTA
- Images: `shadow-[0_8px_40px_rgba(1,68,248,0.08)]` — blue-tinted for visual depth
- Hover amplification: shadows intensify 1.5–2x on hover

---

## Soft-Premium

**Use for:** Checkout pages, payment flows, upsell pages, high-stakes conversions.

**Purpose:** Reduce cognitive friction, build immediate trust, slow the eye down. Every choice signals safety and quality to a buyer who is about to enter payment details.

**Dials:** `DESIGN_VARIANCE: 4`, `MOTION_INTENSITY: 3`, `VISUAL_DENSITY: 3`

### Typography Scale
```
h1: Big Shoulders, 800 weight, 48–56px, -0.02em tracking, lh 1.15
  — Used only for the primary page heading. Once.
h2: Manrope, 700 weight, 24–28px, 0 tracking, lh 1.3
  — Section headings and card titles
body: Manrope, 400–500 weight, 16–17px, 0 tracking, lh 1.65
  — All body copy at 500 weight (slightly heavier = more trustworthy)
price: Big Shoulders, 900 weight, 52–64px, -0.02em tracking
  — Pricing figures only
label: Manrope, 600 weight, 13px, 0.06em tracking, uppercase
  — Input labels, section category labels
```

### Layout Principles
- Overall padding: 2× standard values (py-24 vs py-12)
- Max content width: 520px for single-column checkout forms, 960px for two-column layouts
- Double-bezel card pattern for pricing and form containers:
  ```tsx
  // Outer card
  <div className="bg-white rounded-2xl p-1.5 shadow-[0_2px_24px_rgba(15,23,42,0.08)]">
    // Inner card
    <div className="bg-slate-50 rounded-xl p-8">
      {/* content */}
    </div>
  </div>
  ```
- Trust elements positioned strategically:
  - Security badges directly below payment button
  - Guarantee seal in the pricing card header
  - Testimonial card inserted between pricing and CTA

### Color Usage
- Pink at ~60% saturation for subtle accents — never full #ED0D51 on large areas
  - Use `#ED0D51` for: price color, primary button only
  - Use `bg-rose-50` or `bg-pink-50` for: background tints, highlight areas
- Blue for trust signals: lock icons, security text, SSL badge
- Background: `bg-white` forms on `bg-slate-50` page background
- No dark sections on checkout pages (dark = unfamiliar, slows trust)

### Motion
- No scroll-triggered animations (user is in decision mode, not exploration mode)
- Page fade-in on load: `opacity: 0 → 1`, 300ms ease-out, delay 0ms
- Form field focus: border color transitions 150ms ease-in-out
- Button hover: `scale: 1.02`, 150ms ease-out
- Button press: `scale: 0.98`, 100ms ease-in
- Success animation: checkmark draws in with spring (`stiffness: 200, damping: 20`)
- Spring defaults: `stiffness: 200, damping: 25` (softer, more reassuring)

### Shadows
```
Page background shadows: shadow-sm shadow-slate-200/50
Card base: shadow-[0_2px_16px_rgba(15,23,42,0.06)]
Card hover: shadow-[0_4px_24px_rgba(15,23,42,0.10)]
Primary button: shadow-[0_4px_16px_rgba(237,13,81,0.25)]
Security badge area: no shadow (intentionally flat = institutional)
```

### Input Styling
```tsx
<input
  className="
    h-12 w-full rounded-lg border border-slate-200
    px-4 py-3 text-slate-900
    bg-white
    placeholder:text-slate-400
    focus:outline-none focus:ring-2 focus:ring-[#ED0D51]/20 focus:border-[#ED0D51]
    transition-all duration-150
  "
/>
```

### Trust Element Placement
1. Lock icon + "Secure checkout" above payment fields
2. Guarantee seal (30-day, money-back, etc.) in card header with brief text
3. One specific testimonial (with photo, name, result) inside pricing card — between header and payment options
4. Payment method logos below primary CTA button (Stripe, Visa, Mastercard)

---

## Editorial-Minimal

**Use for:** Resource pages at `/r/[slug]`, blog posts, documentation, guides, case studies.

**Purpose:** Establish authority through clarity. The content IS the design. Typography carries the visual weight. Motion is present but invisible.

**Dials:** `DESIGN_VARIANCE: 5`, `MOTION_INTENSITY: 2`, `VISUAL_DENSITY: 3`

### Typography Scale
```
article-title: Big Shoulders, 900 weight, 52–64px, -0.03em tracking, lh 1.1
  — Used once, at the top
h2: Manrope, 700 weight, 28–32px, -0.01em tracking, lh 1.25
h3: Manrope, 600 weight, 20–22px, 0 tracking, lh 1.35
body: Manrope, 400 weight, 18px, 0 tracking, lh 1.75
  — Generous line height for extended reading
small: Manrope, 400 weight, 15px, 0 tracking, lh 1.6
  — Captions, footnotes, metadata
```

### Layout Principles
- Article content max-width: 720px, centered with generous margins
- Metadata bar (author, date, read time) above title — small text, muted color
- Left-flush body text (never centered)
- Bento grid for related resources or key points:
  ```tsx
  // Bento grid specs
  <div className="grid grid-cols-3 auto-rows-[200px] gap-4">
    <div className="col-span-2 row-span-1">  {/* wide item */}</div>
    <div className="col-span-1 row-span-2">  {/* tall item */}</div>
    <div className="col-span-1 row-span-1">  {/* standard */}</div>
    <div className="col-span-1 row-span-1">  {/* standard */}</div>
  </div>
  ```
- Full-bleed images: `w-full rounded-lg` — not contained in bordered cards
- Sidebar (optional): sticky at 30% width, right-aligned, for table of contents or opt-in

### Color Usage
- Base: warm monochrome — `slate-50` background, `slate-900` text
- Accent: `#ED0D51` for hyperlinks, pull quote borders, highlight markers only
- Blue `#0144F8` for: code elements, technical terms, external link indicators
- No colored section backgrounds — use subtle `bg-slate-50` to `bg-white` transitions
- Images are the only strong visual element — give them space

### Shadows
```
Cards in bento grid: shadow-[0_1px_4px_rgba(15,23,42,0.06)] — nearly invisible
Pull quotes: no shadow, left border instead
Images: shadow-[0_4px_24px_rgba(15,23,42,0.08)] — subtle depth
Sticky sidebar: shadow-[0_0_0_1px_rgba(15,23,42,0.06)] — hairline edge
```

### Pull Quotes
```tsx
<blockquote className="
  border-l-4 border-[#ED0D51]
  pl-6 py-1 my-8
  text-slate-700 text-xl italic
  font-[Manrope] leading-relaxed
">
  {quote}
</blockquote>
```

### Code Blocks
```tsx
<pre className="
  bg-slate-900 text-slate-100
  rounded-lg overflow-x-auto
  p-6 my-6
  text-sm leading-relaxed
  font-mono
">
  <code>{children}</code>
</pre>
```

### Motion
- Content fades in once on page load: `opacity: 0 → 1`, 200ms ease-out
- No scroll-triggered animations for body content (reading mode)
- Bento grid items: single staggered entrance on first view only (`once: true`, `staggerChildren: 0.06`)
- Links: underline color transitions from `slate-300` to `#ED0D51` on hover, 150ms
- Sticky sidebar: no animation — appears immediately
- Progress bar (read progress): 2px bar at top, width tracks scroll position — no motion library needed, CSS width transition 50ms

### Opt-in Gate (when present)
Position the email capture gate at 40–60% scroll depth — after enough content to establish value, before the most actionable content. Style with Soft-Premium archetype rules (double-bezel card, trust signals). Never obscure the beginning of the article.
