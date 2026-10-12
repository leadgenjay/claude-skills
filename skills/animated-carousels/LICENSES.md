# Licences of bundled third-party files

## Fonts: SIL Open Font License 1.1

`library/fonts/` ships three families, unmodified, each under the SIL Open Font License 1.1, which
allows redistribution with the licence attached. The full licence and the three copyright notices
are in `library/fonts/OFL.txt`.

| File | Family | Copyright |
|---|---|---|
| `BigShouldersDisplay.woff2` | Big Shoulders Display | 2019 The Big Shoulders Project Authors |
| `Manrope.woff2` | Manrope | 2018 The Manrope Project Authors |
| `GeistMono.woff2` | Geist Mono | 2024 The Geist Project Authors |

None of the three declares a Reserved Font Name.

## GSAP 3.14.2

`library/motion/vendor/gsap.min.js` is GSAP 3.14.2, vendored unmodified with its licence header,
under the GSAP Standard License (https://gsap.com/standard-license), which makes GSAP free to use,
including commercially. Your use of it is governed by that licence.

## Component sources

The CSS components are original hand-written CSS. Some port MIT-licensed code (Magic UI, shadcn/ui)
and some were drawn after the look of public 21st.dev components; no third-party screenshot or
component source file ships. `references/library.md`, "Sources", lists each one.

## HyperFrames, Playwright, sharp

Installed from npm by `npm install`, not bundled. HyperFrames is Apache-2.0, Playwright is
Apache-2.0, sharp is Apache-2.0.
