---
name: mobile-ux-auditor
description: Audit landing pages for mobile-specific conversion issues including thumb zones, tap targets, and performance. This skill should be used when optimizing for mobile users, reviewing responsive designs, or diagnosing mobile conversion problems. 83% of landing page visits are mobile—mobile UX is critical.
---

# Mobile UX Auditor

This skill provides a specialized framework for auditing mobile conversion experiences, where 83% of landing page traffic occurs.

## When to Use

- Reviewing pages for mobile optimization
- Diagnosing mobile conversion problems
- Optimizing tap targets and touch interactions
- Improving mobile page speed
- Auditing mobile form experiences
- Supporting responsive design reviews

## Why Mobile Matters

- **83% of landing page visits are mobile**
- Mobile conversion rates typically 50% lower than desktop
- Every 1-second delay = 7% conversion drop
- 53% of visitors leave if page takes >3 seconds

Mobile isn't an afterthought—it's the primary experience.

## Mobile Audit Workflow

### Step 1: Real Device Testing
Don't rely on desktop emulators alone. Test on:
- iPhone (Safari)
- Android (Chrome)
- Different screen sizes

### Step 2: Thumb Zone Analysis
Map interactive elements against thumb reach zones.

### Step 3: Tap Target Audit
Verify all interactive elements meet minimum size requirements.

### Step 4: Performance Check
Test load time on 3G/4G connections.

### Step 5: Form UX Review
Verify forms are mobile-optimized.

## Thumb Zone Mapping

### The Thumb Zone Model

```
┌─────────────────────┐
│    Hard to Reach    │  Top 25%
│    (avoid CTAs)     │
├─────────────────────┤
│                     │
│   Natural Reach     │  Middle 50%
│   (ideal for CTAs)  │  OPTIMAL ZONE
│                     │
├─────────────────────┤
│    Easy Reach       │  Bottom 25%
│    (navigation)     │
└─────────────────────┘
```

### Placement Rules

| Element | Optimal Zone |
|---------|--------------|
| Primary CTA | Middle-bottom (thumb sweet spot) |
| Navigation | Bottom edge |
| Secondary actions | Top corners |
| Form inputs | Center of screen |

### Critical Violations
- **CTA in top corners** - Hard to reach with thumb
- **Important buttons at very bottom** - May be hidden by browser chrome
- **Tap targets too close together** - Accidental taps

## Tap Target Requirements

### Minimum Sizes

| Element | Minimum Size | Recommended |
|---------|--------------|-------------|
| Buttons | 44×44px | 48×48px |
| Links in text | 44×44px touch area | Larger clickable area |
| Form inputs | 44px height | 48px+ height |
| Icons | 44×44px | 48×48px |

### Spacing Requirements
- **Minimum 8px** between tap targets
- **Recommended 16px** between adjacent buttons
- **32px+ margin** around isolated CTAs

### Common Violations
- [ ] Buttons smaller than 44×44px
- [ ] Links too close together
- [ ] Tiny form inputs
- [ ] Overlapping touch targets
- [ ] Navigation links too tight

## Mobile Page Speed

### Target Metrics

| Metric | Good | Needs Work | Poor |
|--------|------|------------|------|
| First Contentful Paint | <1.8s | 1.8-3.0s | >3.0s |
| Largest Contentful Paint | <2.5s | 2.5-4.0s | >4.0s |
| Time to Interactive | <3.8s | 3.8-7.3s | >7.3s |
| Total Blocking Time | <200ms | 200-600ms | >600ms |

### Quick Speed Fixes

1. **Compress images** - Use WebP, serve appropriate sizes
2. **Lazy load below-fold** - Don't load what isn't visible
3. **Minimize JavaScript** - Every KB counts on mobile
4. **Enable caching** - Return visitors load instantly
5. **Use CDN** - Serve from edge locations

### Testing Tools
- Google PageSpeed Insights (use mobile tab)
- WebPageTest (select mobile device)
- Lighthouse (in Chrome DevTools)

## Mobile Form Optimization

### Input Type Optimization

Use correct input types to show appropriate keyboards:

| Field | Input Type | Keyboard |
|-------|------------|----------|
| Email | `type="email"` | Email keyboard with @ |
| Phone | `type="tel"` | Number pad |
| URL | `type="url"` | URL keyboard with .com |
| Numbers | `type="number"` | Number pad |
| Search | `type="search"` | Search keyboard |

### Form UX Rules

- [ ] Use `autocomplete` attributes
- [ ] Show keyboard appropriate to field
- [ ] Make inputs at least 48px tall
- [ ] Use clear, visible labels
- [ ] Show validation errors inline
- [ ] Don't require zooming to type
- [ ] Keep form above keyboard when focused

### Checkout/Multi-Field Forms
- Break into steps (one screen at a time)
- Show progress indicator
- Save progress automatically
- Allow going back
- Pre-fill from previous data when possible

## Mobile-Specific Issues

### Common Problems

1. **Horizontal scroll** - Content wider than viewport
2. **Unreadable text** - Font size below 16px
3. **Touch zoom disabled** - Frustrating for users
4. **Fixed elements blocking content** - Sticky headers too large
5. **Popups that don't close** - Modal issues on mobile
6. **Video doesn't play** - Autoplay restrictions
7. **Click delays** - 300ms delay on some browsers
8. **Testimonial carousels** - Under 2% mobile engagement. Stack proof vertically instead of hiding behind swipe interactions.

### Mobile vs Desktop Behavior Differences

| Behavior | Desktop | Mobile |
|----------|---------|--------|
| Hover states | Available | Not available |
| Right-click | Available | Long-press instead |
| Multi-select | Ctrl/Cmd+click | Usually not available |
| File uploads | Easy | Camera/files |
| Copy/paste | Keyboard shortcuts | Long-press menu |

## Mobile Audit Checklist

### Visual & Layout
- [ ] No horizontal scrolling
- [ ] Text readable without zooming (16px+ base)
- [ ] Images scale appropriately
- [ ] No content hidden by browser chrome
- [ ] Adequate white space for touch

### Navigation & Interaction
- [ ] All tap targets 44×44px minimum
- [ ] 8px+ spacing between targets
- [ ] CTAs in thumb zone
- [ ] No hover-dependent interactions
- [ ] Links clearly distinguishable

### Forms
- [ ] Correct input types for keyboards
- [ ] Inputs 48px+ height
- [ ] Labels always visible
- [ ] Autocomplete enabled
- [ ] Validation inline, not just on submit

### Performance
- [ ] LCP under 2.5 seconds
- [ ] FCP under 1.8 seconds
- [ ] Images optimized
- [ ] JavaScript minimized
- [ ] No render-blocking resources

### Content
- [ ] Most important content above fold
- [ ] CTA visible without scrolling
- [ ] Shortened copy for mobile (if appropriate)
- [ ] Phone numbers are click-to-call
- [ ] Addresses link to maps
- [ ] Social proof vertically stacked, not in carousels

## Mobile Conversion Quick Wins

### Immediate Fixes
1. Increase CTA button size to 48px+
2. Move CTA into thumb zone
3. Compress hero image
4. Add `type="tel"` to phone fields
5. Enable click-to-call for phone numbers

### High-Impact Changes
1. Simplify above-fold content
2. Reduce form fields for mobile
3. Add sticky CTA that follows scroll
4. Implement lazy loading
5. Remove non-essential mobile elements

### Testing Priorities
1. Test form completion flow
2. Test tap target accessibility
3. Test page speed on throttled connection
4. Test with actual thumb use
5. Test checkout/conversion flow end-to-end

## Reference Materials

For detailed mobile patterns and anti-patterns, consult:
- `references/mobile-patterns.md` - Mobile-specific guidelines
