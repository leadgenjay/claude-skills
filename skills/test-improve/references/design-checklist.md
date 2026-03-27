# Design Checklist — Test-Improve Audit Reference

Combined audit checklist for visual design quality. Each check includes pass/fail criteria and a specific fix. **Adapt all brand-specific checks to the project's Brand Profile** detected in Phase 0.

Notation: `{BRAND.*}` = substitute from detected Brand Profile. If not detected, use the generic default noted.

---

## 1. Brand Compliance (20%)

### 1.1 Heading Font
- **What:** All headings use the project's designated heading font `{BRAND.headingFont}`
- **Pass:** Correct font class/variable applied on all `<h1>`–`<h6>` and display text
- **Fail:** System fonts, wrong font family, or fallback rendering
- **Fix:** Apply the project's heading font class to heading elements
- **Severity:** Critical
- **Generic default:** If no heading font specified, check for consistency — all headings should use the same font

### 1.2 Body Font
- **What:** Body text uses the project's designated body font `{BRAND.bodyFont}`
- **Pass:** Correct font class or inherited from root layout
- **Fail:** Fallback fonts rendering, or mismatched font families in body text
- **Fix:** Ensure body font is applied at the root level
- **Severity:** Critical
- **Generic default:** If no body font specified, verify font consistency across all body text

### 1.3 Design Rules from CLAUDE.md
- **What:** Any explicit design rules in CLAUDE.md are followed (e.g., "no gradients", "solid colors only", "no emojis")
- **Pass:** Zero violations of stated rules
- **Fail:** Any instance violating an explicit design rule
- **Fix:** Replace the violating element with the rule-compliant alternative
- **Severity:** Critical

### 1.4 Brand Colors
- **What:** Accent colors match the project's defined palette `{BRAND.colors}`
- **Pass:** CTA buttons, highlights, and accents use the designated brand colors
- **Fail:** Random off-brand colors used as primary accents
- **Fix:** Replace non-brand accent colors with the project's defined palette
- **Severity:** Important
- **Generic default:** Check for color consistency — no more than 2-3 accent colors used purposefully

### 1.5 Icon Library
- **What:** Icons use the project's designated icon library `{BRAND.iconLibrary}`
- **Pass:** Consistent imports from one library (e.g., `lucide-react`, `@heroicons/react`)
- **Fail:** Mixed icon libraries, emoji as icons, or inline SVGs that duplicate library icons
- **Fix:** Replace with equivalent icon from the project's library
- **Severity:** Important
- **Generic default:** At minimum, icons should come from a single consistent library

### 1.6 Logo Present (landing pages only)
- **What:** Project logo appears at the top of landing/marketing pages
- **Pass:** Logo image in page header with appropriate sizing
- **Fail:** No logo, wrong path, or broken image
- **Fix:** Add logo image to page header
- **Severity:** Important

### 1.7 No Pure Black
- **What:** Avoid `#000000` / `black` for text or backgrounds — use near-black instead
- **Pass:** `slate-900`, `zinc-900`, `gray-900`, `neutral-900`, or similar
- **Fail:** `text-black`, `bg-black`, `#000`, `rgb(0,0,0)`
- **Fix:** Replace with the project's darkest neutral (e.g., `slate-900`)
- **Severity:** Minor

### 1.8 No Emojis in UI
- **What:** No emoji used as visual elements in the interface
- **Pass:** Proper icons used for all icon needs
- **Fail:** Emoji used as bullet points, list markers, or section decorations
- **Fix:** Replace emoji with appropriate icon from the project's icon library
- **Severity:** Minor

---

## 2. Anti-Slop (20%)

### 2.1 No Equal-Width Grids Everywhere
- **What:** Layouts should vary — not every section uses the same grid
- **Pass:** Mix of layouts — asymmetric grids, full-width sections, varied column widths
- **Fail:** Every section is a uniform 3-column or 2-column equal grid
- **Fix:** Vary at least 2 sections with different layout patterns (full-width, 2/3+1/3, stacked)
- **Severity:** Important

### 2.2 No Forced Card Heights
- **What:** Cards should size to their content, not forced to identical heights
- **Pass:** Natural content-driven heights, or `min-h` only where alignment genuinely helps
- **Fail:** Large fixed heights forcing empty space in shorter cards
- **Fix:** Remove forced heights; let content determine size. Use `flex` with `items-stretch` if alignment needed.
- **Severity:** Important

### 2.3 No Text-Center Everywhere
- **What:** Only center-align headlines and CTAs; left-align body text
- **Pass:** `text-center` on headings and CTAs, `text-left` on paragraphs and descriptions
- **Fail:** `text-center` on every element including long body paragraphs
- **Fix:** Change body text, descriptions, and list items to `text-left`
- **Severity:** Important

### 2.4 No Generic Shadows
- **What:** Cards shouldn't all use the same default shadow
- **Pass:** Tinted shadows using brand accent color at low opacity (5-10%), or deliberate shadow variation
- **Fail:** `shadow-md` or `shadow-lg` applied uniformly to all cards
- **Fix:** Replace with brand-tinted shadow (e.g., `shadow-[0_4px_24px_rgba(R,G,B,0.08)]` using `{BRAND.primaryColor}`)
- **Severity:** Important
- **Generic default:** Use a warm or cool tinted shadow matching the page's color temperature

### 2.5 No AI Cliche Copy
- **What:** No superlatives or buzzwords in copy
- **Pass:** Specific, benefit-focused language with real numbers
- **Fail:** "Revolutionary", "Game-changing", "Supercharge", "Unlock", "Seamlessly", "Cutting-edge", "Revolutionize", "Elevate"
- **Fix:** Replace with specific benefit statement or direct response copy
- **Severity:** Important

### 2.6 No Vague Social Proof
- **What:** Social proof uses specific names, companies, and results
- **Pass:** Named testimonials with companies and measurable results
- **Fail:** "Trusted by 1,000+ companies", "John D. — Great product!", round numbers without context
- **Fix:** Replace with specific testimonial including name, company, and measurable result
- **Severity:** Important

### 2.7 No Symmetric Section Padding
- **What:** Section vertical padding should vary — not all identical
- **Pass:** 3+ different padding values across the page
- **Fail:** Every section uses the same vertical padding
- **Fix:** Vary section padding: larger for hero/CTA sections, tighter for content-dense sections
- **Severity:** Minor

### 2.8 No Cookie-Cutter Layout Order
- **What:** Page doesn't follow a rigid template order without variation
- **Pass:** Sections interleave proof, objection handling, and CTAs throughout
- **Fail:** Rigid template order with no variation or interstitial elements
- **Fix:** Move social proof closer to first CTA; add objection handling before pricing
- **Severity:** Minor

---

## 3. Motion Quality (15%)

### 3.1 Tap Feedback on CTAs
- **What:** All clickable buttons and CTAs have tactile press feedback
- **Pass:** `whileTap={{ scale: 0.97 }}` (Framer Motion) or `:active` CSS transform
- **Fail:** Buttons have no tap feedback, or only hover effects
- **Fix:** Add tap/active state — Framer Motion: `whileTap={{ scale: 0.97 }}` with spring transition; CSS: `active:scale-[0.97]`
- **Severity:** Important

### 3.2 Spring Transitions (if using Framer Motion)
- **What:** Animations use spring physics, not linear/ease
- **Pass:** `transition={{ type: "spring", stiffness: 300, damping: 30 }}` or similar spring config
- **Fail:** `transition={{ duration: 0.3 }}` without type, or `ease-in-out` on motion elements
- **Fix:** Replace duration-based transitions with spring physics
- **Severity:** Important

### 3.3 Stagger Timing
- **What:** Stagger delays are appropriate for the content type
- **Pass:** Lists: ~0.08s. Card grids: ~0.12s. Nav items: ~0.03s
- **Fail:** Same stagger value for everything, or stagger > 0.2s (feels sluggish)
- **Fix:** Adjust stagger to match content type
- **Severity:** Minor

### 3.4 Scroll Reveal Consistency
- **What:** Scroll-triggered animations use consistent settings across the page
- **Pass:** All scroll reveals use the same `once` and `threshold`/`amount` values
- **Fail:** Mixed settings across sections, or no scroll reveals at all on a marketing page
- **Fix:** Standardize scroll reveal settings across the page
- **Severity:** Minor

### 3.5 Hover Feedback on Interactive Elements
- **What:** Cards, links, and interactive elements respond to hover
- **Pass:** Lift, color transition, scale, or other visual feedback on hover
- **Fail:** Interactive elements have no hover state at all
- **Fix:** Add appropriate hover feedback: lift for cards, color for links, scale for buttons
- **Severity:** Minor

### 3.6 Prefers-Reduced-Motion Support
- **What:** Animations respect the user's motion preference
- **Pass:** Framer Motion (respects by default), or CSS animations include `@media (prefers-reduced-motion: reduce)` fallback
- **Fail:** CSS `@keyframes` without reduced-motion media query
- **Fix:** Add `@media (prefers-reduced-motion: reduce) { animation: none; }`
- **Severity:** Important

---

## 4. Layout & Spacing (15%)

### 4.1 Section Padding Rhythm
- **What:** Page uses 3+ distinct vertical padding levels
- **Pass:** Deliberate variation — more space for key sections, tighter for supporting
- **Fail:** Every section uses the same vertical padding
- **Fix:** Assign padding based on section importance
- **Severity:** Important

### 4.2 Responsive Breakpoints
- **What:** Layout adapts properly at tablet (~768px) and mobile (~393px)
- **Pass:** Grids collapse, text sizes reduce, spacing adjusts
- **Fail:** Content overflows, horizontal scroll, text too small, elements overlap
- **Fix:** Add responsive classes for grid collapse, text sizing, and spacing
- **Severity:** Critical

### 4.3 Content Max-Width
- **What:** Content is constrained to a readable max-width
- **Pass:** Container with `max-w-7xl mx-auto` or similar; body text constrained
- **Fail:** Text spanning full viewport width on large screens
- **Fix:** Wrap content in a max-width container with horizontal padding
- **Severity:** Important

### 4.4 Consistent Horizontal Padding
- **What:** All sections have matching horizontal padding/margins
- **Pass:** Consistent padding pattern across sections — content edges align
- **Fail:** Mismatched horizontal padding causing content edge misalignment
- **Fix:** Apply a consistent container pattern across all sections
- **Severity:** Important

### 4.5 Whitespace Balance
- **What:** Adequate spacing between elements within sections
- **Pass:** Appropriate gap/space utilities for element density
- **Fail:** Elements crammed together or excessive unused whitespace
- **Fix:** Adjust gap/space utilities appropriate to element density
- **Severity:** Minor

---

## 5. Conversion (15%)

### 5.1 CTA Above Fold
- **What:** Primary call-to-action is visible without scrolling
- **Pass:** CTA button visible in the hero/above-fold area
- **Fail:** First CTA requires scrolling past the hero section
- **Fix:** Add a primary CTA button to the hero section
- **Severity:** Critical

### 5.2 Clear Value Proposition
- **What:** Visitor understands what's being offered within 5 seconds
- **Pass:** Headline clearly states the benefit or outcome
- **Fail:** Vague headline like "Welcome to Our Platform" or just the product name
- **Fix:** Rewrite headline to state the primary benefit: "Get X Without Y"
- **Severity:** Critical

### 5.3 Social Proof Visible
- **What:** At least one social proof element visible early on the page
- **Pass:** Testimonial, client logos, or results visible within first 2 scroll depths
- **Fail:** No social proof above the fold or in the first major section
- **Fix:** Add a trust bar, featured testimonial, or results stat near the hero
- **Severity:** Important

### 5.4 CTA Copy Is Action-Oriented
- **What:** Button text uses action verbs that tell the user what happens next
- **Pass:** "Get Started Free", "Download the Guide", "Book Your Call"
- **Fail:** "Submit", "Click Here", "Learn More" (vague)
- **Fix:** Rewrite to specify the action and outcome
- **Severity:** Important

### 5.5 Guarantee or Risk Reversal
- **What:** Some form of risk reduction is present on sales/checkout pages
- **Pass:** Money-back guarantee, free trial, "cancel anytime" — clearly stated
- **Fail:** No mention of how the buyer is protected
- **Fix:** Add guarantee badge or risk reversal statement near the CTA
- **Severity:** Important (for sales/checkout pages only)

### 5.6 Objection Handling
- **What:** Common objections are addressed on the page
- **Pass:** FAQ section, objection cards, or inline responses to hesitations
- **Fail:** No acknowledgment of buyer hesitations
- **Fix:** Add FAQ or objection-handling section before final CTA
- **Severity:** Minor

---

## 6. Visual Quality (15%)

### 6.1 Tinted Shadows
- **What:** Shadows use brand-colored tinting, not generic grey
- **Pass:** Shadow with brand accent at low opacity (5-10%)
- **Fail:** Default `shadow-md`, `shadow-lg`, `shadow-xl` without tinting
- **Fix:** Replace with brand-tinted shadow using `{BRAND.primaryColor}` at 5-10% opacity
- **Severity:** Important
- **Generic default:** Use a warm tint matching the page's dominant accent color

### 6.2 Card Hover Lift
- **What:** Cards lift slightly on hover to indicate interactivity
- **Pass:** Subtle Y-translate on hover with shadow increase
- **Fail:** Cards are static with no hover response
- **Fix:** Add subtle lift: `hover:-translate-y-0.5` with transition, or Framer Motion `whileHover={{ y: -2 }}`
- **Severity:** Minor

### 6.3 Consistent Border Radius
- **What:** Border radius values are consistent within component groups
- **Pass:** Cards use one radius, buttons another, inputs another — all consistent within type
- **Fail:** Mixed radii within the same component type
- **Fix:** Standardize radius per component type
- **Severity:** Minor

### 6.4 Text Hierarchy
- **What:** Clear visual distinction between heading levels
- **Pass:** H1 significantly larger than H2, H2 larger than H3, with weight and size changes
- **Fail:** Headings at similar sizes, or body text competing with headings
- **Fix:** Enforce stepped sizing with clear size + weight differentiation between levels
- **Severity:** Important

### 6.5 Image Optimization
- **What:** Images use the framework's optimized image component
- **Pass:** Next.js `<Image>`, Nuxt `<NuxtImg>`, or framework equivalent with proper attributes
- **Fail:** Raw `<img>` tags, missing alt text, no lazy loading, unoptimized images
- **Fix:** Replace with framework image component, add dimensions and alt text
- **Severity:** Important

### 6.6 Background Variety
- **What:** Not every section has the same background
- **Pass:** Mix of 2-3 background treatments creating visual rhythm
- **Fail:** Every section uses the identical background color
- **Fix:** Alternate between light, dark, and neutral backgrounds
- **Severity:** Minor
