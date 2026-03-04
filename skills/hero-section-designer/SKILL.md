---
name: hero-section-designer
description: Design high-converting hero sections that combine compelling visuals, Dan Kennedy copy, and clear CTAs. This skill should be used when building above-fold sections for landing pages, optimizing hero areas, or creating impactful first impressions. The hero section is where 80% of conversion decisions start.
---

# Hero Section Designer

This skill provides frameworks for creating above-fold hero sections that combine imagery, copy, and CTAs into high-converting first impressions.

## When to Use

- Building landing page hero sections
- Optimizing above-fold content
- Redesigning page headers for better conversion
- Creating impactful first impressions
- Combining visuals with Dan Kennedy copy

## Why Hero Sections Matter

- **80% of visitors** never scroll past the fold
- Hero section has **~3 seconds** to capture attention
- First impression determines bounce vs engage
- Must answer: "What is this? Is it for me? What do I do?"

## Hero Section Anatomy

### Essential Components

```
┌────────────────────────────────────────────────────┐
│  [Logo/Nav - minimal, non-distracting]             │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌──────────────────────┐  ┌────────────────────┐  │
│  │                      │  │                    │  │
│  │     HEADLINE         │  │    HERO IMAGE      │  │
│  │     Subheadline      │  │    or Video        │  │
│  │                      │  │                    │  │
│  │     [CTA BUTTON]     │  │                    │  │
│  │                      │  │                    │  │
│  │     Trust Element    │  │                    │  │
│  │                      │  │                    │  │
│  └──────────────────────┘  └────────────────────┘  │
│                                                    │
└────────────────────────────────────────────────────┘
```

### Component Hierarchy

| Priority | Element | Purpose |
|----------|---------|---------|
| 1 | Headline | Capture attention, communicate value |
| 2 | CTA Button | Clear action to take |
| 3 | Subheadline | Support/clarify headline |
| 4 | Hero Visual | Reinforce message, create emotion |
| 5 | Trust Element | Reduce hesitation |

## Hero Layout Patterns

### Pattern 1: Split Hero (50/50)

Best for: Lead generation, SaaS, professional services

```
┌─────────────────────────────────────────┐
│  [Text Left]        │  [Image Right]    │
│                     │                   │
│  Headline           │  Product shot,    │
│  Subheadline        │  illustration,    │
│  CTA Button         │  or dashboard     │
│  Trust badges       │                   │
└─────────────────────────────────────────┘
```

### Pattern 2: Centered Hero

Best for: Single product focus, strong visual identity

```
┌─────────────────────────────────────────┐
│          [Background Image/Video]       │
│                                         │
│              Centered Headline          │
│              Centered Subheadline       │
│              [CTA BUTTON]               │
│              Trust element              │
└─────────────────────────────────────────┘
```

### Pattern 3: Product Showcase

Best for: SaaS, software products

```
┌─────────────────────────────────────────┐
│         Headline centered               │
│         Subheadline                     │
│         [CTA]  [Secondary]              │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │    Large Product Screenshot       │  │
│  │    with Browser Frame             │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Headline Framework (Dan Kennedy)

### Headline Formulas for Heroes

1. **Benefit + Specificity**
   - "Generate 47 Qualified Leads in 30 Days"

2. **Question + Pain Point**
   - "Tired of Leads That Never Convert?"

3. **How To + Desired Outcome**
   - "How to Fill Your Pipeline Without Cold Calling"

4. **Secret/Hidden + Benefit**
   - "The Lead Generation Secret Top Agencies Don't Share"

5. **Proof + Promise**
   - "Join 5,000+ Agencies Getting Consistent Leads"

### Subheadline Support

The subheadline should:
- Clarify the headline
- Add the "how" or "why"
- Address secondary objection
- Keep it to 1-2 sentences max

**Formula:** "[How it works] so you can [benefit] without [pain point]"

## CTA Button Guidelines

### Button Copy Hierarchy

| Strength | Example | Use When |
|----------|---------|----------|
| Highest | "Get My Free Strategy" | Lead gen, free offer |
| High | "Start Free Trial" | SaaS, no commitment |
| Medium | "Learn More" | Complex product |
| Low | "Submit" | Never use this |

### CTA Design Rules

- **Size:** Large enough to be unmissable (48px+ height)
- **Color:** High contrast from background
- **Position:** Below headline, above fold
- **Spacing:** Generous whitespace around button
- **Text:** Action verb + benefit (6 words max)

### Supporting Microcopy

Add reassurance below button:
- "No credit card required"
- "Free 14-day trial"
- "Takes 30 seconds"
- "Join 5,000+ companies"

## Hero Image Guidelines

### Image Selection Criteria

| Do | Don't |
|----|-------|
| Product in use | Generic stock photos |
| Real results/dashboards | Handshake images |
| Relevant to offer | Unrelated decorative |
| Professional quality | Low resolution |
| Supports the message | Distracts from CTA |

### Quick Image Prompts (fal.ai)

**Product Dashboard:**
```
Modern laptop displaying professional dashboard with growth charts, clean desk, soft lighting, blue (#2563eb) accents, product photography style
```

**Abstract Success:**
```
Abstract visualization of growth, upward flowing geometric shapes, gradient navy to bright blue, dark background, modern 3D render
```

## Mobile Hero Optimization

### Mobile-Specific Rules

- **Headline:** Max 8 words
- **CTA:** Full-width button, 48px+ height
- **Image:** Below text or background
- **Trust:** Single element, not multiple badges
- **Spacing:** Generous padding, no cramping

### Mobile Layout

```
┌──────────────────┐
│    Headline      │
│    (shorter)     │
│   Subheadline    │
│  [FULL CTA BTN]  │
│  Single trust    │
│  ┌────────────┐  │
│  │   Image    │  │
│  └────────────┘  │
└──────────────────┘
```

## Hero Audit Checklist

### Must-Have Elements
- [ ] Clear, benefit-driven headline
- [ ] Visible CTA without scrolling
- [ ] Supporting visual (image/video)
- [ ] At least one trust element
- [ ] Mobile-optimized layout

### Conversion Optimizers
- [ ] Specificity in headline (numbers, timeframes)
- [ ] CTA uses action verb + benefit
- [ ] Microcopy reduces friction
- [ ] Visual supports message
- [ ] Page loads in under 3 seconds

## Implementation Workflow

### Step 1: Define the Offer
- What's the primary action?
- What does the visitor get?
- What's the value proposition?

### Step 2: Write the Copy
- Apply Dan Kennedy headline formulas
- Write subheadline for support
- Create CTA button text
- Add microcopy for reassurance

### Step 3: Select Visual Approach
- Choose layout pattern
- Generate or select hero image
- Ensure visual supports message

### Step 4: Build and Test
- Implement with shadcn/ui components
- Test mobile responsiveness
- Check load time
- Preview with Playwright

## Integration with Other Skills

This skill works with:
- **dan-kennedy-copywriter** - Headlines and CTA copy
- **brand-image-generator** - Hero image creation
- **mobile-ux-auditor** - Mobile optimization
- **landing-page-auditor** - Above-fold scoring

## Reference Materials

For hero layout patterns and code examples, consult:
- `references/hero-patterns.md` - Visual layouts with component structure
