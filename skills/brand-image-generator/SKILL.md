---
name: brand-image-generator
description: Generate brand-consistent images using fal.ai FLUX.1. This skill should be used when creating images for landing pages, marketing materials, or any visual assets that need to match Lead Gen Jay brand style. Ensures visual consistency across all generated imagery.
---

# Brand Image Generator

This skill provides frameworks for generating consistent, on-brand images using fal.ai FLUX.1 model.

## When to Use

- Creating hero images for landing pages
- Generating illustrations for marketing materials
- Building consistent visual libraries
- Creating product mockups or screenshots
- Any image generation that needs brand consistency

## Brand Style Foundation

### Lead Gen Jay Visual Identity

| Element | Specification |
|---------|---------------|
| **Style** | Modern, professional, clean |
| **Mood** | Confident, results-focused, approachable |
| **Color Palette** | Professional blues, clean whites, accent colors |
| **Imagery** | Real-world business contexts, success imagery |
| **Avoid** | Stock photo clichés, overly corporate, generic |

### Image Categories

1. **Hero Images** - Large, impactful visuals for above-fold sections
2. **Feature Illustrations** - Icons and graphics for benefit sections
3. **Background Elements** - Subtle patterns, gradients, textures
4. **Product Mockups** - Screenshots, device frames, UI previews
5. **Social Proof** - Professional headshots, company imagery

## Prompt Engineering Framework

### The SPECS Formula

Every prompt should include:

| Component | Purpose | Example |
|-----------|---------|---------|
| **S**tyle | Art style/aesthetic | "minimalist flat design" |
| **P**urpose | What it's for | "hero image for SaaS landing page" |
| **E**lements | Key visual components | "laptop, growth chart, professional setting" |
| **C**olors | Color specifications | "blue (#2563eb) and white color scheme" |
| **S**cale | Size/composition | "centered composition, clean background" |

### Prompt Template

```
[STYLE]: [aesthetic description]
[SUBJECT]: [main subject/scene]
[ELEMENTS]: [specific visual components]
[COLORS]: [color palette]
[MOOD]: [emotional quality]
[TECHNICAL]: [quality modifiers]
```

## fal.ai Integration

### Model Selection

Use FLUX.1 [schnell] via `/generate-image` command:
- Fast generation (~2 seconds)
- Cost-effective ($0.003/megapixel)
- Great for iterations

### Recommended Dimensions

| Use Case | Dimensions | Ratio |
|----------|------------|-------|
| Hero Images | 1024×768 | 4:3 |
| Feature Graphics | 512×512 | 1:1 |
| Icons | 256×256 | 1:1 |
| Social Images | 1200×630 | 1.91:1 |
| Mobile Hero | 750×1334 | 9:16 |

### Quality Modifiers

Always append these for professional results:
- "high quality"
- "professional"
- "clean design"
- "sharp details"
- "well-lit"

## Brand Consistency Rules

### DO

- Use consistent color palette across all images
- Maintain similar lighting and mood
- Keep compositions clean and focused
- Use professional, business-appropriate imagery
- Generate multiple variations and select best

### DON'T

- Mix conflicting art styles
- Use overly busy compositions
- Generate generic stock-photo-style images
- Ignore brand color palette
- Use a single generation without iteration

## Prompt Library by Category

### Hero Images

**Professional/Business:**
```
Modern professional workspace, clean minimalist design, person at laptop with growth dashboard on screen, soft natural lighting, blue (#2563eb) accent color, professional photography style, high quality, sharp details
```

**Success/Results:**
```
Abstract visualization of business growth, upward flowing lines and geometric shapes, modern gradient from deep blue to light blue, clean white background, professional SaaS aesthetic, high quality
```

### Feature Illustrations

**Data/Analytics:**
```
Minimalist flat illustration of data analytics dashboard, clean geometric shapes, blue (#2563eb) primary color with white, modern vector style, centered composition, high quality
```

**Communication:**
```
Simple flat icon of communication or messaging, speech bubbles or envelope, minimalist style, blue monochrome, clean white background, vector illustration, high quality
```

### Background Elements

**Gradient:**
```
Smooth gradient background, transitioning from deep blue (#1e40af) to light blue (#93c5fd) to white, subtle flowing curves, clean modern design, high resolution
```

**Pattern:**
```
Subtle geometric pattern, thin lines forming grid or network, very light blue on white background, minimalist, professional, seamless tile, high quality
```

## Workflow

### Step 1: Define Requirements
- What type of image?
- Where will it be used?
- What size/dimensions?
- Key elements to include?

### Step 2: Craft Initial Prompt
- Use SPECS formula
- Reference brand guidelines
- Include quality modifiers

### Step 3: Generate Variations
- Generate 2-3 variations
- Adjust prompt based on results
- Iterate until satisfied

### Step 4: Select and Refine
- Choose best result
- Note effective prompt patterns
- Save for consistency reference

## Common Adjustments

| Issue | Adjustment |
|-------|------------|
| Too busy | Add "minimalist", "clean", "simple" |
| Wrong colors | Specify hex codes explicitly |
| Generic look | Add specific details and context |
| Wrong style | Add art style descriptor first |
| Poor composition | Specify "centered", "balanced", "clean background" |

## Integration with Other Skills

This skill works with:
- **hero-section-designer** - Generate hero images for hero sections
- **icon-set-creator** - Foundation for icon generation
- **landing-page-auditor** - Visual improvements based on audit findings

## Reference Materials

For prompt templates by category, consult:
- `references/prompt-templates.md` - Ready-to-use prompts for different scenarios
