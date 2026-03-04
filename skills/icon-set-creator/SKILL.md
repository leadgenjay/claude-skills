---
name: icon-set-creator
description: Create cohesive icon sets for landing pages using fal.ai FLUX.1. This skill should be used when building feature sections, benefit lists, or any visual elements requiring consistent iconography. Ensures all icons in a set share the same style, colors, and visual weight.
---

# Icon Set Creator

This skill provides frameworks for generating consistent, cohesive icon sets using fal.ai FLUX.1 model.

## When to Use

- Building feature/benefit sections with icons
- Creating visual elements for landing pages
- Developing icon libraries for a project
- Ensuring iconography consistency across pages
- Generating custom icons that match brand style

## Why Icon Consistency Matters

- **Inconsistent icons look unprofessional**
- Consistent style reinforces brand
- Visual coherence improves trust
- Well-designed icons improve scannability
- Custom icons differentiate from competitors

## Icon Style Categories

### 1. Flat/Minimal Icons

```
Style: Clean, geometric, single color
Best for: Modern SaaS, professional services
Prompt modifier: "minimalist flat icon, single color, geometric shapes"
```

### 2. Gradient Icons

```
Style: Depth through gradients, modern feel
Best for: Tech products, modern brands
Prompt modifier: "gradient icon, smooth color transition, modern 3D feel"
```

### 3. Outlined Icons

```
Style: Line-based, open, light
Best for: Documentation, light interfaces
Prompt modifier: "outlined icon, thin strokes, open design, line art"
```

### 4. Filled Icons

```
Style: Solid shapes, bold, high contrast
Best for: CTAs, emphasis, dark backgrounds
Prompt modifier: "solid filled icon, bold shapes, high contrast"
```

### 5. Duotone Icons

```
Style: Two colors/tones, depth
Best for: Feature sections, marketing pages
Prompt modifier: "duotone icon, two-tone color scheme, layered depth"
```

## Icon Set Workflow

### Step 1: Define Requirements

- How many icons needed?
- What concepts/features do they represent?
- What style fits the brand?
- What size will they display?

### Step 2: Establish Style Guide

Create a base prompt that all icons will share:

```
[STYLE]: [flat/gradient/outlined/filled/duotone]
[COLOR]: [primary color with hex]
[BACKGROUND]: [white/transparent/colored]
[SHAPE]: [rounded/sharp/geometric]
[WEIGHT]: [light/medium/bold]
```

### Step 3: Generate First Icon

Create one icon and refine the prompt until perfect. This becomes your reference.

### Step 4: Batch Generate Remaining Icons

Use the refined base prompt, only changing the subject for each icon.

### Step 5: Review for Consistency

Check all icons together for:
- Same visual weight
- Consistent color saturation
- Similar level of detail
- Matching corner radii
- Equal perceived size

## Prompt Engineering for Icons

### Base Prompt Template

```
[style] icon of [subject], [color specification], clean white background, centered composition, consistent line weight, professional quality, high resolution, vector style
```

### Example Base Prompt (Flat Style)

```
Minimalist flat icon of [SUBJECT], blue (#2563eb) monochrome, clean white background, simple geometric shapes, centered, consistent 2px line weight, professional vector style, high quality
```

### Subject Substitution

Replace `[SUBJECT]` with specific concept:
- "rocket ship" for Growth/Launch
- "shield with checkmark" for Security
- "gear cog" for Settings/Automation
- "bar chart trending up" for Analytics
- "envelope" for Email/Communication
- "user group" for Team/Community
- "clock" for Time/Speed
- "target bullseye" for Goals/Precision

## Common Icon Categories

### Feature Icons

| Concept | Subject Description |
|---------|---------------------|
| Speed | "lightning bolt" or "speedometer" |
| Security | "shield with checkmark" |
| Analytics | "bar chart" or "pie chart" |
| Integration | "connected puzzle pieces" |
| Automation | "gear cogs" or "workflow arrows" |
| Support | "headset" or "chat bubble" |

### Benefit Icons

| Concept | Subject Description |
|---------|---------------------|
| Save Time | "clock with checkmark" |
| Save Money | "piggy bank" or "dollar sign" |
| Growth | "upward trending arrow" |
| Simplicity | "single click" or "magic wand" |
| Reliability | "shield" or "checkmark badge" |
| Results | "trophy" or "target" |

### Process/Step Icons

| Concept | Subject Description |
|---------|---------------------|
| Step 1/Start | "play button" or "starting flag" |
| Configure | "sliders" or "settings gear" |
| Connect | "chain link" or "plug" |
| Launch | "rocket" or "arrow up" |
| Complete | "checkmark" or "celebration" |

## Recommended Dimensions

| Use Case | Size | Notes |
|----------|------|-------|
| Feature grid | 64×64px | Most common |
| Large features | 96×96px | Hero-adjacent |
| Inline icons | 24×24px | Text alongside |
| Nav icons | 20×20px | Navigation elements |
| Generation | 256×256px | Generate larger, scale down |

**Always generate at 256×256px or larger, then scale down for crisp results.**

## Style-Specific Prompts

### Flat/Minimal (Lead Gen Jay Default)

```
Minimalist flat icon of [subject], blue (#2563eb) fill color, clean white background, simple geometric shapes only, no gradients, no shadows, centered composition, professional vector style, high quality
```

### Modern Gradient

```
Modern gradient icon of [subject], gradient from navy blue (#1e3a8a) to bright blue (#3b82f6), subtle 3D depth, soft shadow, clean light background, contemporary design, high quality
```

### Outlined/Line

```
Clean outlined icon of [subject], thin blue (#2563eb) strokes only, no fill, consistent 2px line weight, rounded corners, white background, minimalist line art style, high quality
```

### Duotone

```
Duotone icon of [subject], primary blue (#2563eb) with light blue (#93c5fd) secondary, layered design, subtle depth, clean white background, modern two-tone style, high quality
```

## Consistency Checklist

Before finalizing an icon set, verify:

- [ ] All icons use same style (flat/gradient/etc.)
- [ ] Colors match exactly (same hex codes)
- [ ] Visual weight is consistent
- [ ] Level of detail is similar
- [ ] Corner radii match
- [ ] Line weights are equal
- [ ] Icons appear same size when displayed together
- [ ] All have same background treatment

## Implementation in Code

### Using Generated Icons

```tsx
// Feature section with icons
const features = [
  { icon: "/icons/analytics.png", title: "Smart Analytics", description: "..." },
  { icon: "/icons/automation.png", title: "Automation", description: "..." },
  { icon: "/icons/security.png", title: "Security", description: "..." },
];

<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
  {features.map((feature) => (
    <div key={feature.title} className="text-center">
      <div className="w-16 h-16 mx-auto mb-4">
        <Image src={feature.icon} alt="" width={64} height={64} />
      </div>
      <h3 className="font-semibold mb-2">{feature.title}</h3>
      <p className="text-muted-foreground">{feature.description}</p>
    </div>
  ))}
</div>
```

### Icon with Background Circle

```tsx
<div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
  <Image src="/icons/feature.png" alt="" width={24} height={24} />
</div>
```

## Troubleshooting

### Icons Look Inconsistent

- Use exact same base prompt
- Generate all in same session
- Check color hex codes match
- Ensure same style keywords

### Icons Too Detailed

- Add "simple", "minimal", "clean" to prompt
- Specify "few elements only"
- Remove unnecessary descriptors

### Wrong Color

- Always specify hex code: `blue (#2563eb)`
- Add "monochrome" for single-color
- Avoid color words without hex (blue varies)

### Icons Look Different Sizes

- All should be generated at same dimensions
- Check padding/margins are consistent
- Use same "centered composition" modifier

## Integration with Other Skills

This skill works with:
- **brand-image-generator** - Foundation for all visual consistency
- **hero-section-designer** - Icons in hero feature callouts
- **landing-page-auditor** - Visual consistency scoring

## Reference Materials

For prompt templates by icon style, consult:
- `references/icon-prompts.md` - Ready-to-use prompts for different icon styles
