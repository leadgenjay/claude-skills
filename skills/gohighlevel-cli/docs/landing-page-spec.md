# Compact landing-page specification

For new pages, start with the opinionated templates and design-quality gate:

```bash
./ghl funnels templates
./ghl funnels init-template vsl --theme otter --output page.json
./ghl funnels lint page.json
./ghl funnels preview page.json --output page-preview.html
```

See `docs/landing-page-design-system.md` for typography, spacing, alignment,
graphics, icons, form, pricing, popup, and template rules.

For the underlying schema, start with `examples/landing-page-kitchen-sink.example.json`. A page contains
`sections[] → rows[] → columns[] → elements[]`. The adapter expands that hierarchy
into GHL's flat builder-v2 node graph and generates the CSS artifacts required by the
editor.

## Page and container fields

- Page: `name`, `path`, `designSystem`, `primaryColor`, `headlineFont`, `contentFont`, `customCss`,
  `trackingCode`, `seo`, `popup`, `sections`.
- Section: `name`, desktop and `mobilePadding*` fields, `compact`, `background`, `backgroundImage`,
  `backgroundVideo`, `backgroundOpacity`, `backgroundSize`, `maxWidth`, `sticky`,
  `hideDesktop`, `hideMobile`, `customClass`, `rows`.
- Row: padding/background/visibility fields, `width`, `customClass`, `columns`.
- Column: `width`, padding/background/visibility fields, `layout`, `justify`,
  `alignItems`, `stackOnMobile`, `customClass`, `elements`.

## First-class elements

| `type` | Principal compact fields |
|---|---|
| `heading`, `subHeading`, `paragraph` | `text` or `html`, `fontSize`, `mobileFontSize`, `color`, `align` |
| `bulletList` | `items[]` or `html`, font/color/icon fields |
| `button` | `text`, `subText`, `action`, `url`, `newTab`, `scrollToElement`, color/font fields |
| `image` | `url`, `alt`, `width`, `link`, `newTab` |
| `video` | `url`, `videoType`, `autoplay`, `controls`, `thumbnail`, `width` |
| `divider` | `width`, `height`, `color`, `align` |
| `form`, `survey`, `calendar` | matching `formId`, `surveyId`, or `calendarId`; `name`, `action`, `redirectUrl` |
| `countdown` | Fixed deadline: required `endDate`; optional `endTime`, `timezone`, `language`, expiration fields |
| `timer` | Evergreen minute timer: `hours`, `minutes`, `seconds`, `timezone`, expiration/revisit fields |
| `faq` | `items[]` with question/answer or heading/text, layout/font fields |
| `logoShowcase` | `logos[]`, `mode`, `logoWidth`, animation/spacing fields |
| `customCode` | `html`, `script` |
| `oneStepOrder`, `twoStepOrder` | labels, product-selection flags, coupons, order bumps, sale action |
| `orderConfirmation` | title/table/shipping labels and visibility |

## Native element escape hatch

GHL continuously adds widgets. Any native element—including navigation, maps, SVG,
progress bars, galleries, reviews, blog/store widgets, upsells, or marketplace
components—can be round-tripped without waiting for a dedicated compact adapter:

```bash
./ghl --experimental --json funnels elements PAGE_ID
./ghl --experimental funnels export-element PAGE_ID ELEMENT_ID --output native.json
```

The exported file is already shaped as:

```json
{"type": "native", "node": {"type": "element", "meta": "..."}}
```

Insert it into any column's `elements` list. A fresh element ID is assigned during
generation.

## Advanced overrides

Every first-class element accepts GHL-native `class`, `styles`, `extra`, `wrapper`,
`mobileStyles`, and `customCss` dictionaries. These are deep-merged after compact
defaults, enabling controls such as animations, shadows, gradients, breakpoint
styles, advanced actions, and new properties introduced by GHL.

`set-content` automatically backs up the current draft to `.ghl-backups/` unless
`--backup-output` selects another path. Treat the real GHL draft preview as the
source of truth; the local `funnels preview` is advisory. Before finishing, use
`test-improve` to personally inspect full-page PNGs at 1440x900, 768x1024, and
393x852, run two non-submitting interaction passes, pass the WebKit/mobile-overflow
and above-fold opt-in gates, then open the real preview. Default fonts are Inter
700 headlines and Roboto 400/500 body/UI. True single-column rows center every
child block and copy. Never use `--publish` without explicit user authorization.
