#!/usr/bin/env node
/**
 * Turn approved carousel slides into silent MP4s with HyperFrames, and check them.
 *
 *   node library/animate.mjs <slides dir> --copy <copy.json>
 *        [--duration 6] [--only 3,5] [--refresh-stills] [--keep-frames]
 *
 * <slides dir> holds slide-NN.html (with motion: motion/motion.js, see references/library.md)
 * and the approved stills slide-NN.png that render.mjs wrote. Outputs go
 * to <carousel>/video/ (the slides dir's parent): slide-NN.mp4, slide-NN-poster.png,
 * preview/slide-NN.mp4 (540x720, for a review page), sheets/slide-NN.png and
 * animate-report.json.
 *
 * Order, and every check is blocking:
 *   1. Stills are copied to <carousel>/stills/ with a sha256 manifest before anything renders. A
 *      later run refuses if slides/*.png no longer match it; after a re-approved fix to the stills,
 *      --refresh-stills moves the old copy to stills-<timestamp>/ and takes a new one.
 *   2. Static lints: the slide loads motion.js; no timeline hides an element without showing it
 *      first (the HyperFrames 0.8.97 lone-hide bug).
 *   3. Settle pass: render.mjs runs on copies in <carousel>/.settle/ (never in slides/), so every
 *      still check applies to the rest state; each slide must report data-settled="1", read
 *      exactly the visible text recorded with the still, and match stills/slide-NN.png within
 *      motion/thresholds.json.
 *   4. The choreography's build (its "rest" label) ends by settleBy (2.5s). Ambient CSS loops and
 *      the reverse of a "return" loop are exempt.
 *   5. Two lossless HyperFrames renders (PNG sequences). Frame count and size are checked, a bad
 *      render is retried up to renderAttempts and every retry is logged; the two renders must
 *      match frame for frame (determinism).
 *   6. Loop seam: first frame vs last, for "seamless" and "return"; "jump" records it skipped.
 *   7. Encode H.264 yuv420p faststart with no audio stream, then ffprobe it.
 *   8. slides/*.png are re-hashed; any change during the run fails it.
 *
 * Loop: copy.json motion.loop is required, one of "seamless" (the motion ends where it began),
 * "jump" (cuts back to the start) or "return" (motion.js plays the build in reverse before the
 * end). slides[i].motion.loop overrides it for the slide at that position (slide-NN is position
 * NN-1). The effective value is stamped as <html data-loop> on the settle, timeline and render
 * copies, and recorded per slide in animate-report.json.
 *
 * Any previous video/animate-report.json is deleted before anything else, so a refused or crashed
 * run never leaves an older complete: true behind.
 *
 * animate-report.json carries complete: true only for a full run (no --only) where every slide
 * passed. Post only from a run that says so.
 * Exit 0 all pass, 1 a check failed, 2 refused or bad usage.
 *
 * Test hook: ANIMATE_FAULT=corrupt-first truncates a frame of the first render so the retry path
 * can be proven. Never set it outside the test suite.
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync,
  truncateSync, writeFileSync,
} from 'node:fs'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import sharp from 'sharp'

export const LIB = dirname(fileURLToPath(import.meta.url))
export const T = JSON.parse(readFileSync(join(LIB, 'motion', 'thresholds.json'), 'utf8'))
const W = 1080
const H = 1440

export class Refusal extends Error {}

const LOOPS = ['seamless', 'jump', 'return']

/** Mark <html> with its loop, so motion.js builds the same timeline in every pass. */
const stampLoop = (html, loop) => html.replace(/<html([^>]*)>/, `<html$1 data-loop="${loop}">`)

export const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')

/** Pixels whose largest channel delta exceeds T.pixelDelta, as a count and a percentage. */
export async function diffPng(a, b) {
  const A = await sharp(a).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const B = await sharp(b).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  if (A.info.width !== B.info.width || A.info.height !== B.info.height) {
    return { pixels: A.info.width * A.info.height, pct: 100, sizeMismatch: true }
  }
  const px = A.info.width * A.info.height
  let n = 0
  for (let i = 0; i < px; i++) {
    const o = i * 3
    if (Math.abs(A.data[o] - B.data[o]) > T.pixelDelta ||
        Math.abs(A.data[o + 1] - B.data[o + 1]) > T.pixelDelta ||
        Math.abs(A.data[o + 2] - B.data[o + 2]) > T.pixelDelta) n++
  }
  return { pixels: n, pct: +((100 * n) / px).toFixed(4) }
}

/** A timeline set that hides an element needs a matching show, or HyperFrames 0.8.97 hides it from frame 0. */
export function lintLoneHide(html) {
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join('\n')
  const hides = /visibility\s*:\s*['"]?hidden/.test(scripts)
  const shows = /visibility\s*:\s*['"]?visible/.test(scripts)
  return hides && !shows ? ['a timeline sets visibility hidden with no matching show at the start (HyperFrames 0.8.97 lone-hide bug)'] : []
}

/**
 * Rewrites every relative href/src so a copy of the page written in toDir reaches the same files
 * it reached from fromDir. Absolute URLs, data: URIs and #fragments are left alone. With
 * guardRoot set, a link that resolves outside it is refused. Stylesheets keep their own url()s.
 */
export function relinkHtml(html, fromDir, toDir, guardRoot) {
  return html.replace(/\b(href|src)="([^"]+)"/g, (m, attr, url) => {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(url)) return m
    const abs = resolve(fromDir, url)
    if (guardRoot && relative(guardRoot, abs).startsWith('..')) throw new Refusal(`${url} resolves outside the project root ${guardRoot}`)
    return `${attr}="${relative(toDir, abs).split(sep).join('/')}"`
  })
}

/**
 * The slide as a standalone HyperFrames composition: same markup, marked to animate. HyperFrames
 * serves a composition with the project root as its base URL, so every relative href/src is
 * rewritten from the slide's own folder to a project-root path ("../../../library/x.css"
 * becomes "library/x.css").
 */
/**
 * When a motion file starts moving anything off rest ("transform: none"), as a fraction of the
 * clip. Motion starts at the last rest keyframe before the first moved one, not at the moved one:
 * the browser interpolates between them. The next-teaser nudge is timed in fractions of the clip,
 * so a short --duration would pull it into the build; animate() refuses that.
 */
export function firstMoveFraction(css) {
  const rest = [], moved = []
  for (const [, sel, body] of css.matchAll(/((?:\d+(?:\.\d+)?%\s*,?\s*)+)\{([^}]*)\}/g)) {
    const at = sel.match(/\d+(?:\.\d+)?(?=%)/g).map((p) => Number(p) / 100)
    ;(/^\s*transform:\s*none;?\s*$/.test(body) ? rest : moved).push(...at)
  }
  if (!moved.length) return 1
  const firstMoved = Math.min(...moved)
  return Math.max(0, ...rest.filter((r) => r < firstMoved))
}

export function wrapComposition(html, duration, htmlDir, projectRoot) {
  if (!/<body[^>]*>/.test(html) || !html.includes('</body>')) throw new Refusal('slide has no <body> to wrap')
  return relinkHtml(html, htmlDir, projectRoot, projectRoot)
    .replace(/<html([^>]*)>/, '<html$1 data-animate>')
    .replace(/<body([^>]*)>/, `<body$1><div id="root" data-composition-id="main" data-start="0" data-width="${W}" data-height="${H}" data-duration="${duration}" style="position:relative;width:100%;height:100%">`)
    .replace('</body>', '</div></body>')
}

/** ffprobe an encoded slide. Returns a list of problems, empty when it is fit to post. */
export function probeMp4(file, duration) {
  const problems = []
  if (!existsSync(file)) return [`${basename(file)} was not written`]
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries',
    'stream=codec_type,codec_name,width,height,pix_fmt:format=duration', '-of', 'json', file], { encoding: 'utf8' })
  if (r.status !== 0) return [`ffprobe could not read ${basename(file)} (moov atom missing?): ${r.stderr.trim()}`]
  const info = JSON.parse(r.stdout)
  const video = info.streams.filter((s) => s.codec_type === 'video')
  const audio = info.streams.filter((s) => s.codec_type === 'audio')
  const d = Number(info.format?.duration)
  if (video.length !== 1) problems.push(`expected one video stream, found ${video.length}`)
  const v = video[0] ?? {}
  if (v.codec_name !== 'h264') problems.push(`codec ${v.codec_name}, expected h264`)
  if (v.width !== W || v.height !== H) problems.push(`size ${v.width}x${v.height}, expected ${W}x${H}`)
  if (v.pix_fmt !== 'yuv420p') problems.push(`pixel format ${v.pix_fmt}, expected yuv420p`)
  if (audio.length) problems.push(`has ${audio.length} audio stream(s); carousel videos are silent`)
  if (!(d >= T.minDuration && d <= T.maxDuration)) problems.push(`duration ${d}s outside ${T.minDuration} to ${T.maxDuration}s`)
  if (duration && Math.abs(d - duration) > 0.1) problems.push(`duration ${d}s, expected ${duration}s`)
  if (statSync(file).size < T.minBytes) problems.push(`only ${statSync(file).size} bytes`)
  return problems
}

/** Deepest directory containing both paths: the HyperFrames project root. */
export function commonDir(a, b) {
  const pa = resolve(a).split(sep)
  const pb = resolve(b).split(sep)
  let i = 0
  while (i < pa.length && i < pb.length && pa[i] === pb[i]) i++
  return pa.slice(0, i).join(sep) || sep
}

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  return { ok: r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}` }
}

const hashAll = (dir, names) => Object.fromEntries(names.map((n) => [n, sha256(join(dir, n))]))

/**
 * Chromium read of where the composition's build ends, without HyperFrames: the "rest" label when
 * motion.js set one (a "return" outro runs past it), else the timeline's length.
 */
async function buildEnd(animFile) {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: W, height: H } })
    await page.goto(pathToFileURL(animFile).href, { waitUntil: 'networkidle' })
    return await page.evaluate(() => {
      const tl = window.__timelines && window.__timelines.main
      if (!tl) return null
      return tl.labels && typeof tl.labels.rest === 'number' ? tl.labels.rest : tl.duration()
    })
  } finally {
    await browser.close()
  }
}

/** Validate a PNG sequence: exact frame count, every frame decodes at slide size. */
async function checkFrames(dir, expected) {
  if (!existsSync(dir)) return 'no frames written'
  const frames = readdirSync(dir).filter((f) => f.endsWith('.png')).sort()
  if (frames.length !== expected) return `${frames.length} frames, expected ${expected}`
  for (const f of frames) {
    try {
      const m = await sharp(join(dir, f)).metadata()
      if (m.width !== W || m.height !== H) return `${f} is ${m.width}x${m.height}`
      await sharp(join(dir, f)).raw().toBuffer()
    } catch (e) {
      return `${f} does not decode: ${e.message}`
    }
  }
  return null
}

// HyperFrames lint findings that are wrong for a carousel slide: motion.js registers the timeline
// from an external file, which the static lint cannot see (the render finds it at runtime).
const LINT_EXPECTED = new Set(['missing_timeline_registry'])

async function renderFrames({ project, comp, out, expected, retries, label, fault, lint }) {
  for (let attempt = 1; attempt <= T.renderAttempts; attempt++) {
    rmSync(out, { recursive: true, force: true })
    // Not --strict: that aborts on LINT_EXPECTED. Every other finding is kept in the report.
    const r = run('npx', ['--no-install', 'hyperframes', 'render', '.', '-c', comp,
      '--format', 'png-sequence', '-o', out, '--lint-verbose'], project)
    for (const m of r.out.matchAll(/✗ ([a-z_]+): ([^\n]+)/g)) {
      if (!LINT_EXPECTED.has(m[1]) && !lint.includes(`${m[1]}: ${m[2]}`)) lint.push(`${m[1]}: ${m[2]}`)
    }
    if (fault && attempt === 1 && existsSync(join(out, 'frame_000001.png'))) truncateSync(join(out, 'frame_000001.png'), 64)
    const bad = r.ok ? await checkFrames(out, expected) : `hyperframes render failed: ${r.out.trim().split('\n').slice(-5).join(' | ')}`
    if (!bad) return null
    retries.push({ render: label, attempt, problem: bad })
    console.log(`      retry ${label} render (attempt ${attempt}): ${bad}`)
  }
  return `${label} render failed ${T.renderAttempts} times`
}

function sheet(mp4, out, duration) {
  const times = [0, 0.5, 1, 1.5, 2, 2.5, duration / 2 + 0.5, duration - 0.05].map((t) => Math.min(t, duration - 0.05))
  const tmp = `${out}.parts`
  mkdirSync(tmp, { recursive: true })
  times.forEach((t, i) => run('ffmpeg', ['-v', 'error', '-y', '-ss', String(t), '-i', mp4, '-frames:v', '1', '-vf', 'scale=270:360', join(tmp, `${i}.png`)]))
  const inputs = times.flatMap((_, i) => ['-i', join(tmp, `${i}.png`)])
  run('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex',
    '[0][1][2][3]hstack=4[a];[4][5][6][7]hstack=4[b];[a][b]vstack=2', out])
  rmSync(tmp, { recursive: true, force: true })
}

export async function animate({ slidesDir, copyPath, duration = T.defaultDuration, only = null, refreshStills = false, keepFrames = false, fault = null }) {
  slidesDir = resolve(slidesDir)
  const carousel = dirname(slidesDir)
  if (!existsSync(slidesDir)) throw new Refusal(`no slides dir ${slidesDir}`)
  // A previous run's report must not outlive a run that refuses or crashes: filing trusts complete: true.
  rmSync(join(carousel, 'video', 'animate-report.json'), { force: true })
  if (!copyPath || !existsSync(copyPath)) throw new Refusal('--copy <copy.json> is required')
  const copy = JSON.parse(readFileSync(copyPath, 'utf8'))
  const loop = copy.motion?.loop
  if (loop === undefined) throw new Refusal(`copy.json has no motion.loop; set it to ${LOOPS.map((l) => `"${l}"`).join(', ')}`)
  if (!LOOPS.includes(loop)) throw new Refusal(`copy.json motion.loop is "${loop}", expected ${LOOPS.map((l) => `"${l}"`).join(', ')}`)
  if (!(duration >= T.minDuration && duration <= T.maxDuration)) throw new Refusal(`--duration ${duration} outside ${T.minDuration} to ${T.maxDuration}`)

  const all = readdirSync(slidesDir).filter((f) => /^slide-\d{2}\.html$/.test(f)).sort()
  if (!all.length) throw new Refusal(`no slide-NN.html in ${slidesDir}`)
  const files = all.filter((f) => !only || only.includes(Number(f.slice(6, 8))))
  if (!files.length) throw new Refusal(`--only ${only} matches no slide`)
  const loopOf = {}
  for (const f of all) {
    const pos = Number(f.slice(6, 8)) - 1
    const own = copy.slides?.find((s) => s.position === pos)?.motion?.loop
    if (own !== undefined && !LOOPS.includes(own)) {
      throw new Refusal(`${f}: copy.json slides position ${pos} motion.loop is "${own}", expected ${LOOPS.map((l) => `"${l}"`).join(', ')}`)
    }
    loopOf[f] = own ?? loop
  }
  // The swipe arrow must not move during the build: its keyframes are fractions of the clip.
  const teaserAt = firstMoveFraction(readFileSync(join(LIB, 'motion', 'next-teaser.css'), 'utf8'))
  if (duration * teaserAt < T.settleBy) {
    const using = files.filter((f) => /motion\/next-teaser\.css/.test(readFileSync(join(slidesDir, f), 'utf8')))
    if (using.length) throw new Refusal(`${using.join(', ')}: the swipe arrow would first move at ${(duration * teaserAt).toFixed(2)}s, inside the ${T.settleBy}s build; use --duration ${Math.ceil(T.settleBy / teaserAt)} or more`)
  }
  const pngs = all.map((f) => f.replace('.html', '.png'))
  const missing = pngs.filter((p) => !existsSync(join(slidesDir, p)))
  if (missing.length) throw new Refusal(`no approved still for ${missing.join(', ')}; render and approve the stills first`)

  // 1. Protect the approved stills.
  const stillsDir = join(carousel, 'stills')
  const manifestPath = join(stillsDir, 'manifest.json')
  const before = hashAll(slidesDir, pngs)
  const snapshot = () => {
    // The visible text render.mjs recorded beside the stills, so the settled slide can be held to
    // it word for word (a one-letter typo is too few pixels for the image diff).
    const rp = join(slidesDir, 'render-report.json')
    const stillReport = existsSync(rp) ? JSON.parse(readFileSync(rp, 'utf8')) : []
    const text = {}
    for (const p of pngs) {
      const r = stillReport.find((x) => x.slide === p.replace('.png', '.html'))
      if (!r || !Array.isArray(r.text)) {
        throw new Refusal(`slides/render-report.json has no visible text for ${p}; render the approved stills with the current render.mjs (it records text) before animating`)
      }
      text[p] = r.text
    }
    mkdirSync(stillsDir, { recursive: true })
    for (const p of pngs) copyFileSync(join(slidesDir, p), join(stillsDir, p))
    writeFileSync(manifestPath, JSON.stringify({ takenAt: new Date().toISOString(), sha256: before, text }, null, 2))
  }
  if (!existsSync(manifestPath)) snapshot()
  else {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')).sha256
    const drift = pngs.filter((p) => manifest[p] !== before[p])
    const tampered = Object.keys(manifest).filter((p) => !existsSync(join(stillsDir, p)) || sha256(join(stillsDir, p)) !== manifest[p])
    if (tampered.length) throw new Refusal(`stills/ no longer matches its own manifest (${tampered.join(', ')}); restore it from the approved stills before animating`)
    if (drift.length && !refreshStills) {
      throw new Refusal(`slides/${drift.join(', ')} changed since stills/ was taken. If you re-approved them, rerun with --refresh-stills`)
    }
    if (drift.length || refreshStills) {
      renameSync(stillsDir, join(carousel, `stills-${new Date().toISOString().replace(/[:.]/g, '-')}`))
      snapshot()
    }
  }

  const stillText = JSON.parse(readFileSync(manifestPath, 'utf8')).text
  if (!stillText) throw new Refusal('stills/manifest.json has no visible text (taken by an older animate.mjs); rerun with --refresh-stills')

  const report = {
    runId: createHash('sha256').update(`${Date.now()}${slidesDir}`).digest('hex').slice(0, 12),
    createdAt: new Date().toISOString(),
    slidesDir, duration, loop, only, complete: false, slides: [],
  }
  const videoDir = join(carousel, 'video')
  const settleDir = join(carousel, '.settle')
  const workDir = join(carousel, '.animate')
  mkdirSync(join(videoDir, 'preview'), { recursive: true })
  mkdirSync(join(videoDir, 'sheets'), { recursive: true })
  rmSync(settleDir, { recursive: true, force: true })
  mkdirSync(settleDir, { recursive: true })

  // 2. Static lints, and the settle copies, relinked from slides/ so slide-local files still load.
  const project = commonDir(slidesDir, LIB)
  const entries = files.map((f) => ({ f, n: f.slice(6, 8), loop: loopOf[f], problems: [], checks: { retries: [], lint: [] } }))
  for (const e of entries) {
    const html = readFileSync(join(slidesDir, e.f), 'utf8')
    if (!/motion\/motion\.js/.test(html)) e.problems.push('slide does not load motion/motion.js, so it has no motion and no rest state')
    e.problems.push(...lintLoneHide(html))
    const stamped = stampLoop(html, e.loop)
    const local = relinkHtml(stamped, slidesDir, settleDir)
    writeFileSync(join(settleDir, e.f), local)
    writeFileSync(join(settleDir, e.f.replace('.html', '.anim.html')), wrapComposition(stamped, duration, slidesDir, project))
    // For the timeline probe over file://: relinked like the settle copy, only marked to animate.
    writeFileSync(join(settleDir, e.f.replace('.html', '.timeline.html')), local.replace(/<html([^>]*)>/, '<html$1 data-animate>'))
  }

  // 3. Settle pass through the unchanged still checks.
  const rr = run(process.execPath, [join(LIB, 'render.mjs'), settleDir, '--copy', resolve(copyPath)], process.cwd())
  const rendered = existsSync(join(settleDir, 'render-report.json')) ? JSON.parse(readFileSync(join(settleDir, 'render-report.json'), 'utf8')) : []
  for (const e of entries) {
    const r = rendered.find((x) => x.slide === e.f)
    if (!r) { e.problems.push(`settle pass did not render: ${rr.out.trim().split('\n').slice(-3).join(' | ')}`); continue }
    e.problems.push(...r.problems.map((p) => `settled frame: ${p}`))
    if (r.settled !== '1') e.problems.push(`settle sentinel is ${JSON.stringify(r.settled)}, expected "1": the rest state never ran, so the still checks above prove nothing`)
    const want = stillText[e.f.replace('.html', '.png')]
    const got = r.text ?? []
    if (JSON.stringify(got) !== JSON.stringify(want)) {
      const i = got.findIndex((s, k) => s !== want[k])
      const at = i < 0 ? want.length : i
      e.problems.push(`settled slide text differs from the approved still: "${got[at] ?? '(nothing)'}" where the still reads "${want[at] ?? '(nothing)'}"`)
    }
    const d = await diffPng(join(stillsDir, e.f.replace('.html', '.png')), r.png)
    e.checks.settledDiffPct = d.pct
    if (d.pct > T.maxDiffPct) e.problems.push(`settled frame differs from the approved still: ${d.pct}% of pixels (limit ${T.maxDiffPct}%)`)
  }

  // 4. Choreography's build ends by settleBy.
  for (const e of entries) {
    if (e.problems.length) continue
    const end = await buildEnd(join(settleDir, e.f.replace('.html', '.timeline.html')))
    e.checks.timelineEnd = end
    if (end === null) e.problems.push('no timeline registered on window.__timelines.main')
    else if (end > T.settleBy + 1e-6) e.problems.push(`choreography still running until ${end.toFixed(2)}s (must finish by ${T.settleBy}s)`)
  }

  // 5 to 7. Render twice, compare, seam, encode.
  const expected = Math.round(duration * T.fps)
  for (const e of entries) {
    if (e.problems.length) { console.log(`FAIL  ${e.f}`); for (const p of e.problems) console.log(`      ${p}`); continue }
    const comp = relative(project, join(settleDir, e.f.replace('.html', '.anim.html')))
    const a = join(workDir, `slide-${e.n}`, 'a')
    const b = join(workDir, `slide-${e.n}`, 'b')
    const errA = await renderFrames({ project, comp, out: a, expected, retries: e.checks.retries, label: 'first', fault: fault === 'corrupt-first', lint: e.checks.lint })
    const errB = errA ? null : await renderFrames({ project, comp, out: b, expected, retries: e.checks.retries, label: 'second', fault: null, lint: e.checks.lint })
    if (e.checks.lint.length) e.problems.push(...e.checks.lint.map((l) => `hyperframes lint: ${l}`))
    if (errA || errB) e.problems.push(errA || errB)
    else {
      const frames = readdirSync(a).filter((f) => f.endsWith('.png')).sort()
      let worst = { pct: 0, frame: null }
      for (const f of frames) {
        const d = await diffPng(join(a, f), join(b, f))
        if (d.pct > worst.pct) worst = { pct: d.pct, frame: f }
      }
      e.checks.determinismWorstPct = worst.pct
      if (worst.pct > T.maxDiffPct) e.problems.push(`not deterministic: two renders differ by ${worst.pct}% at ${worst.frame} (limit ${T.maxDiffPct}%)`)

      if (e.loop !== 'jump') {
        const d = await diffPng(join(a, frames[0]), join(a, frames.at(-1)))
        e.checks.seamPct = d.pct
        if (d.pct > T.maxDiffPct) e.problems.push(`loop seam (${e.loop}): last frame differs from the first by ${d.pct}% (limit ${T.maxDiffPct}%); use a seamless treatment, or set the slide's motion.loop to "return" or "jump"`)
      } else e.checks.seamPct = 'skipped: motion.loop is "jump"'

      const mp4 = join(videoDir, `slide-${e.n}.mp4`)
      const enc = run('ffmpeg', ['-v', 'error', '-y', '-framerate', String(T.fps), '-i', join(a, 'frame_%06d.png'),
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', mp4], project)
      if (!enc.ok) e.problems.push(`encode failed: ${enc.out.trim()}`)
      e.problems.push(...probeMp4(mp4, duration))
      if (!e.problems.length) {
        copyFileSync(join(settleDir, e.f.replace('.html', '.png')), join(videoDir, `slide-${e.n}-poster.png`))
        run('ffmpeg', ['-v', 'error', '-y', '-i', mp4, '-vf', 'scale=540:720', '-c:v', 'libx264', '-crf', '28',
          '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', join(videoDir, 'preview', `slide-${e.n}.mp4`)])
        sheet(mp4, join(videoDir, 'sheets', `slide-${e.n}.png`), duration)
        e.mp4 = mp4
        e.mp4Sha256 = sha256(mp4)
      }
    }
    if (!keepFrames && !e.problems.length) rmSync(join(workDir, `slide-${e.n}`), { recursive: true, force: true })
    console.log(`${e.problems.length ? 'FAIL' : 'PASS'}  ${e.f}`)
    for (const p of e.problems) console.log(`      ${p}`)
  }

  // 8. The approved stills must not have moved underneath the run.
  const after = hashAll(slidesDir, pngs)
  const moved = pngs.filter((p) => after[p] !== before[p])
  if (moved.length) for (const e of entries) e.problems.push(`slides/${moved.join(', ')} changed during the run`)

  report.slides = entries.map((e) => ({
    slide: e.f, loop: e.loop, ok: e.problems.length === 0, mp4: e.mp4 ?? null, mp4Sha256: e.mp4Sha256 ?? null,
    // The still this video was checked against, so filing can refuse a still regenerated later.
    stillSha256: after[e.f.replace('.html', '.png')] ?? null,
    poster: e.mp4 ? join(videoDir, `slide-${e.n}-poster.png`) : null,
    preview: e.mp4 ? join(videoDir, 'preview', `slide-${e.n}.mp4`) : null,
    sheet: e.mp4 ? join(videoDir, 'sheets', `slide-${e.n}.png`) : null,
    checks: e.checks, problems: e.problems,
  }))
  report.complete = !only && files.length === all.length && report.slides.every((s) => s.ok)
  writeFileSync(join(videoDir, 'animate-report.json'), JSON.stringify(report, null, 2))
  return report
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
  try {
    const report = await animate({
      slidesDir: args[0],
      copyPath: opt('--copy'),
      duration: opt('--duration') ? Number(opt('--duration')) : undefined,
      only: opt('--only')?.split(',').map(Number) ?? null,
      refreshStills: args.includes('--refresh-stills'),
      keepFrames: args.includes('--keep-frames'),
      fault: process.env.ANIMATE_FAULT ?? null,
    })
    console.log(report.complete ? 'complete: every slide passed' : report.slides.every((s) => s.ok) ? 'partial run passed (--only); run every slide before filing' : 'FAILED')
    process.exit(report.slides.every((s) => s.ok) ? 0 : 1)
  } catch (e) {
    if (e instanceof Refusal) { console.error(`animate.mjs: ${e.message}`); process.exit(2) }
    throw e
  }
}
