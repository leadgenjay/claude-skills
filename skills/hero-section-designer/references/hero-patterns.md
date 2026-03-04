# Hero Section Patterns

Detailed layouts with code structure and fal.ai prompts for each pattern.

---

## Pattern 1: Split Hero (50/50)

### Visual Structure

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  ┌──────────────────────────┐ ┌──────────────────────────┐ │
│  │                          │ │                          │ │
│  │  [Eyebrow Tag]           │ │                          │ │
│  │                          │ │                          │ │
│  │  Main Headline Here      │ │      HERO IMAGE          │ │
│  │  That Grabs Attention    │ │      Product/Dashboard   │ │
│  │                          │ │                          │ │
│  │  Supporting subheadline  │ │                          │ │
│  │  explains the benefit    │ │                          │ │
│  │                          │ │                          │ │
│  │  [PRIMARY CTA]           │ │                          │ │
│  │  Supporting microcopy    │ │                          │ │
│  │                          │ │                          │ │
│  │  ⭐ Trust element        │ │                          │ │
│  │                          │ │                          │ │
│  └──────────────────────────┘ └──────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Component Structure

```tsx
<section className="py-20 lg:py-28">
  <div className="container mx-auto px-4">
    <div className="grid lg:grid-cols-2 gap-12 items-center">

      {/* Left: Content */}
      <div className="space-y-6">
        <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
          Eyebrow Tag
        </span>

        <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight">
          Main Headline Here That Grabs Attention
        </h1>

        <p className="text-xl text-muted-foreground max-w-lg">
          Supporting subheadline that explains the benefit and creates desire
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button size="lg" className="text-lg px-8">
            Get Started Free
          </Button>
          <Button variant="outline" size="lg">
            Watch Demo
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          No credit card required · Free 14-day trial
        </p>

        <div className="flex items-center gap-2">
          <Stars rating={5} />
          <span className="text-sm">Trusted by 5,000+ agencies</span>
        </div>
      </div>

      {/* Right: Image */}
      <div className="relative">
        <Image
          src="/hero-image.png"
          alt="Product dashboard"
          className="rounded-lg shadow-2xl"
        />
      </div>

    </div>
  </div>
</section>
```

### Image Prompt (fal.ai)

```
Modern laptop displaying professional analytics dashboard with growth metrics and charts, clean minimal desk setup with small succulent plant, soft natural lighting from window on left side, blue (#2563eb) accent colors in UI, product photography style, shallow depth of field background, high quality, sharp focus on screen
```

**Dimensions:** 1024×768

---

## Pattern 2: Centered Hero with Background

### Visual Structure

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│           [Full-Width Background Image/Gradient]           │
│                                                            │
│                    [Eyebrow Tag]                           │
│                                                            │
│              Main Headline Centered                        │
│              Across the Full Width                         │
│                                                            │
│              Supporting subheadline that                   │
│              explains the key benefit                      │
│                                                            │
│                   [PRIMARY CTA]                            │
│              Supporting microcopy here                     │
│                                                            │
│                  ⭐⭐⭐⭐⭐ 4.9/5                           │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Component Structure

```tsx
<section className="relative min-h-[80vh] flex items-center justify-center">
  {/* Background */}
  <div className="absolute inset-0 z-0">
    <Image
      src="/hero-bg.jpg"
      alt=""
      fill
      className="object-cover"
    />
    <div className="absolute inset-0 bg-gradient-to-b from-background/80 to-background/95" />
  </div>

  {/* Content */}
  <div className="relative z-10 container mx-auto px-4 text-center">
    <div className="max-w-3xl mx-auto space-y-6">

      <span className="inline-block px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
        New: AI-Powered Features
      </span>

      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
        Main Headline Centered Across the Full Width
      </h1>

      <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
        Supporting subheadline that explains the key benefit and drives action
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button size="lg" className="text-lg px-8">
          Start Free Trial
        </Button>
        <Button variant="outline" size="lg">
          Book a Demo
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        No credit card required
      </p>

      <div className="flex items-center justify-center gap-4 pt-4">
        <div className="flex -space-x-2">
          {avatars.map((avatar, i) => (
            <Avatar key={i} className="border-2 border-background" />
          ))}
        </div>
        <span className="text-sm">Join 10,000+ happy customers</span>
      </div>

    </div>
  </div>
</section>
```

### Background Prompt (fal.ai)

```
Abstract gradient background, flowing from deep navy blue (#0f172a) at edges through royal blue (#2563eb) to soft light blue (#93c5fd) in center, subtle glowing particles and light streaks, modern digital aesthetic, smooth transitions, cinematic quality, high resolution
```

**Dimensions:** 1920×1080

---

## Pattern 3: Hero with Video Background

### Visual Structure

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│           [Muted Autoplay Video Background]                │
│                                                            │
│         ┌─────────────────────────────────┐                │
│         │                                 │                │
│         │  Dark overlay for readability   │                │
│         │                                 │                │
│         │     Main Headline Text          │                │
│         │     Subheadline below           │                │
│         │                                 │                │
│         │       [PRIMARY CTA]             │                │
│         │                                 │                │
│         │   ▶ Watch Full Video (2:30)     │                │
│         │                                 │                │
│         └─────────────────────────────────┘                │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Component Structure

```tsx
<section className="relative min-h-screen flex items-center">
  {/* Video Background */}
  <video
    autoPlay
    muted
    loop
    playsInline
    className="absolute inset-0 w-full h-full object-cover"
  >
    <source src="/hero-video.mp4" type="video/mp4" />
  </video>

  {/* Overlay */}
  <div className="absolute inset-0 bg-black/60" />

  {/* Content */}
  <div className="relative z-10 container mx-auto px-4">
    <div className="max-w-2xl text-white space-y-6">

      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold">
        Powerful Headline That Commands Attention
      </h1>

      <p className="text-xl text-white/80">
        Supporting text that builds on the headline and creates urgency
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <Button size="lg" className="text-lg">
          Get Started Now
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="text-white border-white/30"
        >
          <PlayCircle className="mr-2 h-5 w-5" />
          Watch Video (2:30)
        </Button>
      </div>

    </div>
  </div>
</section>
```

### Fallback Image Prompt (fal.ai)

For mobile or when video doesn't load:

```
Professional team working in modern bright office space, collaborative atmosphere, soft natural lighting, slight motion blur suggesting activity, blue accent elements (#2563eb) in decor, commercial photography style, cinematic color grading, high quality
```

**Dimensions:** 1920×1080

---

## Pattern 4: Product Showcase Hero

### Visual Structure

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  [Eyebrow]                                                 │
│                                                            │
│  Large Product-Focused Headline                            │
│  That Emphasizes the Tool                                  │
│                                                            │
│  Short supporting copy here                                │
│                                                            │
│  [PRIMARY CTA]  [SECONDARY]                                │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  │              Large Product Screenshot                │  │
│  │              with Browser Frame                      │  │
│  │              Showing Key Feature                     │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Component Structure

```tsx
<section className="pt-20 pb-12">
  <div className="container mx-auto px-4">

    {/* Text Content - Centered */}
    <div className="text-center max-w-3xl mx-auto mb-12 space-y-6">

      <span className="text-sm font-semibold text-blue-600 uppercase">
        Lead Generation Platform
      </span>

      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
        The Smarter Way to Generate Qualified Leads
      </h1>

      <p className="text-xl text-muted-foreground">
        Stop chasing cold leads. Start closing warm prospects who are ready to buy.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button size="lg" className="text-lg px-8">
          Try It Free
        </Button>
        <Button variant="outline" size="lg">
          See How It Works
        </Button>
      </div>

    </div>

    {/* Product Screenshot */}
    <div className="relative max-w-5xl mx-auto">
      <div className="rounded-xl overflow-hidden shadow-2xl border">
        {/* Browser Chrome */}
        <div className="bg-slate-100 px-4 py-3 flex items-center gap-2 border-b">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 text-center text-sm text-muted-foreground">
            app.leadgenjay.com
          </div>
        </div>

        {/* Screenshot */}
        <Image
          src="/product-screenshot.png"
          alt="Lead Gen Jay Dashboard"
          className="w-full"
        />
      </div>

      {/* Floating elements */}
      <div className="absolute -bottom-6 -right-6 bg-white rounded-lg shadow-lg p-4 hidden lg:block">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-semibold">47 new leads</p>
            <p className="text-sm text-muted-foreground">This week</p>
          </div>
        </div>
      </div>
    </div>

  </div>
</section>
```

### Dashboard Screenshot Prompt (fal.ai)

```
Modern SaaS dashboard interface screenshot, analytics showing growth charts and lead metrics, clean UI design with cards and data visualizations, blue (#2563eb) accent color, white background, professional business software aesthetic, crisp and clean, high quality, UI/UX design mockup style
```

**Dimensions:** 1280×800

---

## Pattern 5: Minimal Hero

### Visual Structure

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│                                                            │
│                                                            │
│                    Very Large Headline                     │
│                    One Powerful Line                       │
│                                                            │
│                    [SINGLE CTA]                            │
│                                                            │
│                                                            │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Component Structure

```tsx
<section className="min-h-[70vh] flex items-center justify-center">
  <div className="container mx-auto px-4 text-center">
    <div className="max-w-4xl mx-auto space-y-8">

      <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight">
        Generate Leads That Actually Convert
      </h1>

      <Button size="lg" className="text-xl px-12 py-6">
        Start Free Today
      </Button>

    </div>
  </div>
</section>
```

**Best for:** Strong brand recognition, simple offers, design-focused brands

---

## Mobile Adaptation Guidelines

### Stack Order (Mobile)

1. Headline (reduced size)
2. Subheadline (condensed)
3. CTA button (full width)
4. Trust element (single)
5. Image (below or hidden)

### Mobile-Specific Code

```tsx
// Responsive text sizes
<h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl">

// Stack on mobile, row on desktop
<div className="flex flex-col sm:flex-row gap-4">

// Full width buttons on mobile
<Button className="w-full sm:w-auto">

// Hide secondary elements on mobile
<div className="hidden sm:block">
```

### Mobile Image Treatment

Option 1: Hide on mobile
```tsx
<div className="hidden lg:block">
  <Image ... />
</div>
```

Option 2: Background treatment
```tsx
<div className="absolute inset-0 lg:relative">
  <Image ... className="opacity-20 lg:opacity-100" />
</div>
```

Option 3: Below content
```tsx
<div className="order-2 lg:order-1"> {/* Content */} </div>
<div className="order-1 lg:order-2"> {/* Image */} </div>
```

---

## Trust Element Patterns

### Customer Count
```tsx
<div className="flex items-center gap-2">
  <Users className="h-5 w-5 text-muted-foreground" />
  <span>Trusted by 5,000+ agencies</span>
</div>
```

### Rating
```tsx
<div className="flex items-center gap-2">
  <div className="flex">
    {[...Array(5)].map((_, i) => (
      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
    ))}
  </div>
  <span className="text-sm">4.9/5 from 500+ reviews</span>
</div>
```

### Avatar Stack
```tsx
<div className="flex items-center gap-3">
  <div className="flex -space-x-2">
    {avatars.slice(0, 4).map((src, i) => (
      <Avatar key={i} className="border-2 border-background w-8 h-8" />
    ))}
  </div>
  <span className="text-sm text-muted-foreground">
    Join 10,000+ happy customers
  </span>
</div>
```

### Logo Bar
```tsx
<div className="pt-8 border-t">
  <p className="text-sm text-muted-foreground text-center mb-4">
    Trusted by industry leaders
  </p>
  <div className="flex flex-wrap justify-center gap-8 opacity-60">
    <Logo1 className="h-6" />
    <Logo2 className="h-6" />
    <Logo3 className="h-6" />
  </div>
</div>
```
