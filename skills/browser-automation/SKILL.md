---
name: browser-automation
version: 1.0.0
description: "Browser automation and social media scraping with saved cookies, anti-detection, and stealth browsing. Covers tool selection (Playwright/Puppeteer/nodriver), session persistence via storageState, rebrowser-patches stealth, proxy strategy, CAPTCHA avoidance, and platform-specific playbooks for Instagram, LinkedIn, Twitter/X, TikTok, and YouTube. Use this skill whenever the user mentions browser automation, scrape with cookies, stealth browser, anti-detection, browser scraping, saved cookies, avoid detection, social media scraping, headless browser, session management, proxy rotation, cookie persistence, scrape Instagram/LinkedIn/TikTok, or wants to automate any website interaction that requires login state or bot evasion — even if they don't use these exact words."
---

# Browser Automation & Scraping

You are an expert in browser automation, web scraping, and anti-detection techniques. Your goal is to help the user automate browser interactions with persistent sessions, evade bot detection, and scrape data reliably from websites including social media platforms.

This skill is language-agnostic — pick the best tool (Node.js or Python) per task. Examples are provided in both where relevant.

## Before Starting

**Read these reference files as needed:**
- `references/research-synthesis.md` — Deep research findings across 100+ sources
- `references/platform-limits.json` — Rate limits, cookie structures, detection levels per platform
- `references/tool-comparison.json` — Tool recommendations with GitHub stars, maintenance status

**Gather from user (ask if not provided):**

| Context | Why |
|---------|-----|
| Target platform(s) | Determines framework, proxy type, and stealth level |
| Task type | Scraping public data vs account management vs content posting |
| Scale | One-off vs recurring, volume per day |
| Existing accounts? | Whether we need login persistence or anonymous scraping |
| Budget tolerance | Proxy and anti-detect browser costs vary widely |

---

## 1. Tool Selection Decision Tree

Follow this tree to pick the right stack. The goal is minimum complexity for the task at hand — don't reach for Multilogin when a simple Playwright script suffices.

```
Is login/cookies needed?
├── No → Is anti-bot protection present?
│   ├── No → Plain HTTP (fetch/axios/httpx) or Cheerio
│   └── Yes → Crawlee (zero-config anti-bot) or Playwright + rebrowser-patches
└── Yes → Which platform?
    ├── Instagram → Playwright (Firefox) + rebrowser-patches + residential proxy
    ├── TikTok → Puppeteer + puppeteer-extra-stealth + mobile proxy (mandatory)
    ├── LinkedIn → Playwright (Chrome) + rebrowser-patches + residential proxy
    ├── Twitter/X → Check API first; if scraping: either framework + residential proxy
    ├── YouTube → yt-dlp for media; Playwright for interactions
    └── General website → Playwright + rebrowser-patches (add proxy if Cloudflare)
```

### Quick Reference

| Platform | Framework | Stealth Layer | Proxy Type | Difficulty |
|----------|-----------|---------------|------------|------------|
| Instagram | Playwright (Firefox) | rebrowser-patches | Residential | Aggressive |
| TikTok | Puppeteer | puppeteer-extra-stealth | Mobile 4G/5G (mandatory) | Very strict |
| LinkedIn | Playwright (Chrome) | rebrowser-patches | Residential | Moderate |
| Twitter/X | Either | rebrowser-patches | Residential | Light |
| YouTube | Playwright or yt-dlp | rebrowser-patches | Residential | Moderate |
| General (Cloudflare) | Playwright | rebrowser-patches | Residential | Varies |
| General (no protection) | Plain HTTP or Cheerio | None | None | Easy |

### Why Firefox for Instagram

Instagram's detection is heavily optimized for Chrome headless. Firefox renders differently at the Canvas/WebGL level, has different default fonts, and doesn't expose the same CDP artifacts. Using Firefox via Playwright sidesteps an entire category of Chrome-specific fingerprinting checks.

### AI-Driven Automation (Natural Language Tasks)

When the task is better described in natural language than in selectors (e.g., "find and save all posts tagged #leadgen"):

| Tool | Stars | Best For | Cost |
|------|-------|----------|------|
| Browser-Use | 78k+ | Claude integration, open-source | Free (bring your own LLM) |
| Stagehand | — | Production cost reduction (caches element/action inference) | Free |
| Skyvern | — | Vision-based, adapts to layout changes | Free (self-hosted) |

---

## 2. Session & Cookie Management

Session persistence is the foundation — it avoids re-login (which triggers security checks) and makes the browser look like a returning user rather than a fresh bot.

### Playwright storageState (Recommended)

Playwright's `storageState()` captures cookies + localStorage in a single JSON file. This is 71% faster than re-authenticating each session.

**Save session after login:**

```typescript
// Node.js — save session
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

await page.goto('https://instagram.com/accounts/login/');
// ... perform login (manual or automated) ...

// Save entire session state
await context.storageState({ path: 'sessions/instagram-account1.json' });
await browser.close();
```

**Restore session on next run:**

```typescript
// Node.js — restore session
const context = await browser.newContext({
  storageState: 'sessions/instagram-account1.json'
});
const page = await context.newPage();
await page.goto('https://instagram.com/'); // Already logged in
```

```python
# Python — save and restore
from playwright.async_api import async_playwright

async with async_playwright() as p:
    browser = await p.chromium.launch()

    # Restore existing session
    context = await browser.new_context(storage_state='sessions/ig-account1.json')
    page = await context.new_page()
    await page.goto('https://instagram.com/')

    # ... do work ...

    # Save updated session
    await context.storage_state(path='sessions/ig-account1.json')
```

### Cookie Encryption at Rest

Never store raw cookies on disk in production. Encrypt with AES-256-CBC:

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

function encryptSession(data: string, key: Buffer): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptSession(encrypted: string, key: Buffer): string {
  const [ivHex, dataHex] = encrypted.split(':');
  const decipher = createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
  return decipher.update(dataHex, 'hex', 'utf8') + decipher.final('utf8');
}

// Usage
const key = Buffer.from(process.env.SESSION_ENCRYPTION_KEY!, 'hex'); // 32 bytes
const raw = JSON.stringify(await context.storageState());
const encrypted = encryptSession(raw, key);
// Save `encrypted` to disk instead of raw JSON
```

### Session Refresh Strategy

Sessions expire — Instagram cookies last ~90 days, LinkedIn ~1 year, Twitter ~2 years. Build refresh into your workflow:

1. **Before each run**: Load session, navigate to a known page, check if still logged in
2. **If expired**: Re-authenticate, save new session
3. **Session rotation**: For multi-account operations, rotate through accounts to avoid overusing any single session
4. **Warm-up**: After restoring a session, browse 2-3 real pages before doing anything scrapy (the platform sees a returning user who checks their feed before doing targeted actions)

---

## 3. Anti-Detection Configuration

Modern bot detection correlates signals across multiple layers — passing one check while failing another still triggers a flag. The goal is consistency across all layers simultaneously.

### rebrowser-patches (Recommended — Best Maintained 2025-2026)

Targets the most common detection vectors: CDP detection, `navigator.webdriver`, Chrome-specific artifacts.

```typescript
// Node.js — Playwright + rebrowser-patches
import { chromium } from 'rebrowser-patches'; // Drop-in replacement

const browser = await chromium.launch({
  headless: false, // headed mode is less detectable
  args: [
    '--disable-blink-features=AutomationControlled',
    '--no-first-run',
    '--no-default-browser-check',
  ]
});

const context = await browser.newContext({
  locale: 'en-US',
  timezoneId: 'America/New_York', // Must match proxy location
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ...', // Match real browser
});
```

```typescript
// Node.js — Puppeteer + stealth (preferred for TikTok/Chrome-only)
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const browser = await puppeteer.launch({
  headless: 'new', // "new" headless is less detectable than old
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
```

### Python Alternatives

```python
# nodriver — async, successor to undetected-chromedriver
import nodriver as uc

async def main():
    browser = await uc.start()
    page = await browser.get('https://example.com')
    # Anti-detection handled automatically
```

```python
# Pydoll — no navigator.webdriver flag at all (avoids primary detection vector)
from pydoll.browser.chromium import Chromium

async def main():
    async with Chromium() as browser:
        page = await browser.new_page()
        await page.go_to('https://example.com')
        # No WebDriver artifacts to detect
```

### Critical Fingerprint Consistency Rules

These are the signals that trip up most automation. Get them all right simultaneously:

| Signal | What to Do | Why |
|--------|-----------|-----|
| `navigator.webdriver` | rebrowser-patches removes it; Pydoll never sets it | Primary detection vector — checked first |
| Timezone | Set to match proxy IP location | Mismatch = instant flag |
| Locale/Language | Match `Accept-Language` header to timezone region | Sites cross-reference these |
| Viewport | Use common resolution (1920x1080, 1440x900) | Unusual sizes = fingerprint |
| User-Agent | Match actual browser version you're running | Stale UA = red flag |
| WebGL renderer | Anti-detect browser handles this; or use Firefox | GPU fingerprint is very reliable for detection |
| Canvas | Firefox renders differently from Chrome | Avoids Chrome-specific canvas hashes |
| Plugins/fonts | Don't leave `navigator.plugins` empty | Empty = headless giveaway |

### Browser Warm-Up Protocol

Before doing any scraping or automation on a target site:

1. Open 2-3 unrelated popular sites (Google, Wikipedia, YouTube) for 5-15 seconds each
2. Navigate to the target site's homepage first
3. Scroll naturally, pause on content
4. Then navigate to your actual target page
5. Retire the browser context after 50-100 page loads (fresh fingerprint)

This creates a browsing history that looks like a real user who opened their browser, checked a few things, then went to the site — not a bot that navigated directly to a deep URL.

---

## 4. Platform Playbooks

### Instagram

**Detection level: Aggressive.** Datacenter IPs blocked after ~50 requests. Heavy Chrome fingerprinting.

**Stack:** Playwright (Firefox) + rebrowser-patches + residential proxy

**Rate limits:**
- Feed scrolling: 2-4 seconds between scroll actions
- Profile visits: 100-150/day max (spread across 12+ hours)
- Post interactions: 30-60/hour
- API-like requests: 200/hour max

**Session handling:**
- Cookies last ~90 days
- Use `storageState` — re-login triggers 2FA/challenge
- Same IP for duration of session (sticky proxy)
- 3-5 accounts max per residential IP

**Key cookies:** `sessionid`, `csrftoken`, `ds_user_id`, `mid`

**Example — scrape a profile's posts:**

```typescript
const context = await browser.newContext({
  storageState: 'sessions/ig-account1.json',
  proxy: { server: 'http://residential-proxy:port', username: '...', password: '...' },
  locale: 'en-US',
  timezoneId: 'America/New_York',
});

const page = await context.newPage();
await page.goto('https://www.instagram.com/');
await page.waitForTimeout(2000 + Math.random() * 3000); // warm-up

await page.goto('https://www.instagram.com/targetprofile/');
await page.waitForSelector('article'); // Wait for posts to load

// Scroll and collect posts
for (let i = 0; i < 5; i++) {
  await page.evaluate(() => window.scrollBy(0, window.innerHeight));
  await page.waitForTimeout(2000 + Math.random() * 2000);
}
```

**Alternative — Instagrapi (Python, best maintained Instagram library):**

```python
from instagrapi import Client

cl = Client()
cl.load_settings('sessions/ig-settings.json')  # Saved session
cl.login('username', 'password')  # Only if session expired

posts = cl.user_medias(cl.user_id_from_username('targetprofile'), amount=20)
cl.dump_settings('sessions/ig-settings.json')  # Save updated session
```

### LinkedIn

**Detection level: Moderate.** Account-activity focused rather than fingerprint-focused.

**Stack:** Playwright (Chrome) + rebrowser-patches + residential proxy

**Rate limits:**
- Profile views: 80-100/day (free), 150+/day (Sales Navigator)
- Search results: 100 pages/day (free accounts throttled)
- Connection requests: 100/week
- Messages: 150/day

**Session handling:**
- Cookies last ~1 year
- `li_at` is the primary session cookie — protect it
- 2-3 accounts per residential IP
- LinkedIn checks: rapid profile viewing, search patterns, connection request velocity

**Key cookies:** `li_at`, `JSESSIONID`, `bcookie`, `bscookie`

**Legal note:** LinkedIn has actively litigated against scrapers. Use official API where possible. For public profile data, the hiQ Labs v. LinkedIn ruling (2022) provides some protection, but this is evolving law.

### Twitter/X

**Detection level: Light.** Official API available (use it first).

**Stack:** Official API (preferred) → Playwright + rebrowser-patches + residential proxy

**API option:** Twitter API v2 free tier allows 500K tweets/month read. For most scraping tasks, the API is faster, more reliable, and legal.

**If web scraping:**
- Rate limits are lighter than Instagram/TikTok
- Occasional reCAPTCHA v2 on aggressive patterns
- 2-4 accounts per residential IP

**Python scraping library — Twscrape (best maintained 2025-2026):**

```python
import asyncio
from twscrape import API

api = API()
await api.pool.add_account('user', 'pass', 'email', 'email_pass')
await api.pool.login_all()

tweets = [tweet async for tweet in api.search('cold email tips', limit=50)]
```

### TikTok

**Detection level: Very strict.** Blocks datacenter IPs within minutes. Mobile proxy is non-negotiable.

**Stack:** Puppeteer + puppeteer-extra-stealth + mobile 4G/5G proxy

**Rate limits:**
- Profile views: 50-100/day max
- Video views/interactions: heavily monitored
- Search: 30-50 searches/day
- 1-2 accounts per mobile IP

**CAPTCHA types:** Rotate puzzle, sliding puzzle, 3D shape matching — these are custom (not reCAPTCHA). SadCaptcha specializes in TikTok CAPTCHAs if you must solve them.

**Session handling:**
- Cookies expire frequently (~30 days)
- Device fingerprint tied to session
- Mobile user-agent mandatory (desktop patterns flagged)
- Strict same-IP requirement during session

**Recommendation:** For data extraction, use Apify MCP (this project already has it) or commercial APIs rather than DIY TikTok scraping. The detection is aggressive enough that DIY is rarely cost-effective.

### YouTube

**Detection level: Moderate.** Google's infrastructure is sophisticated but less aggressive than TikTok.

**For video/audio downloads:** Always use `yt-dlp` — it's the gold standard, actively maintained (nightly builds as of March 2026), and handles all YouTube-specific challenges.

```bash
# Download video
yt-dlp -f 'bestvideo[height<=1080]+bestaudio' 'https://youtube.com/watch?v=...'

# Extract metadata only
yt-dlp --dump-json 'https://youtube.com/watch?v=...'

# Download with cookies (for age-restricted/members-only)
yt-dlp --cookies-from-browser chrome 'https://youtube.com/watch?v=...'
```

**For interaction automation** (commenting, subscribing, playlist management):
- Playwright + rebrowser-patches + residential proxy
- 5-10 accounts per residential IP (Google is less strict than Meta)
- Match Google account timezone to proxy location

---

## 5. Proxy Strategy

The proxy is often the difference between detection and success. Even perfect stealth code fails with a bad IP.

### Type Selection

| Type | Cost/mo | Best For | Never Use For |
|------|---------|----------|---------------|
| Datacenter | $1-5 | General sites without protection | Any social media |
| Residential | $30-100 | Instagram, LinkedIn, Twitter, YouTube, Cloudflare sites | — |
| Mobile 4G/5G | $50-150 | TikTok (mandatory), Instagram (optimal) | Wasteful for light-protection sites |
| ISP (static residential) | $40-80 | Long-session account management | High-volume rotation |

### Provider Recommendations

| Provider | Residential Pool | Mobile Pool | Strength |
|----------|-----------------|-------------|----------|
| Bright Data | 150M+ IPs | 7M+ | Largest pool, granular geo-targeting |
| Oxylabs | 100M+ | — | Strong enterprise support |
| NetNut | 85M+ | 5M+ | Good mobile coverage |
| IPRoyal | 10M+ | — | Budget-friendly |

### Sticky vs Rotating

- **Sticky sessions** (same IP for 1-30 min): Use for logged-in sessions. The platform expects the same user to stay on the same IP.
- **Rotating** (new IP per request): Use for anonymous scraping of public pages at scale.

### Proxy Configuration in Playwright

```typescript
const context = await browser.newContext({
  proxy: {
    server: 'http://proxy.provider.com:port',
    username: 'user-country-us-session-abc123', // Sticky session via username
    password: 'password',
  },
});
```

### Cost Optimization

- Start with residential ($30-100/mo) — only upgrade to mobile if you're getting blocked
- Use sticky sessions (fewer IP changes = fewer proxy credits consumed)
- Cache scraped data aggressively — never re-scrape what you already have
- Run during off-peak hours (lower proxy contention, often cheaper rates)

---

## 6. Human Behavior Simulation

Bot detection has evolved past simple header checks. Modern systems analyze how you interact with the page — mouse movements, typing rhythm, scroll patterns, and timing between actions.

### Mouse Movement — Ghost Cursor

Linear mouse movement (point A to point B in a straight line) is an instant bot flag. Use Bezier curve simulation:

```typescript
// npm install ghost-cursor
import { createCursor } from 'ghost-cursor';

const cursor = createCursor(page);
await cursor.click('button.submit'); // Moves in a natural curve, then clicks
await cursor.move('input[name="search"]'); // Natural movement without clicking
```

### Typing — Variable Speed with Occasional Typos

```typescript
// Type with human-like rhythm (not uniform delay)
async function humanType(page, selector: string, text: string) {
  await page.click(selector);
  for (const char of text) {
    await page.keyboard.type(char, {
      delay: 50 + Math.random() * 150 // 50-200ms per character
    });
  }
}

// With occasional typos (optional, for very strict platforms)
async function humanTypeWithTypos(page, selector: string, text: string) {
  await page.click(selector);
  for (let i = 0; i < text.length; i++) {
    if (Math.random() < 0.03) { // 3% typo rate
      const typo = String.fromCharCode(text.charCodeAt(i) + (Math.random() > 0.5 ? 1 : -1));
      await page.keyboard.type(typo, { delay: 80 + Math.random() * 100 });
      await page.waitForTimeout(200 + Math.random() * 300);
      await page.keyboard.press('Backspace');
      await page.waitForTimeout(100 + Math.random() * 200);
    }
    await page.keyboard.type(text[i], { delay: 50 + Math.random() * 150 });
  }
}
```

### Scrolling — Pauses and Variable Speed

```typescript
async function humanScroll(page, scrolls = 5) {
  for (let i = 0; i < scrolls; i++) {
    const distance = 300 + Math.random() * 500; // Variable scroll distance
    await page.evaluate((d) => window.scrollBy({ top: d, behavior: 'smooth' }), distance);

    // Sometimes pause to "read" content
    if (Math.random() < 0.3) {
      await page.waitForTimeout(3000 + Math.random() * 5000); // 3-8s reading pause
    } else {
      await page.waitForTimeout(800 + Math.random() * 1500); // 0.8-2.3s normal pause
    }

    // Occasionally scroll back up slightly
    if (Math.random() < 0.15) {
      await page.evaluate(() => window.scrollBy({ top: -(100 + Math.random() * 200), behavior: 'smooth' }));
      await page.waitForTimeout(500 + Math.random() * 1000);
    }
  }
}
```

### Timing Patterns — Action Clustering

Real users don't space actions uniformly. They do a few things quickly, then pause to think:

```typescript
async function actionCluster(actions: (() => Promise<void>)[]) {
  const clusterSize = 2 + Math.floor(Math.random() * 3); // 2-4 fast actions

  for (let i = 0; i < actions.length; i++) {
    await actions[i]();

    if ((i + 1) % clusterSize === 0) {
      // Longer "thinking" pause between clusters
      await new Promise(r => setTimeout(r, 4000 + Math.random() * 6000)); // 4-10s
    } else {
      // Short pause within cluster
      await new Promise(r => setTimeout(r, 500 + Math.random() * 1500)); // 0.5-2s
    }
  }
}
```

### Delay Variance Rule

Never use uniform random delays. Apply +-30% variance around a base:

```typescript
function humanDelay(baseMs: number): number {
  const variance = 0.3;
  return baseMs * (1 - variance + Math.random() * variance * 2);
}

// Usage
await page.waitForTimeout(humanDelay(3000)); // 2100-3900ms
```

---

## 7. CAPTCHA Handling

The most effective CAPTCHA strategy is not solving them — it's never triggering them in the first place.

### Avoidance-First Strategy (80% Success Rate)

With proper setup (anti-detection + proxy + human behavior + session persistence), most requests won't trigger CAPTCHAs at all. The stack from sections 2-6 achieves this.

**Why social media is different:** Instagram, LinkedIn, TikTok, and Twitter don't use traditional solvable CAPTCHAs (reCAPTCHA, hCaptcha). They use behavioral verification — if your behavior looks suspicious, they silently rate-limit, shadowban, or require phone verification. No CAPTCHA service can solve these. The solution is better behavior simulation, not better solving.

### Solver Fallback — CapSolver (For Non-Social-Media Sites)

For general websites that use reCAPTCHA, hCaptcha, or Cloudflare Turnstile:

```typescript
// npm install capsolver-npm
import { CapSolver } from 'capsolver-npm';

const solver = new CapSolver('YOUR_API_KEY');

// reCAPTCHA v2
const solution = await solver.solve({
  type: 'ReCaptchaV2TaskProxyLess',
  websiteURL: 'https://example.com',
  websiteKey: '6Le-xxxxx', // From the page's reCAPTCHA div
});
await page.evaluate((token) => {
  document.querySelector('#g-recaptcha-response').value = token;
}, solution.gRecaptchaResponse);

// Cloudflare Turnstile
const turnstile = await solver.solve({
  type: 'AntiTurnstileTaskProxyLess',
  websiteURL: 'https://example.com',
  websiteKey: '0x4AAA...',
});
```

### Service Comparison

| Service | reCAPTCHA v2 (per 1K) | Speed | Accuracy | Best For |
|---------|----------------------|-------|----------|----------|
| CapSolver | $0.80 | 3-9s | 96-98% | Best coverage of CAPTCHA types |
| CapMonster | $0.30-2.20 | ~5s | 95-99% | Best value at scale (>5K/mo) |
| 2Captcha | $1-2.99 | 10-15s | 95-98% | Complex puzzles (human workers) |
| NopeCHA | ~$0.01 | <1s | 96%+ | Browser extension approach, free tier |

### Cloudflare Turnstile — Use Managed Services

DIY Turnstile bypass is fragile (Cloudflare updates detection frequently). For Cloudflare-protected sites at scale, use Web Unlocker APIs that handle it for you:

- **Scrapfly** — Detects changes within 48 hours
- **ZenRows** — Anti-bot bypass included
- **Bright Data Web Unlocker** — Proxy + fingerprint + CAPTCHA bundled

These cost $50-300/mo depending on volume, but eliminate the maintenance burden of keeping up with Cloudflare's updates.

---

## 8. Architecture & Scaling

For one-off scripts, a simple sequential approach is fine. For recurring scraping or multi-account management, these patterns prevent session corruption and handle failures gracefully.

### Queue-Based Pattern (BullMQ)

```typescript
import { Queue, Worker } from 'bullmq';

const scrapeQueue = new Queue('scrape-tasks', {
  connection: { host: 'localhost', port: 6379 },
});

// Add tasks
await scrapeQueue.add('scrape-profile', {
  platform: 'instagram',
  target: 'targetprofile',
  sessionFile: 'sessions/ig-account1.json',
});

// Worker processes tasks
const worker = new Worker('scrape-tasks', async (job) => {
  const { platform, target, sessionFile } = job.data;
  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: sessionFile });

  try {
    // ... scraping logic ...
    return { success: true, data: scraped };
  } catch (error) {
    if (isRateLimited(error)) {
      // Re-queue with exponential backoff
      await scrapeQueue.add('scrape-profile', job.data, {
        delay: Math.pow(2, job.attemptsMade) * 60_000, // 1min, 2min, 4min...
      });
    }
    throw error;
  } finally {
    await browser.close();
  }
}, {
  concurrency: 3, // Max 3 simultaneous browsers
  connection: { host: 'localhost', port: 6379 },
});
```

### Session Pool Management

When running multiple accounts, manage sessions as a pool:

```typescript
interface SessionPool {
  sessions: Map<string, {
    file: string;
    lastUsed: Date;
    requestCount: number;
    cooldownUntil: Date | null;
  }>;
}

function getNextSession(pool: SessionPool): string | null {
  const now = new Date();
  const available = [...pool.sessions.entries()]
    .filter(([_, s]) => !s.cooldownUntil || s.cooldownUntil < now)
    .sort((a, b) => a[1].lastUsed.getTime() - b[1].lastUsed.getTime());

  if (available.length === 0) return null;

  const [id, session] = available[0];
  session.lastUsed = now;
  session.requestCount++;

  // Auto-cooldown after heavy use
  if (session.requestCount % 50 === 0) {
    session.cooldownUntil = new Date(now.getTime() + 30 * 60_000); // 30min cooldown
  }

  return session.file;
}
```

### Browser Lifecycle — Retire After N Pages

Browser fingerprints accumulate tracking data over time. Retire and recreate after 50-100 page loads:

```typescript
let pageCount = 0;
const MAX_PAGES = 50 + Math.floor(Math.random() * 50); // 50-100

async function getPage(context) {
  pageCount++;
  if (pageCount > MAX_PAGES) {
    await context.close();
    // Create fresh context with same session but new fingerprint
    context = await browser.newContext({
      storageState: 'sessions/current.json',
      // ... other config
    });
    pageCount = 0;
  }
  return context.newPage();
}
```

### Retry with Exponential Backoff

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 5000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const delay = baseDelay * Math.pow(2, attempt) * (0.7 + Math.random() * 0.6);
      console.log(`Attempt ${attempt + 1} failed, retrying in ${Math.round(delay / 1000)}s...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Unreachable');
}
```

---

## 9. Monitoring & Detection Signals

Track these metrics to catch problems before they escalate to account bans.

### Success Rate Tracking

```typescript
interface ScrapeMetrics {
  totalRequests: number;
  successfulRequests: number;
  captchaTriggers: number;
  rateLimits: number;
  loginFailures: number;
  timestamp: Date;
}

// Alert thresholds
const ALERT_RULES = {
  successRate: { warn: 0.90, critical: 0.75 },   // Below 90% = warn, 75% = stop
  captchaRate: { warn: 0.05, critical: 0.15 },   // Above 5% = warn, 15% = stop
  rateLimitRate: { warn: 0.10, critical: 0.25 },  // Above 10% = warn, 25% = stop
};
```

### Red Flags — Stop Immediately If You See

| Signal | What It Means | Action |
|--------|---------------|--------|
| Sudden CAPTCHA spike | Your fingerprint or IP is flagged | Rotate proxy, wait 24h |
| Empty responses (HTTP 200 but no data) | Soft ban / shadowban | Switch account, new proxy |
| Redirect to login page | Session expired or revoked | Re-authenticate carefully |
| HTTP 429 (Too Many Requests) | Rate limited | Exponential backoff, reduce speed |
| Account locked notification | Detected as automated | Stop, wait 48-72h, reassess approach |
| Unusual page content (different from browser) | Serving bot-specific page | Full stack review needed |

### Cost Tracking

Keep a running total of proxy costs, CAPTCHA solver credits, and anti-detect browser subscriptions. Set monthly budget alerts. Typical monthly costs:

| Scale | Proxy | Tools | CAPTCHA | Total |
|-------|-------|-------|---------|-------|
| Light (1-2 accounts, occasional) | $0-30 | $0 | $0 | $0-30 |
| Medium (5-10 accounts, daily) | $50-100 | $0-7 | $0-10 | $50-117 |
| Heavy (20+ accounts, continuous) | $100-300 | $7-50 | $10-50 | $117-400 |

---

## 10. Legal & Ethical Guidelines

This section isn't legal advice — consult a lawyer for specific situations. These are practical guidelines for common scenarios.

### What's Generally Lower Risk

- Scraping **publicly accessible** data (no login required)
- Using **official APIs** within their terms
- Research and analysis of public content
- Personal use / competitive intelligence from public sources
- Following `robots.txt` directives

### What Carries Higher Risk

- Circumventing access controls (login walls, rate limits) — potential CFAA issues
- Mass collection of personal data — GDPR/CCPA implications
- Violating platform Terms of Service — breach of contract claims
- Using scraped data commercially without rights
- Impersonating real users or creating fake accounts

### The CFAA Question

The Computer Fraud and Abuse Act (US) makes it illegal to access computers "without authorization." Courts have split on whether violating ToS constitutes "without authorization." The Ryanair v. Booking Holdings ruling (2022) suggested that using CAPTCHA solvers to bypass protections may constitute "intent to defraud." This is not settled law — treat it as a risk factor, not a bright line.

### Practical Rules

1. **Use official APIs first** — they're legal, faster, and more reliable
2. **Only scrape public data** unless you have explicit authorization
3. **Respect rate limits** — even if you can go faster, don't
4. **Don't store personal data** you don't need
5. **Have a legitimate business purpose** for what you're collecting
6. **Document your compliance efforts** in case of legal questions
