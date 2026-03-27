# Opt-in / Registration Blueprint — 4-6 Sections

Modeled on ListKit's opt-in page and Acquisition.com's workshop registration. Two-column hero with form. Only add sections 2-4 if they genuinely earn their place.

---

## Wireframe

```
┌──────────────────────────────────────────────────────────┐
│  [LGJ Logo]                                              │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────┐  ┌──────────────────────────┐   │
│  │  [Badge: FREE]      │  │  ┌────────────────────┐  │   │
│  │                     │  │  │  Register for Free  │  │   │
│  │  The 5 Cold Email   │  │  ├────────────────────┤  │   │
│  │  Frameworks That    │  │  │  Name               │  │   │
│  │  Book Meetings on   │  │  │  Email              │  │   │
│  │  Autopilot          │  │  │  [Get Free Access]  │  │   │
│  │                     │  │  │  No spam. Free.     │  │   │
│  │  Learn the exact    │  │  └────────────────────┘  │   │
│  │  system behind...   │  │                          │   │
│  │                     │  └──────────────────────────┘   │
│  │  ✓ Framework 1      │                                 │
│  │  ✓ Framework 2      │                                 │
│  │  ✓ Framework 3      │                                 │
│  └─────────────────────┘                                 │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  "This training is ONLY for B2B companies doing $1M+     │
│   in revenue who want to add cold email as a channel.    │
│   If you're selling to consumers, this isn't for you."   │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│   2,847          494K           $12M                     │
│  Campaigns    Emails Sent   Pipeline Built               │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ Icon     │  │ Icon     │  │ Icon     │               │
│  │ Benefit  │  │ Benefit  │  │ Benefit  │               │
│  │ 1-liner  │  │ 1-liner  │  │ 1-liner  │               │
│  └──────────┘  └──────────┘  └──────────┘               │
│                                                          │
├──────────────────────────────────────────────────────────┤
│       [Get Free Access →]                                │
│       No credit card required.                           │
│   © Lead Gen Jay · Privacy Policy                        │
└──────────────────────────────────────────────────────────┘
```

---

## Section Breakdown

### Section 1: Hero (Required)

Two-column layout on desktop. Copy left, form right. Stacks on mobile (copy on top, form below).

**Layout:**
- `max-w-[1100px] mx-auto px-6 py-16 md:py-24`
- `grid md:grid-cols-2 gap-12 items-center`
- Mobile: single column, stacked

**Left Column — Copy:**

1. **Badge** (optional) — small colored pill
   - `inline-block bg-[#ED0D51]/10 text-[#ED0D51] text-sm font-semibold px-3 py-1 rounded-full mb-4`
   - Text: "FREE TRAINING" / "FREE WORKSHOP" / "FREE MASTERCLASS"

2. **Headline** — One line, specific outcome
   - `font-heading text-4xl md:text-5xl font-bold text-slate-900 leading-tight`
   - Formula: "[Number] [Specific Thing] That [Specific Result]"

3. **Subheadline** — 1-2 lines max
   - `text-lg text-slate-600 mt-4 leading-relaxed`
   - Explain what they'll learn or receive — one sentence

4. **Benefit bullets** — Exactly 3
   - `flex items-start gap-3 mt-6` per bullet
   - Check icon: Lucide `Check` in `text-[#ED0D51]` or `text-[#0144F8]` (alternate)
   - Text: `text-slate-700` — short, specific, outcome-focused
   - Each bullet = one specific takeaway, not a vague benefit

**Right Column — Form Card:**

- `bg-white border border-slate-200 rounded-xl p-6 md:p-8`
- `shadow-[0_4px_24px_rgba(0,0,0,0.06)]`

1. **Form header** — `text-xl font-heading font-bold text-slate-900 mb-1`
   - "Register for Free" / "Get Instant Access" / "Save Your Spot"
2. **Form subtext** (optional) — `text-sm text-slate-500 mb-5`
3. **Name field** — `w-full px-4 py-3 border border-slate-200 rounded-lg mb-3`
   - Label: "Full Name" or "First Name"
   - `focus:ring-2 focus:ring-[#ED0D51]/20 focus:border-[#ED0D51]`
4. **Email field** — Same styling as name
5. **CTA button** — `w-full bg-[#ED0D51] hover:bg-[#d40b48] text-white font-semibold py-3 rounded-lg`
   - Text: "Get Free Access" / "Register Now" / "Save My Spot"
6. **Friction text** — `text-xs text-slate-400 text-center mt-3`
   - "Free. No credit card required." / "No spam. Unsubscribe anytime."

**Animation:**
- Wrap hero in `<FadeIn>` — the only animation on the page

### Section 2: Qualification (Optional)

Disqualify the wrong audience. This builds desire through exclusion. Only include if there's a genuine qualifier.

**Layout:**
- `max-w-[800px] mx-auto px-6 py-12 text-center`
- Light background: `bg-slate-50 rounded-xl` or just whitespace separation

**Content:**
- `text-lg md:text-xl text-slate-700 leading-relaxed`
- Format: "This [training/framework] is **only** for [specific audience] who [specific situation]. If you're [wrong audience], this isn't for you."
- Bold the qualifier using `<strong>` or `font-semibold`

**When to skip:** If the offer is genuinely for everyone, don't fake exclusivity. Just omit this section.

### Section 3: Social Proof Stats (Optional)

Specific numbers only. Skip if the numbers aren't genuinely impressive.

**Layout:**
- `max-w-[900px] mx-auto px-6 py-12`
- `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 text-center`

**Per stat:**
- Number: `font-heading text-3xl md:text-4xl font-bold text-slate-900`
- Label: `text-sm text-slate-500 mt-1`
- Use `CountUp` animation (the only below-fold animation allowed)

**Examples of good stats:**
- "2,847 Campaigns Launched"
- "494K Cold Emails Sent"
- "$12M Pipeline Generated"
- "342 Meetings Booked Last Quarter"

**Examples of bad stats (don't use):**
- "1,000+ Happy Customers" (vague)
- "10x ROI" (unverifiable)
- "99% Satisfaction Rate" (generic)

### Section 4: What You Get (Optional)

3 benefit cards max. Only include if the offer has distinct deliverables worth highlighting.

**Layout:**
- `max-w-[900px] mx-auto px-6 py-12`
- `grid md:grid-cols-3 gap-6`

**Per card:**
- `bg-white border border-slate-100 rounded-xl p-6`
- Lucide icon: `w-10 h-10` in `text-[#ED0D51]` or `text-[#0144F8]` (alternate)
- Title: `font-heading text-lg font-bold text-slate-900 mt-4`
- Description: `text-sm text-slate-600 mt-2` — one sentence max

**Rule:** If you can't fill 3 cards with genuinely distinct benefits, use 2 or skip the section entirely.

### Section 5: Repeated CTA + Footer (Required)

Repeat the CTA and close.

**Layout:**
- `max-w-[640px] mx-auto px-6 py-12 text-center`

**Content:**
1. **Headline** (optional) — restate the core promise in one line
   - `font-heading text-2xl font-bold text-slate-900`
2. **CTA button** — same styling as hero form button
   - Links/scrolls to the hero form OR duplicates the form inline
   - Same text as hero CTA for consistency
3. **Friction text** — same as hero
4. **Footer** — `text-sm text-slate-400 mt-12`
   - `© [Year] Lead Gen Jay · Privacy Policy`

---

## Copy Formulas

### Headline Patterns

```
"The [Number] [Frameworks/Systems/Scripts] That [Specific Result]"
"How [Audience] [Achieve Outcome] in [Timeframe] Without [Objection]"
"[Number] [Things] Every [Audience] Needs to [Outcome]"
"The Exact [System/Process] Behind [Impressive Metric]"
```

### Badge Text Options
- FREE TRAINING
- FREE WORKSHOP
- FREE MASTERCLASS
- FREE DOWNLOAD
- LIMITED ACCESS

### Benefit Bullet Formula
Each bullet follows: **[Specific thing]** — [why it matters in one clause]

```
"The 3-line cold email template that gets 40%+ open rates"
"Why 90% of outreach fails — and the fix that takes 5 minutes"
"The follow-up sequence that converts 'no reply' into booked calls"
```

### Disqualification Formula
```
"This is only for [specific audience] who [specific situation].
If you [wrong fit description], this training isn't for you."
```

---

## Component Structure

```
src/app/[page-name]/
├── page.tsx              # Metadata
└── content.tsx           # Client component

src/components/[page-name]/
├── hero.tsx              # Two-column: copy + form
├── stats.tsx             # Optional: CountUp stat bar
├── benefits.tsx          # Optional: 3-card grid
└── cta-footer.tsx        # Repeated CTA + footer
```

---

## What to Leave Out (Checklist)

- [ ] Navigation bar or header menu
- [ ] Instructor bio or "about" section
- [ ] FAQ accordion
- [ ] Testimonial carousel or quotes
- [ ] Comparison table
- [ ] Video embed (that's VSL template territory)
- [ ] Value stack or pricing breakdown
- [ ] Guarantee badge (it's free)
- [ ] Countdown timer
- [ ] Multiple different CTAs
- [ ] Dark background sections
- [ ] ScrollReveal on sections below the fold
- [ ] More than 3 benefit bullets in the hero
- [ ] More than 3 benefit cards in section 4
- [ ] Social media links
