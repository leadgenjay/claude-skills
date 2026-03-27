# Mobile UX Patterns

Detailed guidelines for mobile-specific conversion optimization.

---

## Device Breakpoints

### Common Screen Sizes

| Device Category | Width | Common Devices |
|----------------|-------|----------------|
| Small Phone | 320px | iPhone SE, older Androids |
| Medium Phone | 375px | iPhone 12/13/14, Pixel |
| Large Phone | 414px | iPhone Plus/Max |
| Small Tablet | 768px | iPad Mini |
| Tablet | 1024px | iPad, Android tablets |

### Breakpoint Strategy

```css
/* Mobile First Approach */
/* Default: Small screens (320px+) */

/* Medium phones */
@media (min-width: 375px) { }

/* Large phones */
@media (min-width: 414px) { }

/* Tablets */
@media (min-width: 768px) { }

/* Desktop */
@media (min-width: 1024px) { }
```

---

## Typography Guidelines

### Minimum Readable Sizes

| Element | Minimum | Recommended |
|---------|---------|-------------|
| Body text | 16px | 18px |
| Secondary text | 14px | 16px |
| Buttons | 16px | 18px |
| Input fields | 16px | 16px (prevents zoom) |
| Headlines | 24px | 28px+ |

### Line Length & Spacing

- **Line length:** 45-75 characters optimal
- **Line height:** 1.5-1.75 for body text
- **Paragraph spacing:** 1.5em between paragraphs
- **Letter spacing:** Slightly increased for small text

### Font Considerations

- **System fonts load fastest** (no download)
- **Variable fonts** reduce file size if using multiple weights
- **Limit font families** to 2 maximum
- **Avoid thin weights** below 400 on mobile

---

## Mobile Form Best Practices

### Field Optimization

```html
<!-- Email with correct keyboard -->
<input type="email" autocomplete="email" inputmode="email">

<!-- Phone with number pad -->
<input type="tel" autocomplete="tel" inputmode="tel">

<!-- Credit card with number pad -->
<input type="text" autocomplete="cc-number" inputmode="numeric">

<!-- Name with text optimization -->
<input type="text" autocomplete="given-name" autocapitalize="words">
```

### Autocomplete Values

| Field | Autocomplete Value |
|-------|-------------------|
| Full name | `name` |
| First name | `given-name` |
| Last name | `family-name` |
| Email | `email` |
| Phone | `tel` |
| Street address | `street-address` |
| City | `address-level2` |
| State | `address-level1` |
| Zip/Postal | `postal-code` |
| Country | `country` |
| Credit card number | `cc-number` |
| Expiration | `cc-exp` |
| CVV | `cc-csc` |

### Input Mode Values

| inputmode | Shows |
|-----------|-------|
| `text` | Regular keyboard |
| `numeric` | Numbers only |
| `tel` | Phone keypad |
| `email` | Email keyboard (with @) |
| `url` | URL keyboard (with .com) |
| `search` | Search keyboard |
| `decimal` | Numbers with decimal |

---

## Touch Gesture Patterns

### Standard Gestures

| Gesture | Use For |
|---------|---------|
| Tap | Primary selection |
| Double tap | Zoom or secondary action |
| Long press | Context menu |
| Swipe horizontal | Navigation, deletion |
| Swipe vertical | Scrolling |
| Pinch | Zoom |
| Pull down | Refresh |

### Gesture Best Practices

- **Don't rely solely on gestures** - Always provide visible alternatives
- **Provide visual feedback** for all touch interactions
- **Use swipe sparingly** - Easy to trigger accidentally
- **Avoid gesture conflicts** with browser defaults

---

## Mobile Navigation Patterns

### Bottom Navigation Bar
Best for: Apps and app-like websites
- 3-5 items maximum
- Icons with labels
- Highlight current section
- Easy thumb access

### Hamburger Menu
Best for: Content-heavy sites
- Always include icon AND text
- Place in consistent location (usually left)
- Keep menu items minimal
- Consider showing critical items outside menu

### Tab Bar
Best for: Filtering content, step navigation
- 3-4 items ideal
- Scrollable for more items
- Clear active state

### Sticky Header
Best for: Long pages
- Keep minimal (height < 60px)
- Auto-hide on scroll down
- Show on scroll up
- Include critical CTA

---

## Image Optimization

### Responsive Images

```html
<picture>
  <!-- WebP for modern browsers -->
  <source
    srcset="image-320.webp 320w,
            image-640.webp 640w,
            image-1280.webp 1280w"
    type="image/webp"
    sizes="(max-width: 768px) 100vw, 50vw">

  <!-- JPEG fallback -->
  <img
    srcset="image-320.jpg 320w,
            image-640.jpg 640w,
            image-1280.jpg 1280w"
    sizes="(max-width: 768px) 100vw, 50vw"
    src="image-640.jpg"
    alt="Description"
    loading="lazy">
</picture>
```

### Image Size Guidelines

| Use Case | Max Width | Format |
|----------|-----------|--------|
| Hero full-width | 1080px (for retina) | WebP/JPEG |
| Content images | 750px | WebP/JPEG |
| Thumbnails | 300px | WebP/JPEG |
| Icons | 48-96px | SVG preferred |
| Logo | 150px | SVG preferred |

### Lazy Loading

```html
<!-- Native lazy loading -->
<img loading="lazy" src="image.jpg" alt="...">

<!-- For browsers without native support -->
<img data-src="image.jpg" class="lazy" alt="...">
```

---

## Mobile Performance Checklist

### Critical Rendering Path

1. **Inline critical CSS** - Above-fold styles in `<head>`
2. **Defer non-critical CSS** - Load after render
3. **Async JavaScript** - Don't block rendering
4. **Preload key assets** - Fonts, hero images

### Resource Optimization

```html
<!-- Preload critical assets -->
<link rel="preload" href="hero.webp" as="image">
<link rel="preload" href="font.woff2" as="font" crossorigin>

<!-- Preconnect to external domains -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://analytics.example.com">

<!-- DNS prefetch for less critical connections -->
<link rel="dns-prefetch" href="https://cdn.example.com">
```

### Third-Party Scripts

- **Defer analytics** - Load after page interactive
- **Lazy load chat widgets** - Don't load until needed
- **Self-host critical scripts** - Reduce DNS lookups
- **Review script impact** - Each script costs performance

---

## Mobile Anti-Patterns

### Avoid These

1. **Hover-dependent interactions**
   - Problem: No hover on touch
   - Fix: Use tap/click instead

2. **Tiny tap targets**
   - Problem: Hard to tap accurately
   - Fix: 44×44px minimum

3. **Intrusive interstitials**
   - Problem: Google penalizes, users hate
   - Fix: Use less obtrusive banners

4. **Autoplay video with sound**
   - Problem: Blocked by browsers, annoying
   - Fix: Muted autoplay or click-to-play

5. **Fixed backgrounds**
   - Problem: Performance issues on mobile
   - Fix: Static backgrounds or simplified effects

6. **Complex animations**
   - Problem: Janky, battery drain
   - Fix: Simple CSS transitions, reduce motion option

7. **Pinch-zoom disabled**
   - Problem: Accessibility issue
   - Fix: Always allow zoom

8. **Text too small to read**
   - Problem: Forces zooming
   - Fix: 16px minimum base font

---

## Click-to-Action Links

### Phone Numbers

```html
<a href="tel:+15551234567">(555) 123-4567</a>
```

### SMS/Text

```html
<a href="sms:+15551234567">Text Us</a>
<a href="sms:+15551234567?body=Hi%20there">Text Us with Pre-filled Message</a>
```

### Email

```html
<a href="mailto:hello@example.com">Email Us</a>
<a href="mailto:hello@example.com?subject=Inquiry&body=Hello">Pre-filled Email</a>
```

### Maps

```html
<!-- Opens in user's default map app -->
<a href="https://maps.google.com/?q=123+Main+St+City+State">Get Directions</a>
```

### Calendar

```html
<!-- .ics file download -->
<a href="event.ics" download>Add to Calendar</a>
```

---

## Mobile Testing Checklist

### Before Launch

- [ ] Test on real iPhone (Safari)
- [ ] Test on real Android (Chrome)
- [ ] Test on older/slower device
- [ ] Test on 3G/slow connection
- [ ] Test all form fields with mobile keyboard
- [ ] Test tap targets with actual thumb
- [ ] Check for horizontal scroll
- [ ] Verify text readability
- [ ] Check page speed on mobile
- [ ] Test click-to-call links
- [ ] Verify sticky elements don't block content
- [ ] Test in portrait AND landscape

### Performance Testing

Run these tools with mobile settings:
- Google PageSpeed Insights
- WebPageTest (select mobile device + 3G)
- Chrome DevTools Lighthouse
- GTmetrix (mobile option)

### Conversion Flow Testing

- [ ] Complete full conversion flow on mobile
- [ ] Fill out all forms with thumbs
- [ ] Test error states on mobile
- [ ] Verify thank you page displays correctly
- [ ] Test email confirmation links on mobile
