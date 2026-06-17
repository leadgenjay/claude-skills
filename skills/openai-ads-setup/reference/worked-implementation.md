# Reference implementation — Next.js 14 + Supabase + Whop

> **Host-specific.** This is one real, working implementation (Lead Gen Jay's stack: Next.js 14 App
> Router, Supabase, Whop checkout). The exact file paths, table names, helper names, and the
> `whop_<orderId>` dedup id below **will not exist in your project** — they're here as a concrete,
> copy-adaptable pattern. Map each piece to your own stack using the generic steps in `SKILL.md`.

## Layer 1 — Base pixel via a DB-driven head-scripts blob (no deploy)

LGJ loads all site-wide tags (PostHog/Hyros/Clarity/OpenAI) from a single JSON blob in Supabase
(`app_settings.global_tracking.customHeadScripts`) that the app injects into `<head>`. Appending the
pixel there makes it live within the settings-cache TTL with no code deploy. Idempotent guard on `oaiq`:

```sql
UPDATE app_settings
SET value = jsonb_set(value, '{customHeadScripts}',
  to_jsonb((value->>'customHeadScripts') || $oai$

<!-- OpenAI Ads Measurement Pixel -->
<script>!function(w,d,s,u){if(w.oaiq)return;var q=function(){q.q.push(arguments)};q.q=[];w.oaiq=q;var j=d.createElement(s);j.async=1;j.src=u;var f=d.getElementsByTagName(s)[0];f.parentNode.insertBefore(j,f)}(window,document,"script","https://bzrcdn.openai.com/sdk/oaiq.min.js");oaiq("init",{pixelId:"<YOUR_PIXEL_ID>"});</script>
<!-- End OpenAI Ads -->$oai$))
WHERE key='global_tracking' AND coalesce(value->>'customHeadScripts','') NOT LIKE '%oaiq%';
```

> **Your stack:** if you don't have a DB-driven head blob, just paste the `<script>` from `SKILL.md`
> Step 1 directly into your root layout `<head>` or your tag manager. Same effect.

## Layer 2 — Client helper (`src/lib/tracking/openai-ads.ts`)

Typed, SSR-safe call sites. `fireOpenAIEvent` mirrors the existing analytics fire (`fireClarityEvent`);
`initOpenAIUser` re-inits the pixel with a SHA-256 hashed email. Raw email never leaves the browser.

```ts
declare global {
  interface Window {
    oaiq?: (...args: unknown[]) => void;
  }
}

type MeasureData =
  | { type: "customer_action"; amount?: number; currency?: string }
  | { type: "contents"; amount?: number; currency?: string; contents?: unknown[] }
  | { type: "plan_enrollment"; plan_id?: string; amount?: number; currency?: string }
  | { type: "custom"; [key: string]: unknown };

interface MeasureOptions {
  event_id?: string;
  custom_event_name?: string;
  opt_out?: boolean;
}

/** Fire an OpenAI Ads conversion event. SSR-safe, no-op when window.oaiq is undefined. */
export function fireOpenAIEvent(
  eventName: string,
  data: MeasureData,
  options?: MeasureOptions,
): void {
  if (typeof window === "undefined") return;
  if (typeof window.oaiq !== "function") return;
  try {
    if (options) {
      window.oaiq("measure", eventName, data, options);
    } else {
      window.oaiq("measure", eventName, data);
    }
  } catch {
    // Telemetry-level failure — never surface to UI.
  }
}

/** SHA-256 → lowercase 64-char hex. Returns null on insecure context / failure. */
async function sha256Hex(input: string): Promise<string | null> {
  try {
    if (typeof crypto === "undefined" || !crypto.subtle) return null;
    const bytes = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
}

/** Re-init the pixel with a hashed email for match quality. Fire-and-forget. */
export async function initOpenAIUser(email: string | null | undefined): Promise<void> {
  if (typeof window === "undefined") return;
  if (typeof window.oaiq !== "function") return;
  const normalized = (email || "").trim().toLowerCase();
  if (!normalized) return;
  try {
    const emailSha256 = await sha256Hex(normalized);
    if (!emailSha256) return;
    window.oaiq("init", { user: { email_sha256: emailSha256 } });
  } catch {
    // Never surface telemetry failures.
  }
}
```

**Wiring (client events):**
- LGJ fires `fireOpenAIEvent("lead_created", { type: "customer_action" })` next to every existing
  `fireClarityEvent("user_opted_in")` (opt-in handlers), and `fireOpenAIEvent("checkout_started", {
  type: "contents" })` next to every `fireClarityEvent("checkout_viewed")`. Mirroring the existing
  analytics footprint guarantees coverage across all A/B variants.
- The purchase event lives in the success-page tracker next to the Meta/`fbq` Purchase fire:
  ```ts
  if (email) void initOpenAIUser(email)
  fireOpenAIEvent("order_created",
    { type: "contents", amount: Math.round(purchaseValue * 100), currency: "USD" },
    { event_id: eventId })   // eventId = whop_<orderId> — the shared dedup id
  ```
- A request-scoped `void initOpenAIUser(journeyEmail)` runs wherever the app already identifies the
  visitor (LGJ: next to the Clarity `identify` in its tracking context) so `email_sha256` is set on
  every post-opt-in page.

## Layer 3 — Server CAPI (`src/lib/tracking/openai-capi.ts`)

Server-side `order_created`, deduped against the pixel on the shared `eventId`. No-ops without creds,
never throws. Mirrors LGJ's `meta-capi.ts`.

```ts
import { createHash } from "node:crypto"

const OPENAI_CAPI_ENDPOINT = "https://bzr.openai.com/v1/events"

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex")
}
function hashEmail(email: string): string {
  return sha256Hex(email.toLowerCase().trim())
}

export interface SendOpenAIPurchaseParams {
  email: string
  value: number          // USD dollars; converted to cents internally
  currency: string       // ISO 4217, e.g. "USD"
  eventId: string        // shared dedup id (LGJ: whop_<orderId>)
  eventTimeMs: number     // ≤ 7 days old, ≤ 10 min ahead
  sourceUrl: string
  plan?: string | null
  product?: string | null
  oppref?: string | null  // from the __oppref cookie; null server-side unless persisted at opt-in
}

type ContentItem = { id?: string; name?: string; content_type?: string; quantity?: number }

export async function sendOpenAIPurchaseEvent(params: SendOpenAIPurchaseParams): Promise<void> {
  const pixelId = process.env.OPENAI_ADS_PIXEL_ID      // e.g. <YOUR_PIXEL_ID>
  const apiKey = process.env.OPENAI_CONVERSIONS_KEY    // needs ads.third_party_events.write scope
  if (!pixelId || !apiKey) return                       // silent no-op without creds

  const validateOnly = process.env.OPENAI_ADS_TEST_ONLY === "1"

  const contents: ContentItem[] = []
  if (params.plan || params.product) {
    const item: ContentItem = { content_type: "product", quantity: 1 }
    if (params.plan) item.id = params.plan
    if (params.product) item.name = params.product
    contents.push(item)
  }

  const event: Record<string, unknown> = {
    id: params.eventId,
    type: "order_created",
    timestamp_ms: params.eventTimeMs,
    source_url: params.sourceUrl,
    action_source: "web",
    user: { email_sha256: hashEmail(params.email) },
    data: {
      type: "contents",
      amount: Math.round(params.value * 100),   // minor units (cents)
      currency: params.currency,
      ...(contents.length > 0 ? { contents } : {}),
    },
  }
  if (params.oppref) event.oppref = params.oppref

  const url = `${OPENAI_CAPI_ENDPOINT}?pid=${encodeURIComponent(pixelId)}`
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ validate_only: validateOnly, events: [event] }),
    })
    if (!res.ok) {
      console.error("[openai-capi] order_created failed:", res.status, (await res.text()).slice(0, 300))
    } else {
      // one greppable line per send: vercel logs --output raw | grep '[openai-capi] sent'
      console.log("[openai-capi] sent", JSON.stringify({ eventId: params.eventId, value: params.value, validate: validateOnly }))
    }
  } catch (e) {
    console.error("[openai-capi] order_created error:", e instanceof Error ? e.message : String(e))
  }
}
```

**Wiring (server):** LGJ calls `sendOpenAIPurchaseEvent(...)` once inside `recordPurchaseFromWhop`
(`src/lib/purchase-sync.ts`), right after the Meta/Google CAPI sends, **inside the `if (fireSideEffects)`
guard** (so the historical backfill path never fires it and never trips the 7-day window). It reuses the
same `eventId = whop_<orderId>` the client pixel passed, the plan price (→ dollars), and the order
timestamp (× 1000 → ms). On Vercel, the send is wrapped in `after()` so the serverless function doesn't
exit before the fetch completes.

## Adapting to your stack — checklist
- **Pixel:** DB head-blob → or your `<head>` / tag manager.
- **Client events:** "next to `fireClarityEvent`" → next to whatever analytics event you already fire at
  opt-in / checkout-view / purchase.
- **Server CAPI:** `recordPurchaseFromWhop` → your one-per-order purchase webhook/handler. Keep a stable
  shared `eventId` between the client `order_created` and the server send.
- **`fireSideEffects` guard / `after()`** → your equivalent "real event, not a backfill" gate + your
  platform's keep-alive for fire-and-forget work.
