/**
 * check-post-drafts.ts - deterministic review gate for the reddit-post / linkedin-post skills.
 *
 * Scans a drafts file and reports hard FAILs (must fix before presenting) and WARNs
 * (review by judgment). Exits non-zero if any FAIL is present so the skill's review loop
 * can keep fixing until it is clean. This is the objective half of the critical review;
 * the skill still does a qualitative archetype/voice pass on top.
 *
 * Self-contained: only Node built-ins, no network, no env, no dependencies.
 *
 * Usage:
 *   npx tsx scripts/check-post-drafts.ts --platform linkedin --file ./social-drafts/linkedin/xyz.md [--count 3] [--json]
 *   npx tsx scripts/check-post-drafts.ts --platform reddit   --file ./social-drafts/reddit/xyz.md
 *
 * Exit codes: 0 = no FAILs (WARNs allowed), 1 = at least one FAIL, 2 = usage/IO error.
 */

import { readFileSync, existsSync } from 'node:fs'

// Common "AI-tell" words that make copy read as machine-written. Cutting them keeps drafts human.
const BANNED = [
  'delve', 'tapestry', 'realm', 'landscape', 'ever-evolving', 'cutting-edge', 'robust',
  'transformative', 'pivotal', 'vibrant', 'crucial', 'compelling', 'seamless', 'groundbreaking',
  'leverage', 'harness', 'embark', 'unveil', 'facilitate', 'synergy', 'game-changer', 'unlock',
  'unleash', 'elevate', 'utilize', 'endeavour', 'multifaceted',
]
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{1F000}-\u{1F02F}]/u
const DASH_RE = /[—–]/
const URL_RE = /(https?:\/\/\S+|\b[a-z0-9-]+\.(?:com|ai|io|co|net|org|app|dev)\b)/i

type Platform = 'reddit' | 'linkedin'
interface Finding { draft: string; level: 'FAIL' | 'WARN'; rule: string; detail: string }

function parseArgs(argv: string[]) {
  const out: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const k = a.slice(2)
      const n = argv[i + 1]
      if (n && !n.startsWith('--')) { out[k] = n; i++ } else out[k] = 'true'
    }
  }
  return out
}

const args = parseArgs(process.argv.slice(2))
const platform = args.platform as Platform
const file = args.file
const expectCount = args.count ? Number(args.count) : null
const asJson = args.json === 'true'

if (platform !== 'reddit' && platform !== 'linkedin') {
  console.error('Usage: --platform reddit|linkedin --file <path> [--count N] [--json]')
  process.exit(2)
}
if (!file || !existsSync(file)) {
  console.error(`File not found: ${file}`)
  process.exit(2)
}

const raw = readFileSync(file, 'utf-8')
// Strip YAML frontmatter so its keys never count as draft content.
const content = raw.replace(/^---\n[\s\S]*?\n---\n/, '')

// Split into draft blocks on the "### Draft" markers.
const blocks: { label: string; text: string }[] = []
const parts = content.split(/^###\s+Draft\b/m)
for (let i = 1; i < parts.length; i++) {
  const chunk = parts[i]
  const firstLine = chunk.split('\n', 1)[0].trim()
  blocks.push({ label: `Draft ${firstLine.replace(/^[:\s]*/, '').slice(0, 40) || i}`, text: chunk })
}

const findings: Finding[] = []
const add = (draft: string, level: 'FAIL' | 'WARN', rule: string, detail: string) =>
  findings.push({ draft, level, rule, detail })

// ── File-level checks ──
if (DASH_RE.test(content)) {
  const line = content.split('\n').find((l) => DASH_RE.test(l)) || ''
  add('file', 'FAIL', 'em-dash', `em/en dash present: "${line.trim().slice(0, 60)}"`)
}
for (const w of BANNED) {
  const re = new RegExp(`\\b${w.replace(/[-]/g, '\\-')}\\b`, 'i')
  if (re.test(content)) add('file', 'FAIL', 'banned-word', `AI-tell word: "${w}"`)
}
if (expectCount !== null && blocks.length !== expectCount) {
  add('file', 'FAIL', 'draft-count', `expected ${expectCount} drafts, found ${blocks.length}`)
}
if (blocks.length === 0) add('file', 'FAIL', 'no-drafts', 'no "### Draft" blocks found')

// Lines that are wrapper labels/markers, not post content.
const isMeta = (l: string) =>
  /^\*\*(Title|Flair|First comment)/i.test(l.trim()) ||
  /^- \*\*/.test(l.trim()) ||
  l.trim() === '---' ||
  /^Target:|^Pulled from:|^Archetypes? used:|^##\s/i.test(l.trim())

// Placeholder tokens anywhere in a body (square-bracket words, {{..}}, YOUR_, <tag>).
const PLACEHOLDER_RE = /\{\{|\bYOUR_[A-Z]|<[a-z][a-z-]+>|\[[a-z][a-z ]{2,}\]/

for (const b of blocks) {
  const lines = b.text.split('\n')
  const bodyLines: string[] = []
  let hookLine = ''
  let hashtagCount = 0
  let inFirstComment = false
  let title = ''

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    const t = l.trim()
    if (/^\*\*First comment/i.test(t)) { inFirstComment = true; continue }
    if (/^\*\*Title:\*\*/i.test(t)) { title = t.replace(/^\*\*Title:\*\*/i, '').trim(); continue }
    if (/^\*\*Flair/i.test(t)) continue
    if (t === '' ) continue
    if (i === 0) continue // the "N (archetype: ...)" header line
    if (/^#[a-z0-9]/i.test(t)) { hashtagCount += (t.match(/#[a-z0-9_]+/gi) || []).length; continue }
    if (inFirstComment) continue
    if (isMeta(l)) continue
    if (!hookLine) hookLine = t
    bodyLines.push(l)
  }
  const body = bodyLines.join('\n')
  const words = body.split(/\s+/).filter(Boolean).length

  // Placeholders
  if (PLACEHOLDER_RE.test(body)) {
    const m = body.match(PLACEHOLDER_RE)
    add(b.label, 'FAIL', 'placeholder', `unfilled placeholder near "${m?.[0]}"`)
  }

  if (platform === 'linkedin') {
    // Hook = first content line; must fit before the ~210-char "...see more" fold.
    if (hookLine.length > 210) add(b.label, 'FAIL', 'hook-length', `hook is ${hookLine.length} chars (> 210)`)
    // No markdown in body (LinkedIn renders none).
    if (/\*\*[^*]+\*\*|^#{1,6}\s|^\s*[-*]\s/m.test(body)) add(b.label, 'FAIL', 'markdown', 'markdown formatting in body (LinkedIn renders plain text only)')
    // Links belong in the first comment, not the body.
    if (URL_RE.test(body)) add(b.label, 'FAIL', 'link-in-body', `link/URL in body: "${(body.match(URL_RE) || [])[0]}" (move to first comment)`)
    // Hashtags 3-5.
    if (hashtagCount < 3 || hashtagCount > 5) add(b.label, 'FAIL', 'hashtags', `${hashtagCount} hashtags (want 3-5)`)
    // Length guidance.
    if (words < 120) add(b.label, 'WARN', 'length', `${words} words (winners run ~180-250)`)
    if (words > 320) add(b.label, 'WARN', 'length', `${words} words (long; winners run ~180-250)`)
    if (body.length > 3000) add(b.label, 'FAIL', 'char-limit', `${body.length} chars (> 3000)`)
  } else {
    // Reddit
    if (!title) add(b.label, 'FAIL', 'no-title', 'no **Title:** line found')
    if (title && EMOJI_RE.test(title)) add(b.label, 'FAIL', 'title-emoji', `emoji in title: "${title.slice(0, 50)}"`)
    if (title && title.length > 12 && title === title.toUpperCase()) add(b.label, 'FAIL', 'title-caps', 'title is ALL CAPS (reads as clickbait)')
    if (URL_RE.test(body)) add(b.label, 'WARN', 'link-in-body', `link in body: "${(body.match(URL_RE) || [])[0]}" (Reddit prefers links in a comment)`)
    if (words < 120) add(b.label, 'WARN', 'length', `${words} words (winners run 150-400)`)
    if (words > 450) add(b.label, 'WARN', 'length', `${words} words (long for the format)`)
  }
}

const fails = findings.filter((f) => f.level === 'FAIL')
const warns = findings.filter((f) => f.level === 'WARN')

if (asJson) {
  console.log(JSON.stringify({ platform, file, drafts: blocks.length, pass: fails.length === 0, fails, warns }, null, 2))
} else {
  console.log(`\nCRITICAL REVIEW - ${platform} - ${file}`)
  console.log(`Drafts: ${blocks.length} | FAILs: ${fails.length} | WARNs: ${warns.length}`)
  if (fails.length) {
    console.log('\nFAIL (must fix before finishing):')
    for (const f of fails) console.log(`  [${f.draft}] ${f.rule}: ${f.detail}`)
  }
  if (warns.length) {
    console.log('\nWARN (review by judgment):')
    for (const w of warns) console.log(`  [${w.draft}] ${w.rule}: ${w.detail}`)
  }
  console.log(fails.length === 0 ? '\nRESULT: PASS (no hard failures)\n' : '\nRESULT: FAIL - fix the items above and re-run.\n')
}

process.exit(fails.length === 0 ? 0 : 1)
