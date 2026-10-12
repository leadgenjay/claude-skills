#!/usr/bin/env node
/**
 * Render carousel slides authored as HTML to 1080x1440 PNGs, and check them.
 *
 *   node library/render.mjs <dir> [--copy <copy.json>] [--only 3,5]
 *
 * <dir> holds slide-NN.html. Each writes slide-NN.png next to it. Checks, all blocking:
 *   - every face the slide's visible text is set in (family + weight + style, read from the
 *     computed style) is one of the faces shipped in fonts/fonts.css AND has loaded. A slide
 *     whose text uses no face at all fails too, so the check can never pass vacuously
 *   - output is exactly 1080x1440
 *   - every [data-copy="<pos>.<field>"] element's text equals copy.json slides[pos][field]
 *   - every copy.json headline and body is placed on its slide (nothing dropped)
 *   - no visible text outside [data-copy] or [data-ui] (UI chrome inside a recreation or capture)
 *   - no element marked [data-copy] or [data-box] overflows itself or the 60px safe margin
 *   - no em or en dash anywhere in the document text
 * Exit 0 only when every slide passes. A report is written to <dir>/render-report.json.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import sharp from 'sharp'

const args = process.argv.slice(2)
const dir = args[0] && resolve(args[0])
if (!dir || !existsSync(dir)) {
  console.error('usage: render.mjs <dir> [--copy copy.json] [--only 3,5]')
  process.exit(2)
}
const opt = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const copyPath = opt('--copy')
const copy = copyPath ? JSON.parse(readFileSync(copyPath, 'utf8')) : null
const only = opt('--only')?.split(',').map(Number)

const W = 1080
const H = 1440
const SAFE = 60
// The allowlist is whatever fonts/fonts.css ships: family|weight|style per @font-face.
const fontsCss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'fonts', 'fonts.css'), 'utf8')
const SHIPPED = new Set(
  [...fontsCss.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, body]) => {
    const get = (k) => body.match(new RegExp(`${k}\\s*:\\s*([^;]+)`))?.[1].trim().replace(/^["']|["']$/g, '')
    return `${get('font-family')}|${get('font-weight') ?? '400'}|${get('font-style') ?? 'normal'}`
  }),
)
const SYSTEM_UI = new Set(['-apple-system', 'system-ui', 'BlinkMacSystemFont'])
if (SHIPPED.size === 0) {
  console.error('render.mjs: no @font-face found in fonts/fonts.css, refusing to run an empty allowlist')
  process.exit(2)
}
const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()

const files = readdirSync(dir)
  .filter((f) => /^slide-\d{2}\.html$/.test(f))
  .filter((f) => !only || only.includes(Number(f.slice(6, 8))))
  .sort()
if (files.length === 0) {
  console.error(`no slide-NN.html in ${dir}`)
  process.exit(2)
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
const report = []
let failed = 0

for (const f of files) {
  const n = Number(f.slice(6, 8))
  const problems = []
  await page.goto(pathToFileURL(join(dir, f)).href, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(150)

  // document.fonts.check() answers true for a family that has no @font-face at all, so it
  // cannot prove anything on its own. Read the faces the text actually uses, then require
  // each to be shipped (allowlist) and present in document.fonts with status "loaded".
  const faces = await page.evaluate(() => {
    const used = new Map()
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const t = walker.currentNode
      const el = t.parentElement
      if (!t.textContent.trim() || !el) continue
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden' || cs.opacity === '0') continue
      const family = cs.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '')
      const face = { family, weight: String(cs.fontWeight), style: cs.fontStyle === 'normal' ? 'normal' : cs.fontStyle }
      const key = `${face.family}|${face.weight}|${face.style}`
      // A face counts as chrome-only while every use of it sits inside [data-ui].
      const chrome = !!el.closest('[data-ui]')
      used.set(key, { ...face, chrome: (used.get(key)?.chrome ?? true) && chrome })
    }
    const loaded = new Set()
    for (const f of document.fonts) {
      if (f.status === 'loaded') loaded.add(`${f.family.replace(/^["']|["']$/g, '')}|${f.weight}|${f.style}`)
    }
    return [...used.values()].map((f) => ({ ...f, loaded: loaded.has(`${f.family}|${f.weight}|${f.style}`) }))
  })
  if (faces.length === 0) problems.push('no font face derived from the slide text, so the font check would prove nothing')
  for (const f of faces) {
    const id = `${f.family} ${f.weight}${f.style === 'normal' ? '' : ` ${f.style}`}`
    // Recreated device chrome (a phone status bar) may be set in the platform font on purpose.
    // Allowed only inside [data-ui]; any copy set in it still fails.
    if (f.chrome && SYSTEM_UI.has(f.family)) continue
    if (!SHIPPED.has(`${f.family}|${f.weight}|${f.style}`)) problems.push(`font not shipped in fonts/fonts.css: ${id}`)
    else if (!f.loaded) problems.push(`font not loaded: ${id}`)
  }

  const scan = await page.evaluate(({ SAFE, W, H }) => {
    const out = { copy: [], stray: [], overflow: [], dashes: [] }
    const visible = (el) => {
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.opacity !== '0'
    }
    for (const el of document.querySelectorAll('[data-copy]')) {
      out.copy.push({ key: el.dataset.copy, text: el.textContent })
    }
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const t = walker.currentNode
      if (!t.textContent.trim()) continue
      const host = t.parentElement
      if (!host || !visible(host)) continue
      if (/[\u2013\u2014]/.test(t.textContent)) out.dashes.push(t.textContent.trim().slice(0, 60))
      if (!host.closest('[data-copy],[data-ui]')) out.stray.push(t.textContent.trim().slice(0, 60))
    }
    for (const el of document.querySelectorAll('[data-copy],[data-box]')) {
      if (!visible(el)) continue
      const r = el.getBoundingClientRect()
      const label = el.dataset.copy || el.dataset.box
      if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) {
        out.overflow.push(`${label}: content overflows its box`)
      }
      if (!el.hasAttribute('data-bleed') &&
          (r.left < SAFE - 0.5 || r.top < SAFE - 0.5 || r.right > W - SAFE + 0.5 || r.bottom > H - SAFE + 0.5)) {
        out.overflow.push(`${label}: outside the ${SAFE}px safe margin`)
      }
    }
    return out
  }, { SAFE, W, H })

  if (copy) {
    const slide = copy.slides.find((s) => s.position === n - 1)
    for (const c of scan.copy) {
      const [pos, field] = c.key.split('.')
      const want = copy.slides.find((s) => s.position === Number(pos))?.[field]
      if (want === undefined) problems.push(`data-copy="${c.key}" has no copy.json entry`)
      else if (norm(c.text) !== norm(want)) problems.push(`text mismatch on ${c.key}: "${norm(c.text)}" vs copy "${norm(want)}"`)
    }
    if (slide) {
      /* rehook: the line leading into the next slide (references/copy-formula.md, rehooks). Required on the
         slide whenever copy.json carries one, the same as headline and body. */
      for (const field of ['headline', 'body', 'rehook']) {
        if (norm(slide[field]) && !scan.copy.some((c) => c.key === `${n - 1}.${field}`)) {
          problems.push(`copy ${n - 1}.${field} is not placed on the slide`)
        }
      }
    }
  }
  for (const s of scan.stray) problems.push(`text outside data-copy/data-ui: "${s}"`)
  for (const o of scan.overflow) problems.push(o)
  for (const d of scan.dashes) problems.push(`dash in text: "${d}"`)

  const png = join(dir, f.replace('.html', '.png'))
  await page.screenshot({ path: png, clip: { x: 0, y: 0, width: W, height: H } })
  const meta = await sharp(png).metadata()
  if (meta.width !== W || meta.height !== H) problems.push(`png is ${meta.width}x${meta.height}`)

  // An animated slide (motion/motion.js) stamps <html data-settled> once it has jumped to its
  // rest state. Recorded, not judged: animate.mjs refuses a settle pass that lacks "1".
  const settled = await page.evaluate(() => document.documentElement.getAttribute('data-settled'))
  // Every visible string in document order, copy and UI chrome alike. animate.mjs snapshots it
  // with the approved still and requires the settled slide to read exactly the same, because a
  // one-letter change in a terminal line is too few pixels for any image diff to see.
  const text = await page.evaluate(() => {
    const out = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const t = walker.currentNode
      const el = t.parentElement
      const s = t.textContent.replace(/\s+/g, ' ').trim()
      if (!s || !el) continue
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden' || cs.opacity === '0') continue
      out.push(s)
    }
    return out
  })

  if (problems.length) failed += 1
  report.push({ slide: f, png, ok: problems.length === 0, problems, settled, text })
  console.log(`${problems.length ? 'FAIL' : 'PASS'}  ${f}`)
  for (const p of problems) console.log(`      ${p}`)
}

await browser.close()
writeFileSync(join(dir, 'render-report.json'), JSON.stringify(report, null, 2))
process.exit(failed ? 1 : 0)
