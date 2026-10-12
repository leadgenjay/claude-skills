// node --test library/test/library.test.mjs
// Spawns the real render.mjs. Needs Playwright's Chromium.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const LIB = join(dirname(fileURLToPath(import.meta.url)), '..')
const FIX = join(LIB, 'test', 'fixtures')
const run = (script, args) => spawnSync(process.execPath, [join(LIB, script), ...args], { encoding: 'utf8' })

/* The example deck is copied beside itself (same depth, so its links still reach the library) and
   rendered there, so the shipped example folder stays clean. */
test('render: the example deck passes every check at 1080x1440', () => {
  const src = join(LIB, '..', 'examples', 'animated-carousel')
  const ex = mkdtempSync(join(LIB, '..', 'examples', '.tmp-example-'))
  try {
    cpSync(src, ex, { recursive: true })
    const r = run('render.mjs', [join(ex, 'slides'), '--copy', join(ex, 'copy.json')])
    assert.equal(r.status, 0, r.stdout + r.stderr)
    const report = JSON.parse(readFileSync(join(ex, 'slides', 'render-report.json'), 'utf8'))
    assert.equal(report.length, 7)
    assert.ok(report.every((s) => s.ok))
  } finally {
    rmSync(ex, { recursive: true, force: true })
  }
})

test('render: shipped faces pass (positive control for the font check)', () => {
  const r = run('render.mjs', [join(FIX, 'font-ok')])
  assert.equal(r.status, 0, r.stdout + r.stderr)
})

for (const [dir, want] of [
  ['font-unshipped', /font not shipped in fonts\/fonts\.css: Inter 700/],
  ['font-weight-unshipped', /font not shipped in fonts\/fonts\.css: Manrope 300/],
  ['system-font-on-copy', /font not shipped in fonts\/fonts\.css: -apple-system 600/],
  ['no-text', /no font face derived/],
]) {
  test(`render: ${dir} fails`, () => {
    const r = run('render.mjs', [join(FIX, dir)])
    assert.equal(r.status, 1, r.stdout + r.stderr)
    assert.match(r.stdout, want)
  })
}

/* A rehook in copy.json must be on the slide, word for word (references/copy-formula.md, rehooks). The slide sits
   in a temp folder inside fixtures/ so its relative stylesheet link still resolves. */
test('render: a rehook in copy.json must be placed, and must match', () => {
  const slide = (rehook) => `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="stylesheet" href="../../../tokens.css">
<style>
  .h { font-family: var(--font-head); font-weight: 900; font-size: 96px; text-transform: uppercase; }
  .b { font-family: var(--font-body); font-weight: 600; font-size: 40px; }
</style></head>
<body><div class="slide"><div class="safe">
  <div class="h" data-copy="0.headline">SHIPPED FACES ONLY</div>
  <div class="b" data-copy="0.body">Big Shoulders 900 and Manrope 600.</div>
  ${rehook === null ? '' : `<div class="b" data-copy="0.rehook">${rehook}</div>`}
</div></div></body></html>`
  const copy = { slides: [{ position: 0, headline: 'SHIPPED FACES ONLY', body: 'Big Shoulders 900 and Manrope 600.', rehook: 'So how does it work?' }] }
  for (const [name, rehook, status, want] of [
    ['placed and matching', 'So how does it work?', 0, null],
    ['missing', null, 1, /copy 0\.rehook is not placed on the slide/],
    ['different', 'So how does Claude work?', 1, /text mismatch on 0\.rehook/],
  ]) {
    const d = mkdtempSync(join(FIX, 'rehook-'))
    try {
      writeFileSync(join(d, 'slide-01.html'), slide(rehook))
      writeFileSync(join(d, 'copy.json'), JSON.stringify(copy))
      const r = run('render.mjs', [d, '--copy', join(d, 'copy.json')])
      assert.equal(r.status, status, `${name}: ${r.stdout}${r.stderr}`)
      if (want) assert.match(r.stdout, want, name)
    } finally {
      rmSync(d, { recursive: true, force: true })
    }
  }
})
