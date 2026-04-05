# Slide Type Templates

Full HTML/CSS reference for each slide type in the presentation design system.

## Complete CSS Design System

Paste this entire `<style>` block into the `<head>` of every presentation.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PRESENTATION TITLE</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/theme/white.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=Manrope:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --accent: #ED0D51;
            --bg: #FFFFFF;
            --text: #111111;
            --text-body: #555555;
            --dark-bg: #0D0D0D;
        }

        .reveal {
            font-family: 'Manrope', sans-serif;
            font-size: 40px;
            color: var(--text);
        }

        .reveal .slides {
            text-align: center;
        }

        .reveal .slides section {
            background: var(--bg);
            padding: 40px 60px;
            height: 100%;
            display: flex !important;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }

        .reveal h1, .reveal h2, .reveal h3 {
            font-family: 'Big Shoulders Display', sans-serif;
            text-transform: uppercase;
            letter-spacing: 0.02em;
            color: var(--text);
            margin-bottom: 0.2em;
        }

        .reveal h1 { font-size: 4.2em; font-weight: 900; line-height: 1.05; }
        .reveal h2 { font-size: 3.6em; font-weight: 800; line-height: 1.05; margin-top: 0; }
        .reveal h3 { font-size: 2.6em; font-weight: 700; }

        .reveal p {
            color: var(--text-body);
            font-size: 1.3em;
            font-weight: 400;
            margin-top: 0.2em;
            line-height: 1.4;
        }

        .reveal .caption {
            color: var(--text-body);
            font-size: 1.05em;
            font-weight: 400;
            margin-top: 0.5em;
        }

        .accent { color: var(--accent); }

        /* Section badge pill */
        .section-badge {
            display: inline-block;
            background: var(--accent);
            color: #FFF;
            font-family: 'Big Shoulders Display', sans-serif;
            font-size: 0.8em;
            font-weight: 700;
            padding: 6px 20px;
            border-radius: 20px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.4em;
        }

        /* Screenshot */
        .screenshot {
            max-width: 92%;
            border-radius: 12px;
            box-shadow: 0 8px 40px rgba(0,0,0,0.12);
            margin-top: 0.3em;
            object-fit: contain;
            flex-shrink: 1;
            min-height: 0;
        }

        .screenshot-wide { max-width: 96%; }

        .screenshot-slide {
            overflow: hidden;
            padding: 30px 50px !important;
        }

        .screenshot-slide h2 {
            font-size: 2.8em;
            margin-bottom: 0.1em;
            flex-shrink: 0;
        }

        .screenshot-slide .screenshot { max-height: min(680px, 68vh); }

        .screenshot-slide .caption,
        .screenshot-slide p {
            font-size: 0.95em;
            margin-top: 0.2em;
            flex-shrink: 0;
        }

        .screenshot-pair {
            display: flex;
            gap: 24px;
            justify-content: center;
            margin-top: 0.6em;
        }

        .screenshot-pair img {
            max-width: 48%;
            max-height: min(640px, 64vh);
            border-radius: 12px;
            box-shadow: 0 8px 40px rgba(0,0,0,0.12);
            object-fit: contain;
        }

        .screenshot-triple {
            display: flex;
            gap: 16px;
            justify-content: center;
            margin-top: 0.5em;
        }

        .screenshot-triple img {
            max-width: 32%;
            max-height: min(540px, 54vh);
            border-radius: 12px;
            box-shadow: 0 8px 40px rgba(0,0,0,0.12);
            object-fit: contain;
        }

        /* Title slide */
        .title-slide { position: relative; }

        .title-slide .title-content {
            display: flex;
            align-items: center;
            gap: 60px;
        }

        .title-slide .title-text { text-align: left; flex: 1; }

        .title-slide .title-photo {
            width: 420px;
            height: 420px;
            border-radius: 50%;
            object-fit: cover;
            box-shadow: 0 8px 40px rgba(0,0,0,0.12);
        }

        .title-slide .logo { height: 56px; margin-bottom: 1em; }

        /* Arrow list */
        .centered-list { text-align: left; display: inline-block; margin-top: 0.8em; }

        .centered-list li {
            color: var(--text-body);
            font-size: 1.3em;
            margin-bottom: 0.3em;
            list-style: none;
            padding-left: 1.5em;
            position: relative;
        }

        .centered-list li::before {
            content: "→";
            position: absolute;
            left: 0;
            color: var(--accent);
            font-weight: 700;
        }

        /* Two-column layout */
        .two-col {
            display: flex;
            gap: 60px;
            margin-top: 0.8em;
            width: 100%;
            max-width: 1400px;
        }

        .two-col .col { flex: 1; text-align: left; }
        .two-col .col h3 { font-size: 2.1em; margin-bottom: 0.3em; }
        .two-col .col p { font-size: 1.3em; line-height: 1.8; }

        .col-divider { width: 2px; background: #E0E0E0; align-self: stretch; }

        /* Three-column layout */
        .three-col {
            display: flex;
            gap: 40px;
            margin-top: 0.8em;
            width: 100%;
            max-width: 1500px;
        }

        .three-col .col { flex: 1; text-align: left; }
        .three-col .col h3 { font-size: 2em; color: var(--accent); margin-bottom: 0.3em; }

        .three-col .col li {
            color: var(--text-body);
            font-size: 1.3em;
            margin-bottom: 0.4em;
            list-style: none;
        }

        /* Outline list */
        .outline-list { text-align: left; display: inline-block; margin-top: 0.6em; }

        .outline-list li {
            color: var(--text-body);
            font-size: 1.25em;
            margin-bottom: 0.7em;
            list-style: none;
            padding-left: 2.4em;
            position: relative;
        }

        .outline-list li .outline-num {
            position: absolute;
            left: 0;
            width: 1.6em;
            height: 1.6em;
            background: var(--accent);
            color: #FFF;
            border-radius: 50%;
            font-weight: 700;
            font-size: 0.85em;
            display: flex;
            align-items: center;
            justify-content: center;
            top: 0.15em;
            font-family: 'Big Shoulders Display', sans-serif;
        }

        .outline-list li strong { color: var(--text); }

        /* Stats row */
        .stats-row {
            display: flex;
            gap: 48px;
            margin-top: 1em;
            justify-content: center;
        }

        .stat-item { text-align: center; }

        .stat-item .stat-number {
            font-family: 'Big Shoulders Display', sans-serif;
            font-size: 2.8em;
            font-weight: 900;
            color: var(--accent);
            line-height: 1;
        }

        .stat-item .stat-label {
            font-size: 0.95em;
            color: var(--text-body);
            margin-top: 0.2em;
        }

        /* Numbered list */
        .numbered-list {
            text-align: left;
            display: inline-block;
            margin-top: 0.8em;
            counter-reset: steps;
        }

        .numbered-list li {
            color: var(--text-body);
            font-size: 1.35em;
            margin-bottom: 0.5em;
            list-style: none;
            padding-left: 2.2em;
            position: relative;
        }

        .numbered-list li::before {
            counter-increment: steps;
            content: counter(steps);
            position: absolute;
            left: 0;
            width: 1.6em;
            height: 1.6em;
            background: var(--accent);
            color: #FFF;
            border-radius: 50%;
            font-weight: 700;
            font-size: 0.85em;
            display: flex;
            align-items: center;
            justify-content: center;
            top: 0.05em;
        }

        /* Dark slide */
        .dark-slide { background: var(--dark-bg) !important; }
        .dark-slide h2 { color: #FFFFFF; }
        .dark-slide p { color: #AAAAAA; }

        /* Cost breakdown */
        .cost-breakdown {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-top: 0.5em;
            max-width: 900px;
            width: 100%;
        }

        .cost-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 32px;
            background: #F8F8F8;
            border-radius: 8px;
            font-size: 1.35em;
        }

        .cost-item .role { color: var(--text); font-weight: 500; }

        .cost-item .price {
            font-family: 'Big Shoulders Display', sans-serif;
            font-weight: 800;
            color: var(--accent);
            font-size: 1.1em;
        }

        .cost-total {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 32px;
            background: var(--accent);
            border-radius: 8px;
            font-size: 1.5em;
            margin-top: 4px;
        }

        .cost-total .role { color: #FFF; font-weight: 700; }

        .cost-total .price {
            font-family: 'Big Shoulders Display', sans-serif;
            font-weight: 900;
            color: #FFF;
            font-size: 1.2em;
        }

        /* Montage grid (triple with stats) */
        .montage-grid {
            display: flex;
            gap: 24px;
            justify-content: center;
            align-items: flex-start;
            margin-top: 0.6em;
        }

        .montage-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex: 1;
            max-width: 480px;
        }

        .montage-item img {
            width: 100%;
            height: min(420px, 44vh);
            border-radius: 12px;
            box-shadow: 0 8px 40px rgba(0,0,0,0.12);
            object-fit: contain;
        }

        .montage-stat { margin-top: 10px; text-align: center; }

        .montage-stat .stat-number {
            font-family: 'Big Shoulders Display', sans-serif;
            font-size: 1.8em;
            font-weight: 900;
            color: var(--accent);
            line-height: 1.1;
        }

        .montage-stat .stat-label { font-size: 0.85em; color: var(--text-body); }

        /* Before/After comparison */
        .before-after {
            display: flex;
            gap: 0;
            width: 100%;
            max-width: 1400px;
            margin-top: 1em;
        }

        .before-col, .after-col { flex: 1; padding: 40px; text-align: left; }
        .before-col { background: #F5F5F5; border-radius: 12px 0 0 12px; }
        .after-col { background: var(--accent); border-radius: 0 12px 12px 0; }
        .before-col h3 { color: var(--text-body); font-size: 1.8em; }
        .before-col p { color: var(--text-body); font-size: 1.35em; line-height: 1.8; }
        .after-col h3 { color: #FFFFFF; font-size: 1.8em; }
        .after-col p { color: rgba(255,255,255,0.9); font-size: 1.35em; line-height: 1.8; }

        /* Pipeline diagram (dark slides) */
        .pipeline-diagram {
            display: flex;
            align-items: center;
            gap: 0;
            margin-top: 1.2em;
            flex-wrap: wrap;
            justify-content: center;
        }

        .pipeline-step {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            padding: 24px 28px;
            background: rgba(255,255,255,0.08);
            border: 2px solid rgba(255,255,255,0.15);
            border-radius: 12px;
            min-width: 160px;
        }

        .pipeline-step .step-icon { font-size: 2.4em; }

        .pipeline-step .step-label {
            font-family: 'Big Shoulders Display', sans-serif;
            font-size: 0.95em;
            font-weight: 700;
            color: #FFFFFF;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            text-align: center;
        }

        .pipeline-arrow {
            font-size: 1.8em;
            color: var(--accent);
            margin: 0 8px;
            font-weight: 900;
        }

        /* Hub diagram */
        .hub { position: relative; width: 580px; height: 360px; margin-top: 0.5em; }

        .hub .center {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--accent);
            color: #FFF;
            font-weight: 700;
            font-size: 1.4em;
            padding: 28px 36px;
            border-radius: 50%;
            z-index: 2;
        }

        .hub .spoke {
            position: absolute;
            background: #F5F5F5;
            border: 2px solid #E0E0E0;
            border-radius: 10px;
            padding: 12px 20px;
            font-size: 0.9em;
            font-weight: 500;
            color: var(--text);
        }

        .hub .spoke:nth-child(2) { top: 0; left: 50%; transform: translateX(-50%); }
        .hub .spoke:nth-child(3) { top: 15%; right: 0; }
        .hub .spoke:nth-child(4) { bottom: 15%; right: 0; }
        .hub .spoke:nth-child(5) { bottom: 0; left: 50%; transform: translateX(-50%); }
        .hub .spoke:nth-child(6) { bottom: 15%; left: 0; }
        .hub .spoke:nth-child(7) { top: 15%; left: 0; }

        /* Personal close */
        .close-photo {
            width: 340px;
            height: 340px;
            border-radius: 50%;
            object-fit: cover;
            box-shadow: 0 8px 40px rgba(0,0,0,0.12);
            margin-bottom: 0.6em;
        }

        .close-handle {
            font-family: 'Big Shoulders Display', sans-serif;
            font-size: 2.4em;
            font-weight: 800;
            color: var(--accent);
            margin-top: 0.2em;
        }

        /* Screenshot labels */
        .screenshot-labels {
            display: flex;
            gap: 20px;
            justify-content: center;
            margin-top: 0.4em;
        }

        .screenshot-labels .label {
            font-family: 'Big Shoulders Display', sans-serif;
            font-size: 0.7em;
            font-weight: 700;
            color: var(--accent);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        /* CTA elements */
        .cta-url {
            font-family: 'Big Shoulders Display', sans-serif;
            font-size: 3em;
            font-weight: 900;
            color: var(--accent);
            text-transform: uppercase;
            margin-top: 0.2em;
        }

        .cta-footer {
            margin-top: 1.2em;
            padding: 12px 32px;
            background: rgba(237, 13, 81, 0.08);
            border-radius: 8px;
            font-size: 0.85em;
            color: var(--accent);
            font-weight: 600;
        }

        .cta-footer a { color: var(--accent); text-decoration: underline; }

        /* Speaker notes */
        .reveal .speaker-notes { font-family: 'Manrope', sans-serif; }
    </style>
</head>
```

## Reveal.js Initialization

```html
<script src="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.js"></script>
<script src="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/plugin/notes/notes.js"></script>
<script>
    Reveal.initialize({
        hash: true,
        width: 1920,
        height: 1080,
        margin: 0,
        minScale: 0.2,
        maxScale: 2.0,
        center: true,
        transition: 'fade',
        transitionSpeed: 'fast',
        plugins: [ RevealNotes ]
    });
</script>
```

---

## Slide Templates

### 1. Title Slide

Photo + headline + logo. Left-aligned text, circular photo right.

```html
<section class="title-slide">
    <div class="title-content">
        <div class="title-text">
            <img src="assets/logo.webp" class="logo" alt="Logo">
            <h1>Headline Goes<br>Right <span class="accent">Here</span></h1>
            <p>Speaker Name · Company</p>
        </div>
        <img src="assets/speaker-photo.png" class="title-photo" alt="Speaker">
    </div>
    <aside class="notes">Speaker notes here.</aside>
</section>
```

### 2. Outline Slide

Numbered list with accent pill badges for table of contents.

```html
<section>
    <h2>What You'll Learn <span class="accent">Today</span></h2>
    <ul class="outline-list">
        <li><span class="outline-num">1</span><strong>Topic one</strong> — brief description</li>
        <li><span class="outline-num">2</span><strong>Topic two</strong> — brief description</li>
        <li><span class="outline-num">3</span><strong>Topic three</strong> — brief description</li>
        <li><span class="outline-num">4</span><strong>Topic four</strong> — brief description</li>
    </ul>
    <aside class="notes">Speaker notes here.</aside>
</section>
```

### 3. Bold Statement Slide

Big headline + 1-line body text. For thesis and bold claims.

```html
<section>
    <h2>Bold Claim Goes<br><span class="accent">Right Here.</span></h2>
    <p>One supporting line. Maximum ~15 words.</p>
    <aside class="notes">Speaker notes here.</aside>
</section>
```

### 4. Section Opener

Section badge pill + headline. Marks act transitions.

```html
<section>
    <span class="section-badge">01 · Section Name</span>
    <h2>Section Headline<br><span class="accent">Goes Here.</span></h2>
    <p>One supporting line.</p>
    <aside class="notes">Speaker notes here.</aside>
</section>
```

### 5. Stats Row Slide

Headline + row of accent numbers with labels.

```html
<section>
    <h2>Headline with <span class="accent">Stats.</span></h2>
    <div class="stats-row">
        <div class="stat-item">
            <div class="stat-number">$1M+</div>
            <div class="stat-label">Monthly Revenue</div>
        </div>
        <div class="stat-item">
            <div class="stat-number">80</div>
            <div class="stat-label">Employees</div>
        </div>
        <div class="stat-item">
            <div class="stat-number">2 wks</div>
            <div class="stat-label">To Learn</div>
        </div>
    </div>
    <aside class="notes">Speaker notes here.</aside>
</section>
```

### 6. Screenshot Slide (Single)

Headline + single large screenshot + caption.

```html
<section class="screenshot-slide">
    <h2>Screenshot <span class="accent">Headline</span></h2>
    <div class="screenshot-container">
        <img src="assets/screenshot.jpg" class="screenshot screenshot-wide" alt="Description">
    </div>
    <p class="caption">Brief caption describing what we're looking at.</p>
    <aside class="notes">Speaker notes here.</aside>
</section>
```

### 7. Screenshot Pair Slide

Headline + two screenshots side by side + caption.

```html
<section class="screenshot-slide">
    <h2>Two Screenshots <span class="accent">Compared</span></h2>
    <div class="screenshot-pair">
        <img src="assets/left.jpg" alt="Left description">
        <img src="assets/right.jpg" alt="Right description">
    </div>
    <p class="caption">Caption describing both screenshots.</p>
    <aside class="notes">Speaker notes here.</aside>
</section>
```

### 8. Screenshot Triple / Montage

Three images with stat badges below each.

```html
<section class="screenshot-slide">
    <h2 style="font-size: 2.6em; margin-bottom: 0.2em;">Headline <span class="accent">Here.</span></h2>
    <div class="montage-grid">
        <div class="montage-item">
            <img src="assets/image1.jpg" alt="Item 1">
            <div class="montage-stat">
                <div class="stat-number">Stat 1</div>
                <div class="stat-label">Label 1</div>
            </div>
        </div>
        <div class="montage-item">
            <img src="assets/image2.jpg" alt="Item 2">
            <div class="montage-stat">
                <div class="stat-number">Stat 2</div>
                <div class="stat-label">Label 2</div>
            </div>
        </div>
        <div class="montage-item">
            <img src="assets/image3.jpg" alt="Item 3">
            <div class="montage-stat">
                <div class="stat-number">Stat 3</div>
                <div class="stat-label">Label 3</div>
            </div>
        </div>
    </div>
    <aside class="notes">Speaker notes here.</aside>
</section>
```

### 9. Three-Column Slide

Headline + three columns with accent h3 + body text or lists.

```html
<section>
    <h2>Three Column <span class="accent">Layout</span></h2>
    <div class="three-col" style="margin-top: 1em;">
        <div class="col" style="text-align: center;">
            <h3>Column One</h3>
            <p style="font-size: 1.05em; color: var(--text-body);">Brief description here.</p>
        </div>
        <div class="col" style="text-align: center;">
            <h3>Column Two</h3>
            <p style="font-size: 1.05em; color: var(--text-body);">Brief description here.</p>
        </div>
        <div class="col" style="text-align: center;">
            <h3>Column Three</h3>
            <p style="font-size: 1.05em; color: var(--text-body);">Brief description here.</p>
        </div>
    </div>
    <aside class="notes">Speaker notes here.</aside>
</section>
```

**With lists instead of paragraphs:**

```html
<section>
    <h2>Three Column <span class="accent">Lists</span></h2>
    <div class="three-col">
        <div class="col">
            <h3>Category A</h3>
            <ul>
                <li>Item one</li>
                <li>Item two</li>
                <li>Item three</li>
            </ul>
        </div>
        <div class="col">
            <h3>Category B</h3>
            <ul>
                <li>Item one</li>
                <li>Item two</li>
                <li>Item three</li>
            </ul>
        </div>
        <div class="col">
            <h3>Category C</h3>
            <ul>
                <li>Item one</li>
                <li>Item two</li>
                <li>Item three</li>
            </ul>
        </div>
    </div>
    <aside class="notes">Speaker notes here.</aside>
</section>
```

### 10. Two-Column Comparison

Two columns with a vertical divider.

```html
<section>
    <h2>Two Tools. One <span class="accent">System.</span></h2>
    <div class="two-col">
        <div class="col">
            <h3 style="color: var(--accent);">Left Title</h3>
            <h3 style="font-size:1.1em; color: var(--text-body); font-family: 'Manrope', sans-serif; text-transform: none;">Subtitle</h3>
            <p>Line one<br>Line two<br>Line three</p>
        </div>
        <div class="col-divider"></div>
        <div class="col">
            <h3 style="color: var(--accent);">Right Title</h3>
            <h3 style="font-size:1.1em; color: var(--text-body); font-family: 'Manrope', sans-serif; text-transform: none;">Subtitle</h3>
            <p>Line one<br>Line two<br>Line three</p>
        </div>
    </div>
    <p class="caption">Summary caption below.</p>
    <aside class="notes">Speaker notes here.</aside>
</section>
```

### 11. Before/After Slide

Gray left (old way) + accent right (new way).

```html
<section>
    <h2>The <span class="accent">Transformation</span></h2>
    <div class="before-after">
        <div class="before-col">
            <h3>Before</h3>
            <p>Old way line 1<br>Old way line 2<br>Old way line 3</p>
        </div>
        <div class="after-col">
            <h3>After</h3>
            <p>New way line 1<br>New way line 2<br>New way line 3</p>
        </div>
    </div>
    <aside class="notes">Speaker notes here.</aside>
</section>
```

### 12. Cost Breakdown Slide

Stacked cost items with a total bar.

```html
<section>
    <h2 style="margin-bottom: 0.1em;">Headline:<br><span class="accent">Cost Focus</span></h2>
    <div class="cost-breakdown">
        <div class="cost-item">
            <span class="role">Line Item 1</span>
            <span class="price">$X,XXX/mo</span>
        </div>
        <div class="cost-item">
            <span class="role">Line Item 2</span>
            <span class="price">$X,XXX/mo</span>
        </div>
        <div class="cost-item">
            <span class="role">Line Item 3</span>
            <span class="price">$X,XXX/mo</span>
        </div>
        <div class="cost-total">
            <span class="role">Total</span>
            <span class="price">$XX,XXX/mo</span>
        </div>
    </div>
    <aside class="notes">Speaker notes here.</aside>
</section>
```

### 13. Dark Slide

Dark background for visual pattern interrupt / transitions.

```html
<section class="dark-slide">
    <h2>Dark Slide <span class="accent">Headline</span></h2>
    <p style="color: #AAAAAA; font-size: 1.3em;">Supporting text in light gray.</p>
    <aside class="notes">Speaker notes here.</aside>
</section>
```

### 14. Pipeline Diagram

Dark slide with horizontal step boxes and arrows. For workflows.

```html
<section class="dark-slide">
    <h2>Pipeline <span class="accent">Headline</span></h2>
    <p style="color: #AAAAAA;">Brief description of the pipeline.</p>
    <div class="pipeline-diagram">
        <div class="pipeline-step">
            <div class="step-icon">🌐</div>
            <div class="step-label">Step<br>One</div>
        </div>
        <div class="pipeline-arrow">→</div>
        <div class="pipeline-step">
            <div class="step-icon">📧</div>
            <div class="step-label">Step<br>Two</div>
        </div>
        <div class="pipeline-arrow">→</div>
        <div class="pipeline-step">
            <div class="step-icon">✍️</div>
            <div class="step-label">Step<br>Three</div>
        </div>
        <div class="pipeline-arrow">→</div>
        <div class="pipeline-step">
            <div class="step-icon">🚀</div>
            <div class="step-label">Step<br>Four</div>
        </div>
    </div>
    <aside class="notes">Speaker notes here.</aside>
</section>
```

### 15. Capabilities List

Arrow-prefixed list items for "what it can do."

```html
<section>
    <h2>Capabilities <span class="accent">Headline</span></h2>
    <ul class="centered-list">
        <li>Capability one</li>
        <li>Capability two</li>
        <li>Capability three</li>
        <li>Capability four</li>
        <li>Capability five</li>
    </ul>
    <aside class="notes">Speaker notes here.</aside>
</section>
```

### 16. Numbered Steps

Ordered list with accent number badges + optional CTA section.

```html
<section>
    <h2>How to <span class="accent">Start</span></h2>
    <ol class="numbered-list">
        <li>Step one description</li>
        <li>Step two description</li>
        <li>Step three description</li>
        <li>Step four description</li>
        <li>Step five description</li>
    </ol>
    <div style="margin-top: 0.6em;">
        <img src="assets/logo.webp" style="height: 40px; margin-bottom: 0.3em;" alt="Logo">
        <div class="cta-url">yoursite.com/link</div>
        <p style="font-size: 1em;">@handle · Community Name</p>
    </div>
    <aside class="notes">Speaker notes here.</aside>
</section>
```

### 17. Personal Close

Circular photo + headline + handle + "Thank you." Always the last slide.

```html
<section>
    <img src="assets/headshot.png" class="close-photo" alt="Speaker">
    <h2>Let's Go <span class="accent">Build</span> Something.</h2>
    <div class="close-handle">@handle</div>
    <p>Thank you.</p>
    <aside class="notes">Speaker notes here.</aside>
</section>
```

### 18. CTA Footer

Add to any slide type — a pink CTA footer bar with a link.

```html
<!-- Add this inside any <section>, after the main content -->
<div class="cta-footer">
    Grab the free resource → <a href="https://yoursite.com/link">yoursite.com/link</a>
</div>
```

---

## Hub Diagram

For showing a central concept connected to multiple tools/services.

```html
<section>
    <h2>Hub <span class="accent">Headline</span></h2>
    <p class="caption">Brief description of the hub.</p>
    <div class="hub">
        <div class="center">Center Label</div>
        <div class="spoke">Spoke 1</div>
        <div class="spoke">Spoke 2</div>
        <div class="spoke">Spoke 3</div>
        <div class="spoke">Spoke 4</div>
        <div class="spoke">Spoke 5</div>
        <div class="spoke">Spoke 6</div>
    </div>
    <aside class="notes">Speaker notes here.</aside>
</section>
```

## Screenshot Triple with Labels

Triple screenshots with labeled badges below (instead of stat badges).

```html
<section class="screenshot-slide">
    <h2>Triple Screenshot <span class="accent">Layout</span></h2>
    <div class="screenshot-triple">
        <img src="assets/img1.jpg" alt="Image 1">
        <img src="assets/img2.jpg" alt="Image 2">
        <img src="assets/img3.jpg" alt="Image 3">
    </div>
    <div class="screenshot-labels">
        <span class="label" style="flex:1;">Label One</span>
        <span class="label" style="flex:1;">Label Two</span>
        <span class="label" style="flex:1;">Label Three</span>
    </div>
    <aside class="notes">Speaker notes here.</aside>
</section>
```
