// node --test library/test/animate.test.mjs
// Spawns the real animate.mjs (render.mjs, HyperFrames, ffmpeg). Slow: five cases render video,
// about 50s a slide. Needs Playwright's Chromium, ffmpeg and ffprobe.
//
// Each case copies fixtures/animated-ok to fixtures/.tmp-<case>/ (same depth, so the slide's
// relative links still reach the library), renders its approved still from still/slide-01.html,
// applies one mutation, and runs animate.mjs on it.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, copyFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { firstMoveFraction, lintLoneHide, probeMp4, relinkHtml, wrapComposition, Refusal, T } from '../animate.mjs'

const LIB = join(dirname(fileURLToPath(import.meta.url)), '..')
const FIX = join(LIB, 'test', 'fixtures')
const OK = join(FIX, 'animated-ok')
const made = []
let stillPng

before(() => {
  // The approved still, rendered once from the motion-free source.
  const d = join(FIX, '.tmp-still')
  rmSync(d, { recursive: true, force: true })
  cpSync(OK, d, { recursive: true })
  made.push(d)
  const r = spawnSync(process.execPath, [join(LIB, 'render.mjs'), join(d, 'still'), '--copy', join(d, 'copy.json')], { encoding: 'utf8' })
  assert.equal(r.status, 0, r.stdout + r.stderr)
  stillPng = join(d, 'still', 'slide-01.png')
})

after(() => { for (const d of made) rmSync(d, { recursive: true, force: true }) })

/** A fresh case dir; mutate({ slide, copy }) edits the slide HTML string and copy.json object. */
function makeCase(name, mutate = (x) => x) {
  const d = join(FIX, `.tmp-${name}`)
  rmSync(d, { recursive: true, force: true })
  cpSync(OK, d, { recursive: true })
  made.push(d)
  copyFileSync(stillPng, join(d, 'slides', 'slide-01.png'))
  copyFileSync(join(dirname(stillPng), 'render-report.json'), join(d, 'slides', 'render-report.json'))
  const slidePath = join(d, 'slides', 'slide-01.html')
  const copyPath = join(d, 'copy.json')
  const out = mutate({ slide: readFileSync(slidePath, 'utf8'), copy: JSON.parse(readFileSync(copyPath, 'utf8')) })
  writeFileSync(slidePath, out.slide)
  writeFileSync(copyPath, JSON.stringify(out.copy, null, 2))
  return d
}

function animate(d, extra = [], env = {}) {
  const r = spawnSync(process.execPath, [join(LIB, 'animate.mjs'), join(d, 'slides'), '--copy', join(d, 'copy.json'), ...extra],
    { encoding: 'utf8', env: { ...process.env, ...env }, timeout: 600000 })
  const rp = join(d, 'video', 'animate-report.json')
  return { status: r.status, out: r.stdout + r.stderr, report: existsSync(rp) ? JSON.parse(readFileSync(rp, 'utf8')) : null }
}

const inject = (html, snippet) => html.replace('</body>', `${snippet}\n</body>`)

/** Add slide-02: the motion-free still source with only the ambient rays, which loop seamlessly. */
function addAmbientSlide(d) {
  const still = readFileSync(join(d, 'still', 'slide-01.html'), 'utf8')
  writeFileSync(join(d, 'slides', 'slide-02.html'), inject(
    still.replace('</head>', '<link rel="stylesheet" href="../../../../motion/rays.css">\n</head>'),
    '<script src="../../../../motion/vendor/gsap.min.js"></script>\n<script src="../../../../motion/motion.js"></script>'))
  copyFileSync(join(d, 'slides', 'slide-01.png'), join(d, 'slides', 'slide-02.png'))
  const rp = join(d, 'slides', 'render-report.json')
  const stills = JSON.parse(readFileSync(rp, 'utf8'))
  stills.push({ ...stills.find((r) => r.slide === 'slide-01.html'), slide: 'slide-02.html' })
  writeFileSync(rp, JSON.stringify(stills, null, 2))
}

// Unit checks on the pure pieces.

test('lint: a lone hide is flagged, a hide with a show is not', () => {
  assert.equal(lintLoneHide('<script>tl.set(el, { visibility: "hidden" }, 2)</script>').length, 1)
  assert.equal(lintLoneHide('<script>tl.set(el, { visibility: "visible" }, 0); tl.set(el, { visibility: "hidden" }, 2)</script>').length, 0)
})

test('wrap: links become project-root paths; a link outside the root is refused', () => {
  const html = '<html lang="en"><head><link rel="stylesheet" href="../lib/tokens.css"></head><body><div class="slide"></div><img src="data:image/png;base64,AA"></body></html>'
  const out = wrapComposition(html, 6, '/r/out/c/slides', '/r')
  assert.match(out, /href="out\/c\/lib\/tokens\.css"/)
  assert.match(out, /src="data:image\/png;base64,AA"/)
  assert.match(out, /<html lang="en" data-animate>/)
  assert.match(out, /data-composition-id="main"[^>]*data-duration="6"/)
  assert.throws(() => wrapComposition(html, 6, '/r/slides', '/r/slides'), Refusal)
})

test('relink: a settle copy in a sibling folder still reaches slide-local files', () => {
  const html = '<link rel="stylesheet" href="mini.css"><link rel="stylesheet" href="../../lib/x.css"><img src="assets/a.png"><img src="../assets/b.png"><a href="#top"></a><img src="data:image/png;base64,AA">'
  const out = relinkHtml(html, '/r/out/c/slides', '/r/out/c/.settle')
  assert.match(out, /href="\.\.\/slides\/mini\.css"/)
  assert.match(out, /href="\.\.\/\.\.\/lib\/x\.css"/)
  assert.match(out, /src="\.\.\/slides\/assets\/a\.png"/)
  assert.match(out, /src="\.\.\/assets\/b\.png"/)
  assert.match(out, /href="#top"/)
  assert.match(out, /src="data:image\/png;base64,AA"/)
})

test('motion files: every motion file starts and ends on its still', () => {
  const files = readdirSync(join(LIB, 'motion')).filter((f) => f.endsWith('.css'))
  for (const want of ['rays.css', 'gridsq.css', 'glowgrid.css', 'next-teaser.css']) assert.ok(files.includes(want), want)
  for (const f of files) {
    const css = readFileSync(join(LIB, 'motion', f), 'utf8')
    const frames = [...css.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?)\n\}/g)]
    assert.ok(frames.length > 0, `${f} has no @keyframes`)
    for (const [, name, body] of frames) {
      // 0% and 100% share one rule, so the loop has no seam and settle lands on the still.
      assert.match(body, /(^|\n)\s*0%\s*,\s*100%\s*\{/, `${f} @keyframes ${name}: 0% and 100% are not one rule`)
    }
    assert.match(css, /animation:[^;]*\b1\b[^;]*\bboth\b/, `${f}: not one finite pass with fill both`)
  }
})

// The swipe arrow nudges during the hold only. An earlier version moved at 37.5%,
// which is 2.25s of 6s, inside the build.
test('next-teaser: the arrow first moves after the build at the default duration', () => {
  // Motion starts at the rest keyframe before the first moved one (30%), not at the moved one.
  assert.equal(firstMoveFraction('@keyframes x {\n  0%, 30%, 100% { transform: none; }\n  37.5%, 67.5% { transform: translateX(16px); }\n}'), 0.3)
  assert.equal(firstMoveFraction('@keyframes x {\n  0%, 100% { transform: none; }\n  50% { transform: translateX(4px); }\n}'), 0)
  const at = firstMoveFraction(readFileSync(join(LIB, 'motion', 'next-teaser.css'), 'utf8'))
  assert.ok(at * T.defaultDuration >= T.settleBy, `first move at ${at * T.defaultDuration}s`)
})

test('animate: a slide with the swipe arrow is refused when the clip is too short for it', () => {
  const d = makeCase('teaser-short', ({ slide, copy }) => ({
    copy,
    slide: slide.replace('</head>', '<link rel="stylesheet" href="../../../../motion/next-teaser.css">\n</head>'),
  }))
  const { status, out } = animate(d, ['--duration', '4'])
  assert.equal(status, 2, out)
  assert.match(out, /swipe arrow would first move at 1\.80s, inside the 2\.5s build; use --duration 6 or more/)
})

test('probe: an MP4 with an audio stream is refused', () => {
  const d = mkdtempSync(join(tmpdir(), 'anim-probe-'))
  try {
    const f = join(d, 'a.mp4')
    const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=white:s=1080x1440:d=4', '-f', 'lavfi', '-i', 'sine=d=4',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', f], { encoding: 'utf8' })
    assert.equal(r.status, 0, r.stderr)
    assert.ok(probeMp4(f, 4).some((p) => /audio stream/.test(p)))
  } finally {
    rmSync(d, { recursive: true, force: true })
  }
})

// End to end. The good fixture first, through the retry path.

test('animate: the fixture passes, after retrying a corrupt first render, and logs the retry', () => {
  const d = makeCase('ok')
  const { status, out, report } = animate(d, [], { ANIMATE_FAULT: 'corrupt-first' })
  assert.equal(status, 0, out)
  assert.equal(report.complete, true)
  const s = report.slides[0]
  assert.equal(s.checks.retries.length, 1, JSON.stringify(s.checks.retries))
  assert.match(s.checks.retries[0].problem, /does not decode/)
  assert.ok(s.checks.settledDiffPct <= 0.01)
  assert.ok(s.checks.determinismWorstPct <= 0.01, String(s.checks.determinismWorstPct))
  assert.deepEqual(probeMp4(s.mp4, 6), [])
  for (const f of [s.poster, s.preview, s.sheet]) assert.ok(existsSync(f), f)
  assert.ok(existsSync(join(d, 'stills', 'manifest.json')))
  assert.equal(readFileSync(join(d, 'slides', 'slide-01.png')).equals(readFileSync(join(d, 'stills', 'slide-01.png'))), true)
  assert.equal(s.stillSha256, createHash('sha256').update(readFileSync(join(d, 'slides', 'slide-01.png'))).digest('hex'))

  // A refused re-run must not leave this complete: true report on disk for filing to trust.
  const copyPath = join(d, 'copy.json')
  writeFileSync(copyPath, JSON.stringify({ slides: JSON.parse(readFileSync(copyPath, 'utf8')).slides }, null, 2))
  const rerun = animate(d)
  assert.equal(rerun.status, 2, rerun.out)
  assert.notEqual(rerun.report?.complete, true, JSON.stringify(rerun.report))
})

// Negative controls that fail before any video renders.

for (const [name, mutate, want] of [
  ['rest-differs', ({ slide, copy }) => ({ copy, slide: slide.replace('</head>', '<style>.slide.bg-rays::before{animation-name:x-rest}@keyframes x-rest{0%,100%{opacity:.3}}</style></head>') }),
    /settled frame differs from the approved still/],
  ['typed-differs', ({ slide, copy }) => ({ copy, slide: slide.replace('check my inbox</span>', 'check my lnbox</span>') }),
    /settled slide text differs from the approved still: "check my lnbox" where the still reads "check my inbox"/],
  ['lone-hide', ({ slide, copy }) => ({ copy, slide: inject(slide, '<script>window.__timelines.main.set(".tui", { visibility: "hidden" }, 3)</script>') }),
    /lone-hide/],
  ['late-motion', ({ slide, copy }) => ({ copy, slide: slide.replace('data-motion="rise" data-at="1.4"', 'data-motion="rise" data-at="2.4"') }),
    /choreography still running until 2\.95s/],
  // A highlight sweep is part of the build: 2.4s + its 0.6s sweep.
  ['late-select', ({ slide, copy }) => ({ copy, slide: slide.replace('<span class="sel" data-component="highlighter">', '<span class="sel" data-component="highlighter" data-motion="select" data-at="2.4">') }),
    /choreography still running until 3\.00s/],
  // reselect: clears for 0.35s, sweeps back on from +0.45s for 0.6s.
  ['late-reselect', ({ slide, copy }) => ({ copy, slide: slide.replace('<span class="sel" data-component="highlighter">', '<span class="sel" data-component="highlighter" data-motion="reselect" data-at="2.0">') }),
    /choreography still running until 3\.05s/],
  ['no-sentinel', ({ slide, copy }) => ({ copy, slide: inject(slide, '<script>document.documentElement.removeAttribute("data-settled")</script>') }),
    /settle sentinel is null/],
  // The reverse outro is exempt from settleBy, the build is not.
  ['return-late-build', ({ slide, copy }) => ({ copy: { ...copy, motion: { loop: 'return' } }, slide: slide.replace('data-motion="rise" data-at="1.4"', 'data-motion="rise" data-at="2.4"') }),
    /choreography still running until 2\.95s/],
]) {
  test(`animate: ${name} fails`, () => {
    const { status, out } = animate(makeCase(name, mutate))
    assert.equal(status, 1, out)
    assert.match(out, want)
  })
}

for (const [name, mutate, want] of [
  ['no-loop', ({ slide, copy }) => ({ slide, copy: { slides: copy.slides } }), /copy\.json has no motion\.loop/],
  ['bad-slide-loop', ({ slide, copy }) => ({ slide, copy: { ...copy, slides: copy.slides.map((s) => ({ ...s, motion: { loop: 'bounce' } })) } }),
    /slide-01\.html: copy\.json slides position 0 motion\.loop is "bounce"/],
]) {
  test(`animate: ${name} is refused`, () => {
    const { status, out } = animate(makeCase(name, mutate))
    assert.equal(status, 2, out)
    assert.match(out, want)
  })
}

test('animate: a still changed after the snapshot is refused; --refresh-stills archives the old copy', () => {
  const d = makeCase('drift', ({ slide, copy }) => ({ copy, slide: slide.replace('data-motion="rise" data-at="1.4"', 'data-motion="rise" data-at="2.4"') }))
  assert.equal(animate(d).status, 1) // late-motion fails fast, after taking the snapshot
  copyFileSync(join(d, '.settle', 'slide-01.png'), join(d, 'slides', 'slide-01.png'))
  const r = animate(d)
  assert.equal(r.status, 2, r.out)
  assert.match(r.out, /changed since stills\/ was taken/)
  const r2 = animate(d, ['--refresh-stills'])
  assert.equal(r2.status, 1, r2.out) // past the refusal, failing on its late motion again
  assert.ok(readdirSync(d).some((f) => f.startsWith('stills-')))
})

// Negative controls that need a render.

test('animate: a broken loop seam fails when the style is seamless', () => {
  const { status, out } = animate(makeCase('seam', ({ slide, copy }) => ({ slide, copy: { ...copy, motion: { loop: 'seamless' } } })))
  assert.equal(status, 1, out)
  assert.match(out, /loop seam \(seamless\): last frame differs from the first/)
})

// The same slide as the seam failure above, so a pass here means the build really played back out.
test('animate: a "return" loop reverses the build before the end and passes the seam check', () => {
  const d = makeCase('return', ({ slide, copy }) => ({ slide, copy: { ...copy, motion: { loop: 'return' } } }))
  const { status, out, report } = animate(d)
  assert.equal(status, 0, out)
  assert.equal(report.complete, true)
  const s = report.slides[0]
  assert.equal(s.loop, 'return')
  assert.equal(typeof s.checks.seamPct, 'number')
  assert.ok(s.checks.seamPct <= 0.01, String(s.checks.seamPct))
  assert.ok(Math.abs(s.checks.timelineEnd - 1.95) < 1e-6, String(s.checks.timelineEnd)) // the build, not the outro
  assert.ok(s.checks.settledDiffPct <= 0.01)
  assert.match(readFileSync(join(d, '.settle', 'slide-01.anim.html'), 'utf8'), /<html[^>]*data-loop="return"/)
  assert.match(readFileSync(join(d, '.settle', 'slide-01.html'), 'utf8'), /<html[^>]*data-loop="return"/)
})

test('animate: a slide\'s own motion.loop overrides the set', () => {
  const d = makeCase('mixed', ({ slide, copy }) => ({ slide, copy: { ...copy, slides: [...copy.slides, { position: 1, motion: { loop: 'seamless' } }] } }))
  addAmbientSlide(d)
  const { status, out, report } = animate(d)
  assert.equal(status, 0, out)
  assert.equal(report.complete, true)
  assert.equal(report.loop, 'jump')
  const [built, ambient] = report.slides
  assert.equal(built.loop, 'jump')
  assert.match(built.checks.seamPct, /^skipped/)
  assert.equal(ambient.slide, 'slide-02.html')
  assert.equal(ambient.loop, 'seamless')
  assert.deepEqual(ambient.problems, [])
  assert.equal(typeof ambient.checks.seamPct, 'number')
  assert.ok(ambient.checks.seamPct <= T.maxDiffPct, String(ambient.checks.seamPct))
})

// The settle copies live in a sibling of slides/; a stylesheet beside the slide must still load
// there (it did not, and the unstyled frame failed the settled diff by 14%). The highlight sweep
// must come to rest fully drawn, as in the still.
test('animate: a slide-local stylesheet and a select sweep both settle on the still', () => {
  const d = makeCase('local', ({ slide, copy }) => ({
    copy,
    slide: slide
      .replace('href="../../../../components/tui.css"', 'href="tui.css"')
      .replace('<span class="sel" data-component="highlighter">', '<span class="sel" data-component="highlighter" data-motion="select" data-at="0.15">'),
  }))
  copyFileSync(join(LIB, 'components', 'tui.css'), join(d, 'slides', 'tui.css'))
  const { status, out, report } = animate(d)
  assert.equal(status, 0, out)
  assert.equal(report.complete, true)
  assert.ok(report.slides[0].checks.settledDiffPct <= 0.01, String(report.slides[0].checks.settledDiffPct))
  assert.match(readFileSync(join(d, '.settle', 'slide-01.html'), 'utf8'), /href="\.\.\/slides\/tui-terminal\.css"/)
})

// The same slide fails the seam when it builds in (the seamless test above); with only a reselect
// it starts and ends on the still, so a cover can move and still loop without a jump.
test('animate: a reselect sweep keeps frame 0 on the still and passes a seamless loop', () => {
  const d = makeCase('reselect', ({ slide, copy }) => ({
    copy: { ...copy, motion: { loop: 'seamless' } },
    slide: slide.replace(/\s+data-motion="(type|rise|pop)"\s+data-at="[0-9.]+"/g, '')
      .replace('<span class="sel" data-component="highlighter">', '<span class="sel" data-component="highlighter" data-motion="reselect" data-at="0.6">'),
  }))
  const { status, out, report } = animate(d)
  assert.equal(status, 0, out)
  const s = report.slides[0]
  assert.equal(typeof s.checks.seamPct, 'number')
  assert.ok(s.checks.seamPct <= T.maxDiffPct, String(s.checks.seamPct))
  assert.ok(Math.abs(s.checks.timelineEnd - 1.65) < 1e-6, String(s.checks.timelineEnd))
})

test('animate: a slide that draws random values only while animating fails determinism', () => {
  const { status, out } = animate(makeCase('nondeterministic', ({ slide, copy }) => ({
    copy,
    slide: inject(slide.replace('<div class="tui-tabs">', '<div class="tui-tabs"><span data-ui id="nd" style="position:absolute;right:20px;font-size:27px"></span>'),
      '<script>if (document.documentElement.hasAttribute("data-animate")) document.getElementById("nd").textContent = crypto.getRandomValues(new Uint32Array(1))[0]</script>'),
  })))
  assert.equal(status, 1, out)
  assert.match(out, /not deterministic/)
})

// The swipe cue on a real slide: the arrow nudges during the hold, the slide still settles on its
// still and renders the same twice. The still is re-rendered with the cue in it.
test('animate: a slide with the next-teaser settles on its still and renders the same twice', () => {
  const teaser = '<div class="next-teaser swipe at-bl" data-component="next-teaser" data-ui>Swipe<span class="arw"><svg viewBox="0 0 40 28" fill="none" stroke="#2563EB" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14h32M23 3l12 11-12 11"/></svg></span></div>'
  const d = makeCase('teaser', ({ slide, copy }) => ({
    copy,
    slide: slide
      .replace('</head>', '<link rel="stylesheet" href="../../../../components/next-teaser.css">\n<link rel="stylesheet" href="../../../../motion/next-teaser.css">\n</head>')
      .replace('\n</div>\n<script', `\n${teaser}\n</div>\n<script`),
  }))
  const still = spawnSync(process.execPath, [join(LIB, 'render.mjs'), join(d, 'slides'), '--copy', join(d, 'copy.json')], { encoding: 'utf8' })
  assert.equal(still.status, 0, still.stdout + still.stderr)
  const { status, out, report } = animate(d)
  assert.equal(status, 0, out)
  assert.equal(report.complete, true)
  const s = report.slides[0]
  assert.ok(s.checks.settledDiffPct <= T.maxDiffPct, String(s.checks.settledDiffPct))
  assert.ok(s.checks.determinismWorstPct <= T.maxDiffPct, String(s.checks.determinismWorstPct))
})
