---
name: remotion-explainer
version: "1.0"
description: Create explainer videos for landing pages using Remotion. Generates Problem-Agitate-Solution videos, testimonial animations, feature showcases, and case study highlights. Uses the Remotion MCP for documentation and existing project components.
---

# Remotion Explainer Video Skill

> **Optional MCP Server:** To get Remotion documentation search, enable the MCP:
> ```bash
> claude mcp add-json "remotion" '{"command":"npx","args":["-y","@remotion/mcp"]}'
> ```
> Disabled by default to avoid slowing down Claude Code. Enable when working on videos, remove when done.

You are an explainer video specialist using Remotion to create programmatic videos for Lead Gen Jay landing pages.

## What This Skill Does

Creates business explainer videos that follow Dan Kennedy's copy principles:
- **Problem → Agitate → Solution** narrative structure
- Professional motion graphics (not cartoons)
- Customizable copy via React props
- Embeddable on landing pages via `@remotion/player`

---

## Project Structure

The Remotion setup is already configured in this project:

```
remotion/
├── Root.tsx                    # Composition registry
├── index.ts                    # Entry point
├── remotion.config.ts          # Render settings
└── compositions/
    └── explainer/
        ├── index.tsx           # Main video component
        ├── components/
        │   ├── animated-text.tsx
        │   ├── logo-reveal.tsx
        │   └── gradient-background.tsx
        └── scenes/
            ├── intro.tsx       # Problem scene
            ├── solution.tsx    # Solution scene
            └── cta.tsx         # Call-to-action scene
```

---

## Available NPM Scripts

| Command | Purpose |
|---------|---------|
| `npm run remotion:preview` | Preview videos in browser at http://localhost:3000 |
| `npm run remotion:studio` | Open Remotion Studio for visual editing |
| `npm run remotion:render` | Render ExplainerVideo to `out/explainer.mp4` |

---

## Creating New Video Compositions

### Step 1: Define the Composition

In `remotion/Root.tsx`, register new compositions:

```tsx
import { Composition } from "remotion";
import { ExplainerVideo } from "./compositions/explainer";
import { TestimonialVideo } from "./compositions/testimonial";

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="ExplainerVideo"
        component={ExplainerVideo}
        durationInFrames={300}  // 10 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />

      <Composition
        id="TestimonialVideo"
        component={TestimonialVideo}
        durationInFrames={150}  // 5 seconds
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
}
```

### Step 2: Create the Video Component

```tsx
// remotion/compositions/testimonial/index.tsx
import { AbsoluteFill, Sequence, Img, staticFile } from "remotion";
import { AnimatedText } from "../explainer/components";

interface TestimonialVideoProps {
  quote?: string;
  name?: string;
  company?: string;
  avatarUrl?: string;
}

export function TestimonialVideo({
  quote = "Lead Gen Jay transformed our lead generation. We saw a 156% increase in qualified leads within 60 days.",
  name = "Sarah Johnson",
  company = "TechStart Inc.",
  avatarUrl,
}: TestimonialVideoProps) {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      {/* Stars animation */}
      <Sequence from={0} durationInFrames={30}>
        <StarRating />
      </Sequence>

      {/* Quote */}
      <Sequence from={30} durationInFrames={90}>
        <AnimatedText text={quote} fontSize={42} delay={5} />
      </Sequence>

      {/* Attribution */}
      <Sequence from={100} durationInFrames={50}>
        <Attribution name={name} company={company} avatarUrl={avatarUrl} />
      </Sequence>
    </AbsoluteFill>
  );
}
```

---

## Core Remotion Concepts

### Frames and Time

```tsx
// 30 fps = 30 frames per second
// 300 frames = 10 seconds
// Frame 0 = start, Frame 299 = end

const frame = useCurrentFrame();  // Current frame number
const { fps, durationInFrames } = useVideoConfig();
```

### Sequences (Scene Timing)

```tsx
// Scene appears at frame 0, lasts 90 frames (3 seconds)
<Sequence from={0} durationInFrames={90}>
  <IntroScene />
</Sequence>

// Scene appears at frame 90, lasts 120 frames (4 seconds)
<Sequence from={90} durationInFrames={120}>
  <MainScene />
</Sequence>
```

### Animation with Interpolate

```tsx
import { interpolate, useCurrentFrame } from "remotion";

function FadeIn({ children }) {
  const frame = useCurrentFrame();

  const opacity = interpolate(
    frame,
    [0, 30],      // Input range: frames 0-30
    [0, 1],       // Output range: opacity 0-1
    { extrapolateRight: "clamp" }
  );

  return <div style={{ opacity }}>{children}</div>;
}
```

### Spring Animations

```tsx
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

function BounceIn({ children }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: {
      damping: 10,
      stiffness: 100,
      mass: 0.5,
    },
  });

  return <div style={{ transform: `scale(${scale})` }}>{children}</div>;
}
```

### Using Assets

```tsx
import { Img, Video, Audio, staticFile } from "remotion";

// Local files from /public folder
<Img src={staticFile("lgj-logo.webp")} />
<Video src={staticFile("intro.mp4")} />
<Audio src={staticFile("background-music.mp3")} />

// Remote URLs
<Img src="https://example.com/image.png" />
```

---

## Video Templates for Lead Gen Jay

### 1. Problem-Agitate-Solution (30 sec)

```
Scene 1 (0-90 frames / 3 sec): PROBLEM
- Red/warning color scheme
- Pain point headline with animated text
- Warning icon animation

Scene 2 (90-210 frames / 4 sec): SOLUTION
- Green/success color scheme
- Logo reveal
- Solution text + 3 benefit bullets

Scene 3 (210-300 frames / 3 sec): CTA
- Blue/action color scheme
- "Ready to transform?" headline
- Animated CTA button
- Subtext: "Free consultation"
```

### 2. Testimonial Highlight (15 sec)

```
Scene 1 (0-30 frames / 1 sec): STARS
- 5-star rating animation
- Gold/yellow color scheme

Scene 2 (30-120 frames / 3 sec): QUOTE
- Customer quote with word-by-word reveal
- Subtle background animation

Scene 3 (120-150 frames / 1 sec): ATTRIBUTION
- Customer name + company
- Optional avatar/logo
```

### 3. Feature Showcase (20 sec)

```
Scene 1 (0-60 frames / 2 sec): HEADLINE
- Feature name with icon
- Brief tagline

Scene 2 (60-180 frames / 4 sec): DEMO
- Animated mockup/screenshot
- Highlight key UI elements
- Benefit callouts

Scene 3 (180-240 frames / 2 sec): CTA
- "Try it free" button
- No commitment messaging
```

### 4. Case Study Highlight (30 sec)

```
Scene 1 (0-60 frames / 2 sec): CLIENT
- Client logo
- Industry/context

Scene 2 (60-180 frames / 4 sec): RESULTS
- Before/after metrics with CountUp
- Key achievement highlight
- Animated chart/graph

Scene 3 (180-240 frames / 2 sec): QUOTE
- Short client testimonial

Scene 4 (240-300 frames / 2 sec): CTA
- "Get similar results"
- Contact prompt
```

---

## Embedding on Landing Pages

### Using @remotion/player (Interactive)

```tsx
"use client";

import { Player } from "@remotion/player";
import { ExplainerVideo } from "@/remotion/compositions/explainer";

export function HeroVideo() {
  return (
    <Player
      component={ExplainerVideo}
      inputProps={{
        problem: "Custom problem text here",
        solution: "Custom solution text here",
        cta: "Get Started Free",
      }}
      durationInFrames={300}
      fps={30}
      compositionWidth={1920}
      compositionHeight={1080}
      style={{ width: "100%" }}
      controls
      loop
    />
  );
}
```

### Using Pre-rendered MP4 (Production)

```bash
# Render to MP4
npm run remotion:render

# Or with custom props
npx remotion render remotion/index.ts ExplainerVideo out/custom.mp4 \
  --props='{"problem":"Your custom problem"}'
```

```tsx
// Embed the rendered video
export function HeroVideo() {
  return (
    <video
      src="/videos/explainer.mp4"
      autoPlay
      muted
      loop
      playsInline
      className="w-full rounded-xl"
    />
  );
}
```

---

## Reusable Components

### AnimatedText (Word-by-word reveal)

Location: `remotion/compositions/explainer/components/animated-text.tsx`

```tsx
<AnimatedText
  text="Your headline text here"
  fontSize={64}
  color="#ffffff"
  fontWeight={700}
  delay={10}  // Start at frame 10
/>
```

### LogoReveal (Bouncy logo entrance)

Location: `remotion/compositions/explainer/components/logo-reveal.tsx`

```tsx
<LogoReveal delay={0} size={200} />
```

### GradientBackground (Animated gradient)

Location: `remotion/compositions/explainer/components/gradient-background.tsx`

```tsx
<GradientBackground
  colorFrom="#0f172a"
  colorTo="#1e293b"
  animate={true}
/>
```

---

## MCP Integration

The **Remotion MCP** (`@remotion/mcp`) provides documentation search when you need help with:
- Remotion APIs and functions
- Animation techniques
- Rendering options
- Deployment to Lambda

The MCP indexes Remotion's documentation for context-aware assistance.

---

## Workflow

### Creating a New Explainer Video

1. **Define the narrative** (Problem → Solution → CTA)
2. **Write the copy** following Dan Kennedy principles
3. **Create composition** in `remotion/Root.tsx`
4. **Build scenes** in `remotion/compositions/[name]/scenes/`
5. **Preview** with `npm run remotion:preview`
6. **Adjust timing** (frames, transitions, easing)
7. **Render** with `npm run remotion:render`
8. **Embed** using `@remotion/player` or `<video>` tag

### Customizing Existing Video

1. **Edit props** in the Player component
2. **Modify scenes** in `remotion/compositions/explainer/scenes/`
3. **Adjust colors** in GradientBackground
4. **Change timing** by modifying Sequence `from` and `durationInFrames`

---

## Best Practices

### DO ✓

- Keep videos under 30 seconds for landing pages
- Use the brand colors (slate-900, blue-600)
- Include clear CTA at the end
- Make text readable (minimum 32px font)
- Use spring animations for organic feel
- Test on mobile (16:9 scales well)

### DON'T ✗

- Add background music (autoplay issues)
- Use complex 3D animations (performance)
- Make videos longer than 60 seconds
- Use tiny text that's unreadable
- Forget to add `loop` for ambient videos
- Skip the CTA scene

---

## Quick Reference

```tsx
// Essential imports
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
  staticFile
} from "remotion";

// Timing math
const frames = seconds * fps;  // 3 seconds = 90 frames at 30fps
const seconds = frames / fps;  // 90 frames = 3 seconds at 30fps

// Render command
npx remotion render remotion/index.ts CompositionId output.mp4
```
