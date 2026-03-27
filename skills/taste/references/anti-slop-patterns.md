# Anti-Slop Pattern Library

Detect and fix AI-generated aesthetic patterns. Each pattern includes what to look for and how to fix it.

---

## Visual Slop Patterns

| Pattern | How to Detect | Fix |
|---------|--------------|-----|
| Equal-width columns everywhere | All grid children use same `col-span` or `grid-cols-3` with identical items | Vary column widths: 5/7 + 2/7, or 2/3 + 1/3. Use asymmetric layouts. |
| Identical card heights | All cards forced to same `min-h` or `h-[300px]` | Let content dictate height. Use masonry layout or vary internal padding. |
| Centered everything | `text-center` applied to every section and paragraph | Left-align body text. Center only headlines, CTAs, and short taglines. |
| Drop shadow on everything | `shadow-md` or `shadow-lg` on all cards, buttons, and containers | Use tinted shadows selectively. Vary intensity by element importance. Reserve `shadow-lg` for primary CTAs only. |
| Generic hero pattern | Large heading + subtext + single button + stock photo in a symmetric layout | Use asymmetric layout. Real product shots. Split headline across lines with varied weight. Add secondary CTA or social proof element. |
| Round avatar circles | All avatars `rounded-full` at identical sizes | Vary sizes (32px, 40px, 48px). Use `rounded-xl` for some. Add status indicators or ring borders. |
| Divider lines between sections | `<hr>` or `border-b` separating every section | Use whitespace and background color changes to delineate sections. Reserve dividers for within-section separation only. |
| Uniform border radius | Every element uses `rounded-lg` or `rounded-xl` | Vary: `rounded-2xl` for cards, `rounded-full` for CTAs, `rounded-lg` for inputs, sharp corners for accents. |
| Identical icon styling | Every icon same size, same color, same container | Vary icon sizes (20–32px). Alternate brand colors. Mix contained (with bg) and inline styles. |

## Layout Slop Patterns

| Pattern | How to Detect | Fix |
|---------|--------------|-----|
| Predictable section flow | Page follows: hero → features → testimonials → pricing → CTA | Break the pattern. Insert testimonial between pain point and solution. Place CTA after the strongest proof point. Vary section types. |
| Symmetric padding everywhere | Every section uses identical `py-16` or `py-24` | Vary padding: tight (py-8) after related content, generous (py-20) before new topics. Use clamp() for responsive variation. |
| Three-column feature grid | 3 equal cards with icon + title + description as the only layout | Use 2+1 layout, alternating left-right rows, bento grid, or stacked list format. Mix visual treatments. |
| Footer link dump | 4 equal columns of plain text links | Group links meaningfully. Vary visual weight. Add brand element (logo, tagline). Include a CTA column. |
| Cookie-cutter mobile | Mobile is just desktop columns stacked vertically | Design mobile-specific layouts. Prioritize content differently. Use horizontal scroll for card groups. Collapse secondary content. |
| Centered single-column everything | Every section is `max-w-4xl mx-auto text-center` | Use full-width backgrounds with contained content. Off-center elements. Side-by-side layouts that stack on mobile. |

## Content Slop Patterns

| Pattern | Example | Fix |
|---------|---------|-----|
| AI superlatives | "Revolutionary", "Game-changing", "Cutting-edge" | Specific claims: "Cuts response time from 4 hours to 12 minutes" |
| Vague social proof | "Trusted by 1,000+ companies" | Name actual clients: "Used by Brian Pieri, Kenneth Krell, and 247 agency owners" |
| Generic testimonials | "Great product! — John D." | Full name, company, specific result: "Booked 47 calls in 30 days — Brian Pieri, Agency Owner" |
| Emoji bullet points | Rocket/muscle/sparkle emoji as bullets | Lucide icons with brand color tinting in 10% opacity backgrounds |
| Round numbers | "100+ clients", "10x growth" | Specific: "247 clients", "8.3x average ROI" |
| Filler paragraphs | Long text with no specific information | Cut to 1–2 sentences with concrete details |
| Buzzword stacking | "AI-powered machine learning platform leveraging cutting-edge technology" | One clear descriptor: "Finds verified B2B emails in under 3 seconds" |
| Fake urgency | "Limited time offer!", "Only 3 spots left!" (when untrue) | Genuine urgency only: real deadlines, actual enrollment caps, honest bonus expirations |
| Feature lists as benefits | "Built with React", "Uses PostgreSQL" | Translate to outcomes: "Loads in under 1 second", "Your data is never lost" |
| Placeholder remnants | Any Lorem ipsum or "Coming soon" in production | Always use real copy. Even a rough draft is better than placeholder. |

## Code Slop Patterns

| Pattern | How to Detect | Fix |
|---------|--------------|-----|
| z-index wars | `z-index: 9999` or values above 50 | Follow discipline scale: 0–9 base, 10–19 dropdown, 20–29 sticky, 30–39 modal, 40–49 toast |
| `!important` everywhere | More than 2 `!important` declarations per file | Fix CSS specificity properly. Use Tailwind's built-in specificity. |
| Inline style positioning | `style={{ position: 'absolute', top: 20, left: 30 }}` | Use Tailwind classes: `absolute top-5 left-[30px]` |
| Animation on everything | `motion.div` wrapping every single element | Animate only meaningful state changes: entrances, interactions, feedback. Static content stays static. |
| Hardcoded hex colors | `style={{ color: '#ED0D51' }}` or scattered hex in className | Use Tailwind classes (`text-[#ED0D51]`) or CSS variables consistently |
| Giant component files | Single component file exceeding 300 lines | Extract sections into sub-components. Each component: one responsibility. |
| Nested ternaries | `condition ? (another ? a : b) : (yet ? c : d)` | Use if/else blocks or switch statements. Extract to helper function. |
| Prop drilling | Props passed through 3+ component layers | Use React context, composition pattern, or co-locate state closer to usage |
| Copy-pasted sections | Near-identical code blocks repeated 3+ times | Extract to reusable component with props for variations |
| Unused imports/variables | Imported but never referenced | Remove immediately. Dead code is confusion. |

## Detection Workflow

1. **Visual scan** — Open page at 1440px and 375px. Note anything that feels "template-y"
2. **Content scan** — Read all text. Flag superlatives, vague claims, round numbers, placeholder text
3. **Code scan** — Search for: `shadow-md` count, `text-center` count, `z-index` values, `!important` count, inline styles
4. **Layout scan** — Check section padding values. Count symmetric vs asymmetric elements. Verify mobile is not just stacked desktop.
5. **Interaction scan** — Hover every clickable element. Tab through the page. Check loading/empty/error states exist.
