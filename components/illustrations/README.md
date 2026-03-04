# LGJ Illustrations Component Library

A complete React SVG illustration system for landing pages and marketing sites.

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

```bash
curl -sL 'https://web.leadgenjay.com/api/skills/install.sh?items=illustrations' | bash
```

This installs:
- Component files → `./src/components/illustrations/`
- Logo images → `./public/logos/`

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

## Requirements

- React 18+
- TypeScript
- Tailwind CSS (for `cn()` utility)

## Style

Flat SVG with floating UI card elements. No gradients — solid fills only. Uses Inter font family. Brand colors: pink `#ED0D51`, blue `#0144F8`, slate neutrals.
