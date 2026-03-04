---
name: motion-graphics
version: "1.0"
description: Business-focused motion graphics skill for landing pages and marketing sites. Combines Lottie animations (via LottieFiles MCP), Framer Motion components, and Remotion video generation. Use when adding animations to landing pages, creating explainer videos, or implementing conversion-focused micro-interactions.
---

# Motion Graphics Skill for Lead Gen Jay

> **Optional MCP Servers:** To fully utilize this skill, enable these MCP servers:
> ```bash
> # LottieFiles - search for pre-built Lottie animations
> claude mcp add-json "lottiefiles" '{"command":"npx","args":["-y","mcp-server-lottiefiles"]}'
>
> # FAL Video - text-to-video and image-to-video generation
> claude mcp add-json "fal-video" '{"command":"npx","args":["-y","fal-image-video-mcp"]}'
> ```
> These are disabled by default to avoid slowing down Claude Code. Enable when needed, remove when done.

You are a motion graphics specialist focused on **business animations that drive conversions**. You combine three tools:

1. **LottieFiles MCP** — Pre-built professional animations (search and embed)
2. **Framer Motion components** — Code-based UI animations (`src/components/animations/`)
3. **Remotion** — Programmatic video generation (`remotion/`)

## When to Use Each Tool

| Use Case | Tool | Why |
|----------|------|-----|
| Loading spinners, success checkmarks | **Lottie** | Pre-built, lightweight, professional |
| Page transitions, scroll reveals | **Framer Motion** | Code control, React integration |
| Hero section text animations | **Framer Motion** | Custom timing, brand-specific |
| Explainer videos for landing pages | **Remotion** | Programmatic, customizable copy |
| Icon animations (arrows, clicks) | **Lottie** | Polished micro-interactions |
| Stat counters, number animations | **Framer Motion** | Dynamic data binding |
| Form feedback (success/error) | **Lottie** | Delightful, consistent |
| Hover effects on CTAs | **Framer Motion** | Interactive, responsive |
| Background ambient motion | **Lottie** | Subtle, performant loops |

---

## Part 1: LottieFiles Integration

### Searching for Animations

Use the LottieFiles MCP to search for business-appropriate animations:

**Good search terms for landing pages:**
- `loading spinner minimal`
- `success checkmark`
- `arrow down scroll`
- `email send`
- `rocket launch`
- `chart growth`
- `confetti celebration`
- `form submit`
- `notification bell`
- `download complete`

**Avoid entertainment searches:**
- ❌ `cartoon character`
- ❌ `funny dance`
- ❌ `game explosion`

### Implementing Lottie in React

```tsx
"use client";

import Lottie from "lottie-react";
import successAnimation from "@/animations/success.json";

export function SuccessAnimation() {
  return (
    <Lottie
      animationData={successAnimation}
      loop={false}
      style={{ width: 120, height: 120 }}
    />
  );
}
```

### Lottie Component Patterns

**1. One-time animation (form success):**
```tsx
import Lottie from "lottie-react";
import checkmark from "@/animations/checkmark.json";

export function FormSuccess() {
  return (
    <div className="flex flex-col items-center gap-4">
      <Lottie
        animationData={checkmark}
        loop={false}
        style={{ width: 80, height: 80 }}
      />
      <p className="text-green-600 font-medium">Submitted successfully!</p>
    </div>
  );
}
```

**2. Looping animation (loading state):**
```tsx
import Lottie from "lottie-react";
import loader from "@/animations/loader.json";

export function LoadingState() {
  return (
    <div className="flex items-center justify-center p-8">
      <Lottie
        animationData={loader}
        loop={true}
        style={{ width: 60, height: 60 }}
      />
    </div>
  );
}
```

**3. Hover-triggered animation:**
```tsx
"use client";

import Lottie, { LottieRefCurrentProps } from "lottie-react";
import arrowAnimation from "@/animations/arrow-right.json";
import { useRef } from "react";

export function AnimatedCTA({ children }: { children: React.ReactNode }) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  return (
    <button
      onMouseEnter={() => lottieRef.current?.play()}
      onMouseLeave={() => lottieRef.current?.stop()}
      className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg"
    >
      {children}
      <Lottie
        lottieRef={lottieRef}
        animationData={arrowAnimation}
        loop={false}
        autoplay={false}
        style={{ width: 24, height: 24 }}
      />
    </button>
  );
}
```

**4. Scroll-triggered Lottie:**
```tsx
"use client";

import Lottie from "lottie-react";
import { useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import rocketAnimation from "@/animations/rocket.json";

export function ScrollTriggeredLottie() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [shouldPlay, setShouldPlay] = useState(false);

  useEffect(() => {
    if (isInView) setShouldPlay(true);
  }, [isInView]);

  return (
    <div ref={ref}>
      <Lottie
        animationData={rocketAnimation}
        loop={false}
        autoplay={shouldPlay}
        style={{ width: 200, height: 200 }}
      />
    </div>
  );
}
```

### Where to Store Lottie Files

```
src/
├── animations/           # Lottie JSON files
│   ├── loading.json
│   ├── success.json
│   ├── error.json
│   ├── arrow-right.json
│   └── confetti.json
```

---

## Part 2: Framer Motion Components

### Available Components

Location: `src/components/animations/`

| Component | Import | Use Case |
|-----------|--------|----------|
| `FadeIn` | `@/components/animations` | Hero text, section reveals |
| `SlideUp` | `@/components/animations` | Card entrances, content blocks |
| `StaggerChildren` | `@/components/animations` | Feature lists, benefit bullets |
| `ScrollReveal` | `@/components/animations` | Sections appearing on scroll |
| `HoverScale` | `@/components/animations` | CTA buttons, interactive cards |
| `CountUp` | `@/components/animations` | Statistics, social proof numbers |
| `TextReveal` | `@/components/animations` | Headlines, word-by-word reveal |

### Landing Page Animation Patterns

**Hero Section:**
```tsx
import { FadeIn, TextReveal, HoverScale } from "@/components/animations";

export function HeroSection() {
  return (
    <section className="py-20">
      <FadeIn delay={0.2}>
        <span className="text-blue-600">Lead Gen Jay</span>
      </FadeIn>

      <TextReveal
        text="Stop Losing Leads to Your Competitors"
        as="h1"
        className="text-5xl font-bold"
      />

      <FadeIn delay={0.8}>
        <p className="text-xl text-gray-600">
          Capture, nurture, and convert leads on autopilot.
        </p>
      </FadeIn>

      <FadeIn delay={1.2}>
        <HoverScale scale={1.05} glow>
          <button className="bg-blue-600 text-white px-8 py-4 rounded-lg">
            Get Your Free Audit
          </button>
        </HoverScale>
      </FadeIn>
    </section>
  );
}
```

**Social Proof Stats:**
```tsx
import { ScrollReveal, CountUp } from "@/components/animations";

export function StatsSection() {
  return (
    <div className="grid grid-cols-3 gap-8">
      <ScrollReveal animation="scale">
        <div className="text-center">
          <CountUp to={156} suffix="%" className="text-4xl font-bold" />
          <p>Conversion Increase</p>
        </div>
      </ScrollReveal>

      <ScrollReveal animation="scale" delay={0.15}>
        <div className="text-center">
          <CountUp to={2.4} suffix="x" decimals={1} className="text-4xl font-bold" />
          <p>More Leads</p>
        </div>
      </ScrollReveal>

      <ScrollReveal animation="scale" delay={0.3}>
        <div className="text-center">
          <CountUp to={47} suffix="%" className="text-4xl font-bold" />
          <p>Lower Cost</p>
        </div>
      </ScrollReveal>
    </div>
  );
}
```

**Feature List:**
```tsx
import { StaggerChildren, ScrollReveal } from "@/components/animations";

export function FeaturesSection() {
  const features = [
    "Automated lead capture forms",
    "Smart follow-up sequences",
    "Real-time analytics dashboard",
    "CRM integration",
  ];

  return (
    <ScrollReveal>
      <StaggerChildren staggerDelay={0.1}>
        {features.map((feature, i) => (
          <div key={i} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <CheckIcon className="text-green-500" />
            <span>{feature}</span>
          </div>
        ))}
      </StaggerChildren>
    </ScrollReveal>
  );
}
```

---

## Part 3: Remotion Video Generation

### When to Use Remotion

- Explainer videos on landing pages
- Personalized video proposals
- Animated case study highlights
- Product feature showcases

**For detailed Remotion guidance, use the `/remotion-explainer` skill.**

### Quick Example

```tsx
import { VideoPlayer } from "@/components/video";

export function LandingPageVideo() {
  return (
    <VideoPlayer
      compositionProps={{
        problem: "Most businesses waste 80% of their marketing budget on leads that never convert.",
        solution: "Lead Gen Jay's proven system captures, nurtures, and converts leads on autopilot.",
        cta: "Get Your Free Lead Audit",
      }}
      showControls
      loop
    />
  );
}
```

### NPM Scripts

| Command | Purpose |
|---------|---------|
| `npm run remotion:preview` | Preview in browser |
| `npm run remotion:studio` | Visual editing |
| `npm run remotion:render` | Render to MP4 |

---

## Part 4: Combining Tools

### Example: Form with Lottie + Framer Motion

```tsx
"use client";

import { useState } from "react";
import { FadeIn, HoverScale } from "@/components/animations";
import Lottie from "lottie-react";
import successAnimation from "@/animations/success.json";
import loadingAnimation from "@/animations/loading.json";

export function LeadCaptureForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    await submitForm();
    setStatus("success");
  };

  if (status === "success") {
    return (
      <FadeIn>
        <div className="text-center">
          <Lottie
            animationData={successAnimation}
            loop={false}
            style={{ width: 120, height: 120, margin: "0 auto" }}
          />
          <p className="text-green-600 font-medium mt-4">
            Thanks! Check your email for your free audit.
          </p>
        </div>
      </FadeIn>
    );
  }

  return (
    <FadeIn>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Enter your email"
          className="w-full px-4 py-3 border rounded-lg"
          disabled={status === "loading"}
        />

        <HoverScale scale={1.02}>
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full bg-blue-600 text-white py-3 rounded-lg flex items-center justify-center gap-2"
          >
            {status === "loading" ? (
              <Lottie
                animationData={loadingAnimation}
                loop
                style={{ width: 24, height: 24 }}
              />
            ) : (
              "Get My Free Audit"
            )}
          </button>
        </HoverScale>
      </form>
    </FadeIn>
  );
}
```

---

## Business Animation Best Practices

### DO ✓

- **Loading states**: Always show progress with Lottie spinners
- **Success feedback**: Celebrate form submissions with checkmark animations
- **Scroll reveals**: Animate sections as users scroll (keeps engagement)
- **Stat counters**: Animate numbers to draw attention to social proof
- **CTA hover effects**: Subtle scale/glow on buttons increases clicks
- **Staggered lists**: Reveal benefits one-by-one (guides reading)

### DON'T ✗

- **Autoplay videos with sound**: Always muted or click-to-play
- **Infinite complex loops**: Distracting, hurts performance
- **Blocking animations**: Never delay user actions
- **Cartoonish animations**: Keep it professional for B2B
- **Too many animations**: 2-3 animated sections per page max
- **Slow durations**: Keep under 500ms for UI, 300ms for interactions

### Performance Guidelines

1. **Lottie files**: Keep under 100KB, use simple shapes
2. **Framer Motion**: Animate `transform` and `opacity` only (GPU-accelerated)
3. **Remotion videos**: Pre-render to MP4 for production, use Player for previews
4. **Lazy load**: Don't load Lottie animations above the fold

---

## Quick Reference

### Search LottieFiles (via MCP)

Use the `lottiefiles` MCP server to search:
- `mcp__lottiefiles__search` - Search for animations by keyword

### Import Framer Motion Components

```tsx
import {
  FadeIn,
  SlideUp,
  StaggerChildren,
  ScrollReveal,
  HoverScale,
  CountUp,
  TextReveal
} from "@/components/animations";
```

### Import Lottie

```tsx
import Lottie from "lottie-react";
import animationData from "@/animations/[name].json";
```

### Import Video Player

```tsx
import { VideoPlayer } from "@/components/video";
```

---

## Workflow

1. **Identify animation need** → Loading? Success? Reveal? Video?
2. **Choose tool** → Lottie (pre-built) vs Framer Motion (custom) vs Remotion (video)
3. **Search LottieFiles** → If Lottie, use MCP to find appropriate animation
4. **Implement** → Use patterns from this skill
5. **Test performance** → Check Core Web Vitals, ensure smooth 60fps
6. **Audit** → Use `/design-motion-principles` skill to review quality
