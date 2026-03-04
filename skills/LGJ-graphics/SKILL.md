---
name: LGJ-graphics
description: Lead Gen Jay brand illustration and motion graphics style system - flat SVG with floating UI, Framer Motion animations, consistent design tokens
version: 1.0.0
tags: [illustration, svg, motion-graphics, brand-style, LGJ, framer-motion, n8n, workflow]
---

# LGJ Graphics — Illustration & Motion Style System

This skill encodes the exact visual style used across Lead Gen Jay's landing pages, tool pages, and marketing materials. Use it whenever creating new illustrations, feature graphics, hero visuals, workflow diagrams, or animated sections.

## Style Identity: "Floating Product UI"

The LGJ illustration style is **flat SVG illustrations with floating UI card elements** — a stylized "product screenshot" aesthetic that suggests the product experience without being a literal screenshot.

**Core principles:**
- Illustrations are **abstract representations of features**, not screenshots
- Elements **float and overlap** in a loose spatial composition suggesting depth
- The feeling is **clean, modern, trustworthy, and approachable**
- Motion is **subtle and spring-based**, never flashy or distracting

---

## Design Tokens (Exact Values)

### Brand Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `brand-primary` | `#ED0D51` | CTAs, primary accents, sparkle icons, glow pulses |
| `brand-primary-light` | `#ED0D51` at 10% opacity | Badges, icon backgrounds, tinted sections |
| `brand-primary-bg` | `#ED0D51` at 5% opacity | AI output sections, highlighted areas |
| `brand-blue` | `#0144F8` | Secondary accents, links, info badges, HTTP/API nodes |

### Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `success` | `#10B981` (emerald-500) | Valid badges, checkmarks, verified states |
| `success-light` | `#D1FAE5` (emerald-100) | Success badge backgrounds |
| `warning` | `#F59E0B` (amber-500) | Risky badges, star ratings, caution states |
| `warning-light` | `#FEF3C7` (amber-100) | Warning badge backgrounds |
| `danger` | `#EF4444` (red-500) | Invalid badges, error states, window close dot |
| `danger-light` | `#FEE2E2` (red-100) | Error badge backgrounds |
| `purple` | `#8B5CF6` (violet-500) | AI/magic sparkles, send step, secondary accent |
| `purple-light` | `#E0E7FF` (indigo-100) | Purple badge backgrounds |

### Slate Neutral Scale

| Token | Hex | Usage |
|-------|-----|-------|
| `slate-900` | `#0f172a` | Primary text, headings, shadow flood color |
| `slate-700` | `#334155` | Secondary text, body content |
| `slate-500` | `#64748b` | Tertiary text |
| `slate-400` | `#94a3b8` | Muted text, borders, connector lines |
| `slate-300` | `#cbd5e1` | Connector default color |
| `slate-200` | `#e2e8f0` | Card strokes, dividers |
| `slate-100` | `#f1f5f9` | Card backgrounds, subtle fills |
| `white` | `#ffffff` | Card surfaces, main backgrounds |

### Background Blobs (Tool Illustrations)

Each tool illustration uses a different tinted ellipse background:

| Tool Context | Fill Color |
|-------------|-----------|
| Email/Spam | `#E0F2FE` (sky-100) |
| Domain/DNS Health | `#DCFCE7` (green-100) |
| Blacklist/Security | `#FEE2E2` (red-100) |
| DNS Generator | `#EDE9FE` (violet-100) |
| DNS Checker | `#DBEAFE` (blue-100) |
| Inbox Placement | `#FEF3C7` (amber-100) |

---

## Shared Component Library

The project has a reusable illustration library at `src/components/illustrations/`. **Always use shared helpers instead of hand-coding primitives.**

### Shared Primitives (`shared.tsx`)

Import from `../shared` (relative) or `@/components/illustrations/shared`:

| Component | Purpose |
|-----------|---------|
| `colors` | Color token object (`colors.pink`, `colors.blue`, `colors.slate900`, etc.) |
| `ShadowDefs` | Drop-in `<defs>` block with `shadow-sm`, `shadow-md`, `shadow-lg` filters |
| `Card` | White rounded rect with shadow and slate-200 stroke |
| `Badge` | Colored pill with centered white text |
| `OutlineBadge` | White pill with colored text and slate-200 border |
| `AvatarDot` | Colored circle with optional initials |
| `getAvatarColor` | Cycle through pink/blue/emerald/amber by index |
| `StarRating` | Row of filled/empty amber stars |
| `StatusDot` | Small colored circle (success/warning/error/info) |
| `CheckIcon` | Green circle + checkmark stroke |
| `LockIcon` | Padlock icon |
| `N8nNode` | n8n-style workflow node with colored left border |
| `BezierConnector` | Curved path connecting two points with optional dots |
| `bezierPath` | Pure function returning SVG `d` attribute for bezier curves |
| `ProgressBar` | Horizontal progress bar with track and fill |
| `Divider` | Horizontal line in slate-200 |
| `TextLine` | Content placeholder rectangle |
| `MiniChart` | Sparkline-style bar chart |

### Import Pattern

```tsx
import { ShadowDefs, Card, Badge, AvatarDot, N8nNode, BezierConnector } from "../shared";
```

### Backgrounds (`backgrounds.tsx`)

| Component | Purpose |
|-----------|---------|
| `DotGridBackground` | Dot grid pattern |
| `GlowOrbs` | Slow-moving blurred orbs |

### Logo Icons (`logos.tsx`)

30 simplified brand logo icons:

**AI & Dev Tools:** `ClaudeLogo`, `OpenAILogo`, `GitHubLogo`, `VSCodeLogo`, `CursorLogo`, `VercelLogo`, `SupabaseLogo`
**Automation & Email:** `N8NLogo`, `ZapierLogo`, `MakeLogo`, `GmailLogo`, `OutlookLogo`, `SlackLogo`
**Social:** `LinkedInLogo`, `InstagramLogo`
**Cold Email & Outreach:** `InstantlyLogo`, `ApolloLogo`, `AimfoxLogo`, `PhantomBusterLogo`
**Data & Enrichment:** `ApifyLogo`, `ClayLogo`, `HyrosLogo`, `EmailBisonLogo`
**CRM & Marketing:** `HighLevelLogo`, `ConsultiLogo`
**Domains:** `DynadotLogo`
**Payments & Commerce:** `StripeLogo`, `PayPalLogo`, `WhopLogo`, `ZoomLogo`

---

## SVG Construction Rules

### ViewBox & Sizing
- Feature illustrations: `viewBox="0 0 400 300"` (4:3 landscape)
- Stats/wide illustrations: `viewBox="0 0 400 200"` (2:1 wide)
- Tool illustrations: `viewBox="0 0 256 192"` (4:3 landscape, smaller)
- Empty states: `viewBox="0 0 200 200"` (1:1 square)
- Always use `fill="none"` on the root SVG
- Apply `className={cn('w-full h-auto', className)}` for responsive sizing

### Shadow Filters

Use the `<ShadowDefs />` component. It provides three filter levels:

```tsx
<ShadowDefs />
// Then apply: filter="url(#shadow-sm)" | filter="url(#shadow-md)" | filter="url(#shadow-lg)"
```

Shadow parameters (using `feDropShadow`):
- `shadow-sm`: dy=1, stdDeviation=2, opacity=0.08
- `shadow-md`: dy=2, stdDeviation=4, opacity=0.1
- `shadow-lg`: dy=4, stdDeviation=8, opacity=0.12

All use `floodColor="#0f172a"` (slate-900).

### Card Foundations

Use the `Card` component:

```tsx
<Card x={40} y={30} width={320} height={240} rx={8} shadow="md">
  {/* Card content */}
</Card>
```

- Border radius: `rx={8}` for cards (default), `rx={6}` for inner elements, `rx={12}` for large panels
- Stroke: slate-200 at 1px (built into Card component)
- Fill: always white

### Content Line Placeholders

Use `TextLine` for placeholder text:

```tsx
<TextLine x={60} y={115} width={280} />
<TextLine x={60} y={130} width={240} />
<TextLine x={60} y={145} width={180} />
```

- Default height: 8, color: slate-200
- Vary widths to look natural (280, 240, 260, 180)

### Avatar Dots

Use `AvatarDot` component:

```tsx
<AvatarDot cx={30} cy={50} r={10} initials="JF" color={colors.pink} />
```

Colors cycle: pink, blue, emerald, amber (use `getAvatarColor(index)`).

### Status Badges

Use `Badge` for filled pills:

```tsx
<Badge x={0} y={0} label="Valid" color={colors.emerald} />
```

Use `OutlineBadge` for bordered pills:

```tsx
<OutlineBadge x={0} y={0} label="Draft" color={colors.pink} />
```

### CTA Buttons

```svg
<rect x="60" y="185" width="120" height="36" rx="18" fill="#ED0D51" />
<text x="85" y="208" fontSize="12" fill="white" fontWeight="600">Send Campaign</text>
```

- Fully rounded: `rx` = half height
- Always `#ED0D51` fill with white text

### Sparkle/Star Icons

```svg
<path d="M8 0 L10 6 L16 8 L10 10 L8 16 L6 10 L0 8 L6 6 Z" fill="#ED0D51" />
```

8-point star shape. Use brand primary or purple (`#8B5CF6`) at 40-50% opacity for floating decorative sparkles.

### Floating Accent Dots

Small colored circles at 30-40% opacity scattered around the composition:

```svg
<circle cx="145" cy="55" r="5" fill="#ED0D51" fillOpacity="0.3" />
<circle cx="50" cy="130" r="4" fill="#8B5CF6" fillOpacity="0.3" />
<circle cx="155" cy="120" r="3" fill="#10B981" fillOpacity="0.4" />
```

Sizes: r=3 to r=5. Always use `fillOpacity` not solid fills.

### Checkmark Pattern

Use `CheckIcon` component:

```tsx
<CheckIcon x={10} y={10} size={12} color={colors.emerald} />
```

### Window Controls (for editor/app illustrations)

```svg
<circle cx="75" cy="55" r="6" fill="#EF4444" />
<circle cx="95" cy="55" r="6" fill="#F59E0B" />
<circle cx="115" cy="55" r="6" fill="#10B981" />
```

### Dashed Connection Lines

```svg
<path d="M120 100 L160 100" stroke="#E5E7EB" strokeWidth="2" strokeDasharray="5,5" />
<path d="M155 95 L165 100 L155 105" fill="#E5E7EB" />
```

Use `strokeDasharray="5,5"` for connections, with small triangle arrowheads.

---

## n8n-Style Workflow Nodes

Use the `N8nNode` component — rounded rectangle with colored left border:

```tsx
<N8nNode x={20} y={40} label="Webhook" sublabel="POST /api" nodeType="trigger" />
```

Node type colors:
- **Trigger:** Pink `#ED0D51`
- **HTTP/API:** Blue `#0144F8`
- **AI/Claude:** Purple `#8b5cf6`
- **Code:** Slate `#475569`
- **Database:** Emerald `#10b981`
- **Output/Email:** Amber `#f59e0b`

### Bezier Connectors

Use `BezierConnector` to link nodes:

```tsx
<BezierConnector x1={140} y1={64} x2={180} y2={120} executionDot />
```

- Curved path from right side of one node to left side of the next
- `showDots` (default true): connection dots at each end
- `executionDot`: green dot at midpoint showing execution flow

---

## Typography in SVGs

```
Headings:   fontSize="14" fontWeight="700" fontFamily="Inter, system-ui, sans-serif" fill="#0f172a"
Body:       fontSize="11" fontWeight="500" fontFamily="Inter, system-ui, sans-serif" fill="#334155"
Small:      fontSize="9"  fontWeight="500" fontFamily="Inter, system-ui, sans-serif" fill="#94a3b8"
Mono/Code:  fontSize="10" fontWeight="500" fontFamily="'SF Mono', 'Fira Code', monospace" fill="#334155"
Badge text: fontSize="10" fontWeight="600" fill="white"
```

---

## Tool Illustration Pattern

Tool page illustrations use a distinct pattern from feature illustrations:

1. **Background blob**: Large ellipse in a tool-themed pastel color
2. **Main element**: The primary visual (envelope, globe, shield, server)
3. **Secondary element**: Supporting visual (magnifying glass, shield, code blocks)
4. **Floating badges**: Small labeled pills (SPF, DKIM, DMARC, TXT, MX)
5. **Accent sparkles**: 2-3 small colored circles

```tsx
<svg viewBox="0 0 256 192" fill="none">
  <ShadowDefs />

  {/* 1. Background blob */}
  <ellipse cx="128" cy="96" rx="100" ry="80" fill="#E0F2FE" />

  {/* 2. Main element */}
  <Card x={48} y={50} width={120} height={90}>
    {/* Card inner content */}
  </Card>

  {/* 3. Secondary element */}
  <circle cx="175" cy="115" r="30" fill="#FFFFFF" stroke="#F97316" strokeWidth="3" />

  {/* 4. Floating badges */}
  <Badge x={35} y={50} label="SPF" color={colors.emerald} fontSize={8} />

  {/* 5. Accent sparkles */}
  <circle cx="200" cy="60" r="4" fill="#FCD34D" />
</svg>
```

---

## Composition Rules

### Spatial Layout
1. Main card is centered, taking ~80% of the viewBox width
2. Floating elements **break out** of the main card boundary (overlap edges)
3. Secondary cards float in corners, offset 10-20px from main card edges
4. Avatar dots cluster in groups of 2-4 with overlapping positions
5. Stat cards anchor to bottom-left or bottom-right corners
6. Cards should overlap by 10-20% for depth

### Visual Hierarchy
1. **Main card**: White with shadow, largest element
2. **CTA button**: Brand primary, draws the eye
3. **Status badges**: Colored pills communicate meaning
4. **Avatar dots**: Add life and suggest users/activity
5. **Floating elements**: Sparkles, checkmarks create polish
6. **Content lines**: Gray rectangles fill space without distraction

### Spacing
- Card padding: 20px internal margin
- Between content lines: 15px vertical gap
- Between sections: 20-30px
- Floating elements: 10-30px offset from card edges
- 12-16px between parallel elements
- Leave 20px margin inside the viewBox edges

---

## Motion & Animation System

### Existing Components (use these, don't recreate)

Import from `@/components/ui/motion`:
- `FadeIn` - Fade with direction (up/down/left/right)
- `SlideIn` - Configurable slide from any direction
- `ScaleIn` - Scale with optional bounce
- `StaggerContainer` - Parent for staggered children (fast/normal/slow)
- `StaggerItem` - Child with scale or slide variants
- `HoverScale` - Hover/tap scale effects
- `AnimatedCounter` - Number counting animation
- `AnimatedProgressCircle` - SVG progress ring

Import from `@/lib/animations`:
- Spring presets: `springs.snappy`, `springs.smooth`, `springs.gentle`, `springs.bouncy`
- Durations: `durations.fast` (0.15s), `durations.normal` (0.2s), `durations.slow` (0.3s)
- Easings: `easings.easeOut`, `easings.emphasizedDecelerate`
- Variants: `fadeInUp`, `scaleIn`, `popIn`, `staggerContainer`, `staggerItem`
- Viewport: `viewportOnce` (once: true, margin: "-50px", amount: 0.3)

### Entrance Animation Patterns

**Feature section illustration:**
```tsx
<FadeIn direction="up">
  <MyIllustration />
</FadeIn>
```

**Stats with staggered reveal:**
```tsx
<StaggerContainer>
  <StaggerItem><StatCard value="95%" label="Accuracy" /></StaggerItem>
  <StaggerItem><StatCard value="10M+" label="Verified" /></StaggerItem>
</StaggerContainer>
```

**Floating badge with bounce:**
```tsx
<ScaleIn bounce delay={0.3}>
  <Badge>Email Verified</Badge>
</ScaleIn>
```

### Background Animations

Import from `@/components/landing/decorative-backgrounds`:

**GlowOrbs** - Slow-moving blurred orbs (22-25s loop):
```tsx
<GlowOrbs variant="pink" />  // #ED0D51 + #FF3D71
<GlowOrbs variant="purple" /> // purple-500 + violet-600
<GlowOrbs variant="blue" />   // blue-500 + cyan-500
```

**GridBackground** - Dot grid pattern:
```tsx
<GridBackground dotColor="rgba(237,13,81,0.07)" dotSize={1} gap={32} />
```

### Glow Effects
Brand primary glow for interactive elements:
```tsx
boxShadow: "0 0 20px 0 rgba(237, 13, 81, 0.3)"  // hover state
```

---

## File Locations

### Illustration Library (`src/components/illustrations/`)

| File | Contains |
|------|----------|
| `shared.tsx` | SVG primitives: `ShadowDefs`, `Card`, `Badge`, `OutlineBadge`, `AvatarDot`, `StarRating`, `StatusDot`, `CheckIcon`, `LockIcon`, `N8nNode`, `BezierConnector`, `ProgressBar`, `Divider`, `TextLine`, `MiniChart` |
| `backgrounds.tsx` | `DotGridBackground`, `GlowOrbs` |
| `logos.tsx` | 30 brand logo icons (see Logo Icons section for full list) |
| `index.tsx` | Barrel export of everything |

### Illustration Categories

| Folder | Illustrations |
|--------|--------------|
| `lead-gen/` | `VerifiedLeadCard`, `EmailInbox`, `EmailSequence`, `LeadDatabase`, `DomainHealth` |
| `sales/` | `BookedMeetings`, `SalesPipeline`, `ROIDashboard` |
| `ai/` | `AIChatInterface`, `WorkflowDiagram`, `BeforeAfter`, `AutomationPipeline`, `AICodeAssistant` |
| `code/` | `WorkflowCanvas`, `BrowserAppPreview`, `WebhookTrigger`, `CodeTerminal` |
| `social-proof/` | `TestimonialCard`, `ReviewGrid`, `TrustBadges`, `SocialProofBanner` |
| `community/` | `CommunityFeed`, `CourseModules`, `Leaderboard` |
| `analytics/` | `ConversionFunnel`, `ABTestResults`, `TrafficDashboard` |

**Total:** 27 illustrations + 15 logos + shared primitives + backgrounds

### Other Motion/Animation Files

| File | Contains |
|------|----------|
| `components/ui/motion.tsx` | 12+ Framer Motion wrapper components |
| `lib/animations.ts` | All spring presets, easing curves, variant definitions |
| `components/landing/decorative-backgrounds.tsx` | GlowOrbs, GridBackground, GeometricPattern |

### Demo Page

`/demo/illustrations` — showcases all illustration components, shared primitives, and logo icons.

---

## Component Pattern

Every illustration follows this pattern:

```tsx
interface IllustrationProps {
  className?: string;
}

export function IllustrationName({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Description of the illustration"
    >
      <ShadowDefs />

      {/* Background elements */}
      {/* Main card(s) using Card component */}
      {/* Floating badges using Badge component */}
      {/* Detail elements */}
    </svg>
  );
}
```

---

## Creating a New Illustration: Checklist

1. Determine type: **feature illustration** (400x300) or **tool illustration** (256x192)
2. Use **shared helpers from `shared.tsx`** — `ShadowDefs`, `Card`, `Badge`, `AvatarDot`, `N8nNode`, etc.
3. Start with the **foundation**: `Card` + `ShadowDefs` (feature) or background blob (tool)
4. Add the **main element** representing the feature
5. Add **content lines** using `TextLine` to fill space naturally
6. Add **status badges** or **CTA buttons** with brand colors
7. Add **avatar dots** using `AvatarDot` to suggest user activity (2-4 clustered)
8. Add **floating elements**: `CheckIcon`, sparkles, secondary cards
9. Add **accent dots** (2-3, different colors, low opacity) for polish
10. Wrap in a **React component** with `IllustrationProps` interface
11. Export from the appropriate category folder and register in `index.tsx`
12. Animate entrance with `FadeIn`, `ScaleIn`, or `StaggerContainer`

## Anti-Patterns (Do NOT)

- Use raster images or external assets
- Use gradients (the style is flat solid fills)
- Add actual readable text content (use `TextLine` placeholders)
- Use heavy strokes (max strokeWidth="3" for emphasis, "2" standard, "1" subtle)
- Create illustrations wider than they are tall (always landscape or square)
- Use colors outside the defined palette
- Add CSS animations to SVG elements (use Framer Motion on the wrapper instead)
- Create overly complex illustrations with >50 SVG elements
- Use linear gradients on backgrounds (use solid fills or low-opacity radial blobs)
- Hand-code shadow filters — use `ShadowDefs` component
- Hand-code cards — use `Card` component from shared.tsx
- Use `currentColor` — specify exact hex values from `colors` object
- Use CSS classes inside SVGs — use inline attributes
