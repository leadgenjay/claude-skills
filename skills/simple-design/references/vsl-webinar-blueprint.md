# VSL / Webinar Blueprint — 4-5 Sections

Modeled on ListKit's VSL page. The video does the selling — everything else supports pressing play. Single centered column, video-dominant layout.

---

## Wireframe

```
┌──────────────────────────────────────────────────────┐
│  [LGJ Logo]                                          │
├──────────────────────────────────────────────────────┤
│                                                      │
│  [Badge: WATCH THIS FREE TRAINING]                   │
│                                                      │
│  How B2B Founders Book 15+ Meetings                  │
│  Per Week Using Cold Email AI                        │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │                                              │    │
│  │                                              │    │
│  │              VIDEO EMBED                     │    │
│  │              16:9 ratio                      │    │
│  │                                              │    │
│  │                                              │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  Watch the video above, then click below ↓           │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │           Get Started — It's Free →          │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  No credit card required. Cancel anytime.            │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ Icon     │  │ Icon     │  │ Icon     │           │
│  │ Title    │  │ Title    │  │ Title    │           │
│  │ 1-liner  │  │ 1-liner  │  │ 1-liner  │           │
│  └──────────┘  └──────────┘  └──────────┘           │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│  "This training is for B2B founders and agencies     │
│   doing $500K+ who want to add cold email.           │
│   Not for freelancers or B2C businesses."            │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Ready to get started?                               │
│  [Get Started — It's Free →]                         │
│  No credit card required.                            │
│                                                      │
│  Questions? Email jay@leadgenjay.com                 │
│                                                      │
│  © Lead Gen Jay · Privacy Policy                     │
└──────────────────────────────────────────────────────┘
```

---

## Section Breakdown

### Section 1: Hero + Video (Required)

The video is the centerpiece. Everything else frames it.

**Layout:**
- `max-w-[900px] mx-auto px-6 py-16 md:py-24 text-center`
- Single centered column

**Components (top to bottom):**

1. **Logo** — `lgj-logo.webp`, `h-8 mx-auto mb-8`

2. **Badge** (optional) — small colored pill
   - `inline-block bg-[#ED0D51]/10 text-[#ED0D51] text-sm font-semibold px-3 py-1 rounded-full mb-4`
   - "WATCH THIS FREE TRAINING" / "FREE VIDEO MASTERCLASS"

3. **Headline** — Specific outcome promise
   - `font-heading text-3xl md:text-5xl font-bold text-slate-900 leading-tight`
   - Formula: "How [Audience] [Achieve Specific Result] Using [Method/Tool]"
   - Keep to one or two lines max

4. **Subheadline** (optional) — One line of context
   - `text-lg text-slate-600 mt-4`
   - Only if the headline needs clarification

5. **Video embed** — The star of the page
   - `max-w-[800px] w-full mx-auto mt-8`
   - `aspect-video rounded-xl overflow-hidden`
   - `shadow-[0_8px_40px_rgba(0,0,0,0.10)]`
   - YouTube/Vimeo/Wistia iframe — responsive 16:9
   - **No autoplay** — let the user choose to press play
   - Add `loading="lazy"` to the iframe

6. **Directive text** — Tell them what to do next
   - `text-base text-slate-600 mt-6`
   - "Watch the video above, then click below to get started"
   - Arrow or pointer emoji acceptable here (only place emojis are allowed)

7. **CTA button** — Large, prominent
   - `inline-block bg-[#ED0D51] hover:bg-[#d40b48] text-white font-semibold text-lg px-8 py-4 rounded-lg mt-4`
   - Text: "Get Started — It's Free" / "Start Your Free Trial" / "Claim Your Spot"

8. **Friction text** — `text-sm text-slate-400 mt-3`
   - "No credit card required." / "Free. Instant access."

**Animation:**
- Wrap badge + headline + video in `<FadeIn>` — the only animation on the page

### Section 2: Three Key Benefits (Optional)

For non-watchers who scroll past the video. Summarize value in 3 cards.

**Layout:**
- `max-w-[900px] mx-auto px-6 py-16`
- `grid md:grid-cols-3 gap-8`
- Light separator: `border-t border-slate-100 pt-16`

**Per card:**
- `text-center` or `text-left` — either works
- Lucide icon: `w-10 h-10 mx-auto` in `text-[#ED0D51]` or `text-[#0144F8]` (alternate)
- Title: `font-heading text-lg font-bold text-slate-900 mt-4`
- Description: `text-sm text-slate-600 mt-2 leading-relaxed`
- One sentence per card — no paragraphs

**What these cards should cover:**
- Card 1: The main problem this solves
- Card 2: The unique method/approach
- Card 3: The specific result/outcome

**When to skip:** If the video thoroughly covers all benefits, these cards are redundant. Only include for skimmers.

### Section 3: Qualification (Optional)

Same pattern as Opt-in template. Disqualify the wrong audience.

**Layout:**
- `max-w-[700px] mx-auto px-6 py-12 text-center`
- `bg-slate-50 rounded-xl p-8` or just whitespace

**Content:**
- `text-lg text-slate-700 leading-relaxed`
- Two-part structure:
  1. "This is for [audience] who [situation]"
  2. "This is NOT for [wrong audience]"
- Bold the qualifiers

**When to skip:** If the video already qualifies the audience, omit this.

### Section 4: Repeated CTA + Footer (Required)

Close with the same CTA and minimal contact info.

**Layout:**
- `max-w-[640px] mx-auto px-6 py-16 text-center`

**Content:**
1. **Restatement** (optional) — one line
   - `font-heading text-2xl font-bold text-slate-900 mb-4`
   - "Ready to [achieve outcome]?"

2. **CTA button** — identical to hero CTA
   - Same color, same text, same size

3. **Friction text** — same as hero

4. **Contact alternative** — `text-sm text-slate-500 mt-8`
   - "Questions? Email jay@leadgenjay.com"
   - Or link to `/consult` for a call

5. **Footer** — `text-sm text-slate-400 mt-12`
   - `© [Year] Lead Gen Jay · Privacy Policy`

---

## Video Embed Patterns

### YouTube Embed

```tsx
<div className="aspect-video max-w-[800px] w-full mx-auto rounded-xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.10)]">
  <iframe
    src="https://www.youtube.com/embed/VIDEO_ID?rel=0"
    title="Training video"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowFullScreen
    loading="lazy"
    className="w-full h-full"
  />
</div>
```

### Vimeo Embed

```tsx
<div className="aspect-video max-w-[800px] w-full mx-auto rounded-xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.10)]">
  <iframe
    src="https://player.vimeo.com/video/VIDEO_ID?badge=0&autopause=0"
    title="Training video"
    allow="autoplay; fullscreen; picture-in-picture"
    allowFullScreen
    loading="lazy"
    className="w-full h-full"
  />
</div>
```

### Wistia Embed

```tsx
<div className="aspect-video max-w-[800px] w-full mx-auto rounded-xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.10)]">
  <iframe
    src="https://fast.wistia.net/embed/iframe/VIDEO_ID"
    title="Training video"
    allow="autoplay; fullscreen"
    allowFullScreen
    loading="lazy"
    className="w-full h-full"
  />
</div>
```

### Two-Step Variant (Registration Gate Before Video)

Some VSL pages gate the video behind an email opt-in. If Jay requests this:

1. Hero shows headline + form (no video)
2. After submit, redirect to `/[page]/watch` with the video embed
3. The watch page uses the standard VSL layout above

This keeps the VSL page itself simple while adding a lead capture step.

---

## Copy Formulas

### Headline Patterns

```
"How [Audience] [Achieve Specific Result] Using [Method]"
"Watch: The [Adjective] [System/Method] Behind [Impressive Stat]"
"[Number] Minutes That Could [Specific Outcome] for Your [Business Type]"
"The [System] [Audience] Are Using to [Result] in [Timeframe]"
```

### Directive Text Options

```
"Watch the video above, then click below to get started ↓"
"Press play, then claim your free access below"
"Watch the 12-minute training, then start for free below"
```

### Benefit Card Title Patterns

```
Card 1: "The Problem" — Name the specific pain point
Card 2: "The Method" — Name the unique approach
Card 3: "The Result" — Name the specific outcome with numbers
```

---

## Component Structure

```
src/app/[page-name]/
├── page.tsx              # Metadata
└── content.tsx           # Client component

src/components/[page-name]/
├── hero.tsx              # Badge + headline + video + CTA
├── benefits.tsx          # Optional: 3 benefit cards
└── cta-footer.tsx        # Repeated CTA + contact + footer
```

---

## What to Leave Out (Checklist)

- [ ] Navigation bar or header menu
- [ ] Instructor bio or "about" section
- [ ] Testimonial section (the video should contain social proof)
- [ ] FAQ accordion
- [ ] Multiple videos
- [ ] Autoplay on the video
- [ ] Comparison or feature table
- [ ] Pricing information (it's free)
- [ ] Value stack
- [ ] Countdown timer
- [ ] Dark background sections
- [ ] ScrollReveal animations
- [ ] Thumbnail overlay with custom play button (use native player controls)
- [ ] Social sharing buttons
- [ ] Related content or "You might also like"
