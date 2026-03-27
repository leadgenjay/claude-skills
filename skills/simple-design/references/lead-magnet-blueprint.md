# Lead Magnet Blueprint — 3 Sections

Modeled on Acquisition.com's framework download pages. The entire page is a single centered column. No navigation, no sidebar, no distractions.

---

## Wireframe

```
┌─────────────────────────────────────────────────┐
│                  [LGJ Logo]                     │
│                                                 │
│   6 Categories, 33 Commands — The Only          │
│   Claude Code Reference You Need                │
│                                                 │
│   Workflows, MCP servers, terminal shortcuts,   │
│   and config patterns used across 2,500+ AI     │
│   automations.                                  │
│                                                 │
│         ┌───────────────────────┐               │
│         │  ✨ [pulsing glow]    │               │
│         │  Get Instant Access   │               │
│         │                       │               │
│         │  [Your Name        ]  │               │
│         │  [Your Email       ]  │               │
│         │  ┌─────────────────┐  │               │
│         │  │ Get Free Access │  │  ← emerald    │
│         │  └─────────────────┘  │               │
│         │  No spam. Unsubscribe │               │
│         └───────────────────────┘               │
│                                                 │
│         ┌───────────────────────┐               │
│         │                       │               │
│         │   Lead Magnet         │               │
│         │   Image/Mockup        │               │
│         │              [FREE]   │               │
│         └───────────────────────┘               │
│                                                 │
├─────────────────────────────────────────────────┤
│       © Lead Gen Jay · Privacy Policy           │
└─────────────────────────────────────────────────┘
```

---

## Section Breakdown

### Section 1: Hero (Required)

The only section that matters. Logo + headline + subheadline + form + image.

**Layout:**
- `max-w-[900px] mx-auto` centered column (wide enough for 2-row headlines)
- `min-h-screen flex flex-col items-center justify-center` (vertically centered on viewport)
- `px-6 py-12` padding

**Components (top to bottom):**

1. **Logo** — `lgj-logo.webp`, `h-8` or `h-10`, centered
2. **Headline** — Max 2 rows. Specific. Number + outcome.
   - `font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-center text-slate-900 leading-tight`
   - Formula: `"[Number] [Categories/Frameworks], [Number] [Items] — [Specific Value Prop]"`
   - Alternative: `"[Number] [Templates/Scripts/Frameworks] for [Specific Outcome]"`
3. **Subheadline** — One clarifying line, max 2 rows
   - `text-base md:text-lg text-slate-600 text-center mb-8 max-w-[640px]`
   - Should add specificity or social proof to the headline
4. **Opt-in form** — Name + email + emerald CTA button, wrapped in pulsing glow
   - `max-w-[480px] mx-auto mb-8` container
   - Wrap in `motion.div` with pulsing emerald glow animation:
     ```tsx
     animate={{
       boxShadow: [
         "0 0 0 0 rgba(16,185,129,0)",
         "0 0 24px 8px rgba(16,185,129,0.15)",
         "0 0 0 0 rgba(16,185,129,0)",
       ],
     }}
     transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
     ```
   - Use `<OptinForm>` component with `buttonColor="emerald"`
   - Form card: white bg, subtle brand-tinted shadow `rgba(237,13,81,0.06)`
   - Submit button: emerald green `bg-emerald-500 hover:bg-emerald-600` with `whileTap={{ scale: 0.97 }}`
   - Button text: "Get Free Access" or "Download Now" or "Send Me The [Thing]"
   - Friction text: "Free. No spam. Unsubscribe anytime."
5. **Lead magnet image** — Product mockup, PDF cover, or framework preview
   - `max-w-[480px] w-full mx-auto` (same width as form)
   - Use `next/image` with `priority={true}` (above fold)
   - Brand-tinted shadow: `shadow-[0_8px_32px_rgba(237,13,81,0.06)]`
   - "FREE RESOURCE" frosted badge overlay: `absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm`

**Animation:**
- Wrap entire hero in `<FadeIn>` with default duration
- Form gets pulsing emerald glow (Framer Motion)
- CTA button gets `whileTap={{ scale: 0.97 }}`
- No other animations on the page

### Section 2: Social Proof Bar (Optional)

Only include if you have specific, impressive numbers. Skip if the numbers aren't compelling.

**Layout:**
- `max-w-[900px] mx-auto py-8`
- `flex justify-center gap-8 md:gap-12`
- Light top border: `border-t border-slate-100 pt-8`

**Content:**
- 2-3 stat counters maximum
- Format: `[Number]` large + `[Label]` small below
- Example: "2,847 Campaigns Sent" / "494K Emails Delivered" / "$12M Pipeline Generated"
- Use `CountUp` animation for numbers

**When to skip:** If you can't fill it with real, specific numbers — skip it entirely. No "1,000+ happy customers" generic stats.

### Section 3: Footer (Required)

Minimal. Just legal compliance.

- `text-center text-sm text-slate-400 py-6`
- `© [Year] Lead Gen Jay · Privacy Policy`
- Privacy Policy links to `/privacy`

---

## Copy Formula

### Headline Patterns (pick one)

```
"[N] [Categories/Topics], [N] [Items] — [Specific Value Prop]"
"[N] [Templates/Scripts/Frameworks] for [Audience] Who Want to [Outcome]"
"The [Adjective] [Thing] Behind [Impressive Stat]"
"How [Audience] [Achieve Result] Without [Common Objection]"
```

### Examples

- "6 Categories, 33 Commands — The Only Claude Code Reference You Need"
- "10 Categories, 33 Topics — Your Complete OpenClaw Reference"
- "5 Lead Gen Scripts for B2B Founders Who Want Booked Calls, Not Bounced Emails"
- "The Exact Outreach Playbook Behind $4.2M in Closed Deals"

### Rules

- Always include a specific number
- Always include a specific result or metric
- Never use "Ultimate Guide" or "Complete Framework" — too vague
- Headline must fit in MAX 2 rows at desktop width
- Subheadline must fit in MAX 2 rows at desktop width
- The headline IS the value prop — no supporting paragraphs needed

---

## Component Structure

```
src/app/value/[slug]/
├── page.tsx              # Metadata + server component
└── content.tsx           # Client component — hero + image + footer

src/components/value/
└── optin-form.tsx        # Reusable form with buttonColor prop

src/lib/lead-magnets/
└── registry.ts           # Central config for all lead magnets
```

### Registry Config

Each lead magnet is defined in `registry.ts` with:
- `type`: "pdf" (Supabase Storage attachment) or "link" (access URL)
- `title`: Display name
- `headline`: Number-driven H1 text
- `description`: Subheadline text
- `previewImage`: Screenshot path in `/public/images/value/`
- `calendarLink`: Book-a-call URL
- For PDF: `storagePath` + `fileName`
- For Link: `accessUrl`

### Email Delivery

Emails sent via Resend (`src/lib/resend.ts`) using HTML template (`src/lib/emails/lead-magnet-email.ts`).
- Typography logo (no image): "LEAD GEN JAY" with brand pink accent
- Dark access button for resource link
- Pink CTA for book-a-call
- "Reply Got It" deliverability ask

---

## What to Leave Out (Checklist)

Before shipping, verify NONE of these exist on the page:

- [ ] Navigation bar or header menu
- [ ] "About the author" or instructor bio
- [ ] Bullet list of "What's inside"
- [ ] Testimonials or quotes
- [ ] FAQ section
- [ ] Multiple CTA buttons with different actions
- [ ] Dark background sections
- [ ] ScrollReveal animations below the fold
- [ ] Footer links beyond privacy policy
- [ ] Social media icons
- [ ] "As seen in" logo strip
- [ ] Countdown timer or urgency elements
