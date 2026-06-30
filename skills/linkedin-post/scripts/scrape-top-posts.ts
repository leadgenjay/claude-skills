/**
 * scrape-top-posts.ts - OPTIONAL competitor-scrape helper for the reddit-post / linkedin-post skills.
 *
 * Pulls the current top-performing posts from a list of channels (subreddits or LinkedIn
 * profiles) so you can refresh references/winning-patterns.md with live data. The skill works
 * fine WITHOUT this - it ships a bundled, data-derived playbook. This helper just lets you
 * regenerate that playbook for your own niche.
 *
 * Self-contained: only Node 18+ built-ins (global fetch) + node:fs/node:path. Zero npm deps.
 *
 * Optional Apify key: with no APIFY_API_TOKEN set, it prints a friendly note and exits 0 so the
 * skill cleanly falls back to the bundled patterns.
 *
 * Usage:
 *   npx tsx scripts/scrape-top-posts.ts --platform reddit   [--targets coldEmail,sales] [--limit 12] [--max-cost 1.0] [--out brief.json]
 *   npx tsx scripts/scrape-top-posts.ts --platform linkedin [--per-profile 5] [--max-cost 1.0] [--out brief.json]
 *
 * Channels default to config/channels.json (edit it to your niche). --targets overrides.
 * Reads APIFY_API_TOKEN from the environment or a local .env file in the working directory.
 */

import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HARD_COST_CEILING = 5.0 // never spend more than this in one run, regardless of --max-cost
const __dirname = dirname(fileURLToPath(import.meta.url))
const SKILL_DIR = resolve(__dirname, '..') // scripts/ -> skill root

type Platform = 'reddit' | 'linkedin'

// ── .env loader (working-dir .env + process.env; first wins). No dotenv dependency. ──
function loadEnv() {
  const p = resolve(process.cwd(), '.env')
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!m) continue
    const key = m[1]
    if (process.env[key] !== undefined) continue
    let val = m[2].trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    process.env[key] = val
  }
}
loadEnv()

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
const platform = (args.platform as Platform) || 'reddit'
const targetsArg = (args.targets || '').split(',').map((s) => s.trim()).filter(Boolean)
const limit = Number(args.limit || 12)
const perProfile = Math.min(Number(args['per-profile'] || 5), 15) // per-profile cap bounds LinkedIn cost
const maxCost = Math.min(Number(args['max-cost'] || 1.0), HARD_COST_CEILING)

if (platform !== 'reddit' && platform !== 'linkedin') {
  console.error(`Invalid --platform "${platform}". Use reddit or linkedin.`)
  process.exit(2)
}

// ── Channel list: --targets overrides; otherwise read the bundled, editable config/channels.json. ──
function loadChannels(p: Platform): string[] {
  const file = join(SKILL_DIR, 'config', 'channels.json')
  if (!existsSync(file)) return []
  try {
    const cfg = JSON.parse(readFileSync(file, 'utf-8')) as Record<string, unknown>
    const arr = cfg[p]
    return Array.isArray(arr) ? (arr as string[]).filter(Boolean) : []
  } catch {
    return []
  }
}

interface Post {
  title: string
  text: string
  url: string
  score: number
  likes: number
  comments: number
  publishedAt: string
}

// ── Apify: run an actor synchronously and get the dataset items back in one call. ──
async function apifyRun(actor: string, input: Record<string, unknown>, token: string): Promise<unknown[]> {
  const url = `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    throw new Error(`Apify ${actor} -> ${res.status} ${(await res.text()).slice(0, 200)}`)
  }
  const json = (await res.json()) as unknown
  return Array.isArray(json) ? json : []
}

async function main() {
  const token = process.env.APIFY_API_TOKEN
  if (!token) {
    console.error(
      'No APIFY_API_TOKEN set, so no fresh scrape. That is fine - the skill uses the bundled\n' +
      'references/winning-patterns.md playbook. To enable fresh scraping later, get a free key at\n' +
      'https://apify.com and add APIFY_API_TOKEN to a .env file in this folder (see .env.example).'
    )
    // Exit 0: a missing optional key is not an error.
    process.exit(0)
  }

  const targets = targetsArg.length ? targetsArg : loadChannels(platform)
  if (targets.length === 0) {
    console.error(
      `No channels to scrape. Pass --targets, or add some to config/channels.json under "${platform}".`
    )
    process.exit(0)
  }

  // Pre-flight worst-case cost estimate, so we never blow past the budget.
  // Reddit actor: ~$0.00025/post with a ~$0.20 flat minimum per run.
  // LinkedIn actor: ~$0.001/post.
  let estCost = 0
  if (platform === 'reddit') {
    const maxItems = Math.min(limit * targets.length + 10, 60)
    estCost = Math.max(0.2, maxItems * 0.00025)
  } else {
    estCost = targets.length * perProfile * 0.001
  }
  if (estCost > maxCost) {
    console.error(
      `Estimated cost ~$${estCost.toFixed(2)} exceeds --max-cost $${maxCost.toFixed(2)}. ` +
      `Reduce --targets / --limit / --per-profile, or raise --max-cost (hard ceiling $${HARD_COST_CEILING}). Not scraping.`
    )
    process.exit(0)
  }

  let posts: Post[] = []
  try {
    if (platform === 'reddit') {
      const subreddits = targets.map((t) => t.replace(/^\/?r\//i, '').trim())
      const items = await apifyRun('parseforge~reddit-posts-scraper', {
        subreddits,
        maxItems: Math.min(limit * subreddits.length + 10, 60),
        sort: 'top',
        time: 'month',
        proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
      }, token)
      posts = (items as Record<string, unknown>[]).map((item) => {
        const likes = Number(item.score || item.ups || 0)
        const comments = Number(item.numComments || item.num_comments || 0)
        const permalink = String(item.permalink || '')
        return {
          title: String(item.title || '').slice(0, 200),
          text: String(item.text || item.body || item.selftext || '').slice(0, 1200),
          url: permalink.startsWith('http') ? permalink : permalink ? `https://www.reddit.com${permalink}` : String(item.url || ''),
          score: likes,
          likes,
          comments,
          publishedAt: item.created_utc ? new Date(Number(item.created_utc) * 1000).toISOString() : String(item.createdAt || item.date || ''),
        }
      })
    } else {
      const profileUrls = targets.map((t) =>
        t.startsWith('http') ? t : `https://www.linkedin.com/in/${t.replace(/^\/?in\//i, '').trim()}/`
      )
      const items = await apifyRun('harvestapi~linkedin-profile-posts', {
        targetUrls: profileUrls,
        maxPosts: perProfile,
        postedLimit: 'month',
      }, token)
      posts = (items as Record<string, unknown>[]).map((item) => {
        const eng = (item.engagement as Record<string, unknown>) || {}
        const likes = Number(eng.likes || item.totalReactionCount || item.numLikes || 0)
        const comments = Number(eng.comments || item.commentsCount || item.numComments || 0)
        const shares = Number(eng.shares || item.repostsCount || item.numShares || 0)
        return {
          title: '',
          text: String(item.text || item.content || '').slice(0, 1500),
          url: String(item.linkedinUrl || item.postUrl || item.url || ''),
          score: likes + comments + shares,
          likes,
          comments,
          publishedAt: String((item.postedAt as Record<string, unknown>)?.date || item.publishedAt || item.date || ''),
        }
      })
    }
  } catch (err) {
    console.error(`Scrape failed: ${err instanceof Error ? err.message : String(err)}`)
    console.error('Falling back to the bundled references/winning-patterns.md playbook.')
    process.exit(0)
  }

  posts = posts.filter((p) => p.title || p.text).sort((a, b) => b.score - a.score).slice(0, limit)

  const brief = {
    platform,
    generatedAt: new Date().toISOString(),
    channels: targets,
    estimatedCostUsd: Number(estCost.toFixed(3)),
    posts,
  }
  const out = JSON.stringify(brief, null, 2)
  if (args.out) {
    writeFileSync(resolve(args.out), out)
    console.error(`Wrote ${posts.length} top posts -> ${args.out} (est. ~$${estCost.toFixed(3)})`)
  } else {
    console.log(out)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
