---
name: simple-design
description: Radically simple landing page templates for low-friction offers. 3-6 sections max, one action path, zero fluff. Use for lead magnets, email opt-ins, webinar/VSL registrations — any free or low-cost offer where clarity beats persuasion.
---

# Simple Design — Radical Simplicity for High-Converting Pages

## 1. Purpose & Philosophy

**Every element must earn its place. If removing it wouldn't hurt conversions, remove it.**

Simple Design creates pages modeled on Acquisition.com and ListKit — companies that convert through specificity and clarity, not exhaustive persuasion. These pages have 3-6 sections, one action path, and zero decorative noise.

**Relationship to other skills:**
- **frontend-design** = creative direction, brand expression → Simple Design *constrains* it
- **taste** = quality enforcement, anti-slop → Simple Design *inherits* it
- **dan-kennedy-copywriter** = full PAS framework → Simple Design *overrides* it for low-friction offers

**Use this skill when:**
- Free lead magnets (PDF, framework, checklist)
- Email opt-in / registration pages
- Webinar or VSL landing pages
- Assessment or quiz funnels
- Any offer with zero payment friction

**Do NOT use this skill when:**
- Paid sales pages or checkout flows (use `taste` + `frontend-design`)
- Offers above $100 (use full Dan Kennedy PAS)
- Pages that need objection handling, guarantees, or value stacks

---

## 2. Simplicity Ceilings

Hard limits. Do not exceed these without explicit instruction from Jay.

| Template | Max Sections | Form Fields | Reference |
|----------|-------------|-------------|-----------|
| Lead Magnet | 3–4 | Email only | `references/lead-magnet-blueprint.md` |
| Opt-in / Registration | 4–6 | Email + name | `references/optin-registration-blueprint.md` |
| VSL / Webinar | 4–5 | Email + name | `references/vsl-webinar-blueprint.md` |
| Assessment / Quiz | 3 (landing) + quiz steps | Email at results gate | `references/assessment-funnel-blueprint.md` |

---

## 3. Copy Rules (Override Full PAS)

These rules replace Dan Kennedy's full Problem-Agitate-Solution framework for simple pages. Brevity is the conversion lever here.

1. **One headline. One promise. One CTA.** Repeat the CTA — never add a second action path.
2. **Specificity replaces length.** "5 Scaling Frameworks Used by $10M+ Agencies" beats three paragraphs explaining what's inside.
3. **Disqualify, don't persuade.** "Only for B2B companies doing $1M+ in revenue" builds desire through exclusion.
4. **Stats over stories.** "494K cold emails sent across 2,847 campaigns" beats "Our journey started when..."
5. **Transparent tone.** Say what it is, who it's for, what happens after they submit. No mystery.
6. **Friction text under every CTA.** "Free. No credit card required." / "No spam. Unsubscribe anytime."

### Banned Copy Patterns
- Long-form storytelling or origin narratives
- Multiple benefit paragraphs (use 3 bullet points max)
- Urgency language ("Limited time!", "Only X spots left!") — unless genuinely true
- Vague promises ("Transform your business", "Unlock your potential")

---

## 4. Banned Sections

These sections are banned on simple pages. They add friction without proportional conversion lift on free offers.

- Instructor bio / about the creator
- Comparison tables
- Curriculum / module breakdown
- Value stack ("$2,997 value — yours free")
- Money-back guarantee (it's free — no guarantee needed)
- Partner perks / bonus sections
- FAQ (if the page needs FAQ, the headline isn't clear enough)
- Testimonial carousels (one stat bar or nothing)

---

## 5. Design Overrides

Simple pages use suppressed taste dials to reduce visual noise.

| Dial | Simple Default | vs. Taste Default | Why |
|------|---------------|-------------------|-----|
| `DESIGN_VARIANCE` | **4** | 6 | Symmetry builds trust on opt-in pages |
| `MOTION_INTENSITY` | **3** | 5 | Only hero gets FadeIn — nothing below fold |
| `VISUAL_DENSITY` | **3** | 4 | Maximum breathing room |

### Layout Rules
- Single centered column (`max-w-[900px]` for lead magnets and VSL)
- Two-column hero allowed for opt-in/registration (copy left, form right)
- White or very light backgrounds only — no dark sections
- No decorative gradients, no background patterns
- No ScrollReveal below the fold — FadeIn on hero section only
- Headline and subheadline must each fit in MAX 2 rows at desktop width

### Component Rules
- Forms: bordered card with brand-tinted shadow `rgba(237,13,81,0.06)`, pulsing emerald glow animation, emerald green CTA button (`bg-emerald-500`), `whileTap={{ scale: 0.97 }}`
- Form placed ABOVE preview image (form is the focal point)
- Stats: use `CountUp` animation for number counters only
- Icons: Lucide only, `strokeWidth={1.5}`, alternating pink/blue per the LGJ brand rules
- Images: lead magnet mockup below form, same width as form (`max-w-[480px]`), "FREE RESOURCE" frosted badge overlay

---

## 6. Template Selection

Choose the template based on the offer type:

| Offer | Template | Key Signal |
|-------|----------|------------|
| PDF, checklist, framework, swipe file | Lead Magnet | No video, deliverable is a file |
| Free training, workshop, challenge | Opt-in / Registration | Multi-benefit, event-style |
| Video sales letter, webinar replay | VSL / Webinar | Video is the primary content |
| Quiz, assessment, scorecard | Assessment / Quiz | Lead qualification via questions |

When unsure, default to **Opt-in / Registration** — it's the most flexible.

---

## 7. Technical Integration

### Form Handling (Lead Magnets)
Lead magnet forms use the reusable `<OptinForm>` component and centralized registry:
- Registry: `src/lib/lead-magnets/registry.ts` — define slug, title, headline, type, delivery config
- API route: `src/app/api/value/optin/route.ts` — handles DB insert, email delivery, Hyros tracking
- Email: `src/lib/resend.ts` + `src/lib/emails/lead-magnet-email.ts` — Resend transactional email
- Form: `src/components/value/optin-form.tsx` — reusable with `buttonColor` prop

### Form Handling (Other Simple Pages)
All other forms POST to the page's dedicated webhook URL via `LANDER_OPTIN_WEBHOOK_URL` pattern. Follow the existing pattern in `docs/landing-page-guide.md` for:
- API route creation (`src/app/api/[page]/optin/route.ts`)
- Hyros attribution tracking
- GHL/webhook forwarding

### Component Structure
```
# Lead magnets (use registry pattern):
src/app/value/[slug]/
├── page.tsx          # Server component with metadata
└── content.tsx       # Client component ('use client')

src/components/value/
└── optin-form.tsx    # Reusable form with buttonColor prop

src/lib/lead-magnets/
└── registry.ts       # Central config for all lead magnets

# Other simple pages:
src/app/[page-name]/
├── page.tsx          # Server component with metadata
└── content.tsx       # Client component ('use client')

src/components/[page-name]/
├── hero.tsx          # Always present
├── form.tsx          # Inline or extracted — depends on template
└── [optional].tsx    # Stats, benefits, qualification — only if earned
```

### Reusable Components
- `src/components/value/optin-form.tsx` — Lead magnet opt-in form (name + email, emerald CTA)
- `src/components/animations/` — FadeIn only (no ScrollReveal on simple pages)
- `src/components/ui/` — shadcn/ui primitives

---

## 8. Reference File Index

| File | When to Load |
|------|-------------|
| `references/lead-magnet-blueprint.md` | Building a PDF/framework/checklist opt-in |
| `references/optin-registration-blueprint.md` | Building a training/workshop/challenge registration |
| `references/vsl-webinar-blueprint.md` | Building a video-first landing page |

Load the specific blueprint for your template. Do not load all three.
