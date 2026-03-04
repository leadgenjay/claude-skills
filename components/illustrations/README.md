# LGJ Illustrations Component Library

A complete React SVG illustration system for landing pages and marketing sites.

**GitHub Source:** https://github.com/leadgenjay/claude-skills/tree/main/components/illustrations

## What's Included

### Shared Primitives (`shared.tsx`)
Reusable SVG building blocks: `Card`, `Badge`, `OutlineBadge`, `AvatarDot`, `N8nNode`, `BezierConnector`, `StarRating`, `StatusDot`, `CheckIcon`, `ProgressBar`, `TextLine`, `MiniChart`, and more.

### Backgrounds (`backgrounds.tsx`)
`DotGridBackground` and `GlowOrbs` for section backgrounds.

### 30 Brand Logos (`logos.tsx` + `public/logos/*.webp`)
AI tools, automation platforms, CRM, payments, social — all as `<g>` elements sized 24x24 with transform-based scaling.

### 27 Illustrations (7 categories)

| Category | Components |
|----------|-----------|
| **AI** | AIChatInterface, AICodeAssistant, AutomationPipeline, BeforeAfter, WorkflowDiagram |
| **Analytics** | ABTestResults, ConversionFunnel, TrafficDashboard |
| **Code** | BrowserAppPreview, CodeTerminal, WebhookTrigger, WorkflowCanvas |
| **Community** | CommunityFeed, CourseModules, Leaderboard |
| **Lead Gen** | DomainHealth, EmailInbox, EmailSequence, LeadDatabase, VerifiedLeadCard |
| **Sales** | BookedMeetings, ROIDashboard, SalesPipeline |
| **Social Proof** | ReviewGrid, SocialProofBanner, TestimonialCard, TrustBadges |

## Installation

### Method 1: One-Line Install (Recommended)

```bash
curl -sL 'https://web.leadgenjay.com/api/skills/install.sh?items=illustrations' | bash
```

This installs:
- `./src/components/illustrations/` — all TSX components (shared primitives, backgrounds, logos, and 27 illustrations across 7 categories)
- `./public/logos/` — 23 brand logo images (webp)

### Method 2: Git Clone (Manual)

```bash
git clone https://github.com/leadgenjay/claude-skills.git /tmp/claude-skills
cp -r /tmp/claude-skills/components/illustrations/src/components/illustrations/ ./src/components/illustrations/
cp -r /tmp/claude-skills/components/illustrations/public/logos/ ./public/logos/
rm -rf /tmp/claude-skills
```

### Method 3: npx degit (No Git History)

```bash
npx degit leadgenjay/claude-skills/components/illustrations /tmp/lgj-illustrations
cp -r /tmp/lgj-illustrations/*.tsx /tmp/lgj-illustrations/ai /tmp/lgj-illustrations/analytics /tmp/lgj-illustrations/code /tmp/lgj-illustrations/community /tmp/lgj-illustrations/lead-gen /tmp/lgj-illustrations/sales /tmp/lgj-illustrations/social-proof ./src/components/illustrations/
cp -r /tmp/lgj-illustrations/public/logos ./public/logos/
```

## Dependencies

- React 18+ with TypeScript
- `cn()` utility (from `clsx` + `tailwind-merge`, or just `clsx`)
- Tailwind CSS (for `className` usage on components)

## Usage

```tsx
import {
  AIChatInterface,
  EmailInbox,
  SalesPipeline,
  ClaudeLogo,
  ShadowDefs,
  Card,
  Badge,
} from "@/components/illustrations";
```

## Style

Flat SVG with floating UI card elements. No gradients — solid fills only. Uses Inter font family. Brand colors: pink `#ED0D51`, blue `#0144F8`, slate neutrals.

## Companion Skill

Install the **LGJ-graphics** skill for full design token reference, composition rules, animation patterns, and illustration creation guidelines:

```bash
curl -sL 'https://web.leadgenjay.com/api/skills/install.sh?items=LGJ-graphics' | bash
```
