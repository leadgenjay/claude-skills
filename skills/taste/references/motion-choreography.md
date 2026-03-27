# Motion Choreography Reference

Advanced animation patterns for page-level choreography, scroll interactions, and micro-interactions.

---

## Page Load Choreography

Sequence timing for first paint to fully interactive:

```
0ms    — Layout shell renders (SSR, no animation)
100ms  — Hero text fades in (opacity 0→1, y: 20→0)
200ms  — Hero CTA appears (opacity 0→1, scale: 0.95→1)
350ms  — Supporting elements stagger in (staggerChildren: 0.08)
500ms  — Scroll indicator pulses (if applicable)
```

Spring config for entrances:
```tsx
const entrance = { type: "spring", stiffness: 300, damping: 30 }
```

Keep total page load animation under 600ms. Users should reach interactive state quickly.

---

## Scroll-Triggered Reveals

Use Framer Motion's `whileInView` for below-fold content:

```tsx
<motion.div
  initial={{ opacity: 0, y: 30 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.3 }}
  transition={{ duration: 0.5, ease: "easeOut" }}
>
```

### Timing Guidelines
- Sections: 500ms duration, `amount: 0.3` viewport threshold
- Individual elements: 300ms duration, `amount: 0.5` threshold
- Stagger for lists: `staggerChildren: 0.08`, `delayChildren: 0.1`
- Stagger for cards: `staggerChildren: 0.12`, `delayChildren: 0.2`
- Always set `once: true` — never re-animate on scroll back up

### Reveal Patterns
- **Fade up** (default): `y: 30→0, opacity: 0→1`
- **Fade in** (subtle): `opacity: 0→1` only, no position shift
- **Scale in** (emphasis): `scale: 0.95→1, opacity: 0→1`

Avoid horizontal reveals (left/right slide) — they feel dated and draw attention to the animation rather than the content.

---

## Hover Choreography

### Cards
```tsx
<motion.div
  whileHover={{ y: -2, boxShadow: "0 8px 32px rgba(237,13,81,0.10)" }}
  transition={{ duration: 0.2, ease: "easeOut" }}
/>
```
Lift 2px + tinted shadow increase. Keep it subtle — the card content matters, not the hover effect.

### Buttons
```tsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.97 }}
  transition={{ type: "spring", stiffness: 400, damping: 30 }}
/>
```

### Links
Underline width animates 0→100% using background-size technique:
```css
.link {
  text-decoration: none;
  background-image: linear-gradient(currentColor, currentColor);
  background-position: 0% 100%;
  background-repeat: no-repeat;
  background-size: 0% 1px;
  transition: background-size 200ms ease-out;
}
.link:hover {
  background-size: 100% 1px;
}
```
Note: This uses a gradient solely for the underline technique — not as a surface color (which is banned by LGJ rules).

### Images
```tsx
<motion.div
  whileHover={{ scale: 1.03 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
  className="overflow-hidden rounded-lg"
>
  <Image ... />
</motion.div>
```
Container has `overflow-hidden` so scaled image does not break layout.

### Icons
```tsx
<motion.div
  whileHover={{ rotate: 5, color: "#ED0D51" }}
  transition={{ duration: 0.2 }}
/>
```

---

## Exit Animations

### Modals
```tsx
exit={{ opacity: 0, scale: 0.95 }}
transition={{ duration: 0.2, ease: "easeIn" }}
```

### Toasts
```tsx
exit={{ x: "100%", opacity: 0 }}
transition={{ duration: 0.3, ease: "easeIn" }}
```

### Dropdowns
```tsx
exit={{ opacity: 0, y: -8 }}
transition={{ duration: 0.15, ease: "easeIn" }}
```

Exit animations should be faster than entrances. Users want things to disappear quickly.

---

## Stagger Patterns

| Context | staggerChildren | delayChildren |
|---------|----------------|---------------|
| List items | 0.05–0.08s | 0.1s |
| Card grids | 0.10–0.15s | 0.2s |
| Navigation items | 0.03s | 0.05s |
| Form fields | 0.06s | 0.1s |
| Feature sections | 0.12s | 0.15s |

Keep stagger groups under 20 items. For longer lists, batch into visible chunks or paginate.

---

## Spring Presets

| Preset | stiffness | damping | Use Case |
|--------|-----------|---------|----------|
| Snappy | 400 | 30 | Buttons, toggles, checkboxes |
| Standard | 300 | 30 | Cards, sections, general transitions |
| Soft | 200 | 25 | Modals, overlays, page transitions |
| Bouncy | 300 | 15 | Success states, celebratory moments |

```tsx
const springPresets = {
  snappy:   { type: "spring", stiffness: 400, damping: 30 },
  standard: { type: "spring", stiffness: 300, damping: 30 },
  soft:     { type: "spring", stiffness: 200, damping: 25 },
  bouncy:   { type: "spring", stiffness: 300, damping: 15 },
}
```

---

## Reduced Motion Support

Always respect `prefers-reduced-motion`. Framer Motion handles this automatically when using the `animate` prop — animations are disabled when the user has reduced motion enabled.

For custom CSS animations, use the media query:
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

For programmatic checks:
```tsx
const prefersReducedMotion = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false
```

---

## Performance Rules

1. **GPU-only properties**: Only animate `transform` (translate, scale, rotate) and `opacity`. Never animate width, height, padding, margin, top, left.
2. **will-change sparingly**: Add `will-change: transform` only to elements about to animate. Remove after animation completes.
3. **No layout thrashing**: Never read layout properties (offsetHeight, getBoundingClientRect) then write styles in the same frame.
4. **Batch stagger groups**: Keep under 20 items. For longer lists, animate the container, not individual items.
5. **Debounce scroll handlers**: Use IntersectionObserver (which `whileInView` uses internally) instead of scroll event listeners.
6. **Lazy load animated sections**: Below-fold animated content should load lazily — both the content and the animation code.
7. **Test on low-end devices**: Animations that feel smooth on M-series Macs may jank on older phones. Test at 4x CPU throttle in DevTools.
