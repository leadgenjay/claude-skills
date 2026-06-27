/**
 * Lead Routing Form — webhook forwarder (Next.js App Router).
 *
 * Copy to:  src/app/api/<your-key>/submit/route.ts  (e.g. src/app/api/book-a-call/submit/route.ts)
 *
 * The browser form POSTs each of the 4 events here; this route forwards them to YOUR
 * webhook (n8n / Zapier / Make / GHL inbound / custom) read from an env var, so the
 * webhook URL is never exposed in the client bundle. No database, no API keys, no tracking.
 *
 * Set in .env.local:
 *   LEAD_ROUTING_WEBHOOK_URL=https://your-webhook-endpoint
 *
 * Contract: references/webhook-contract.md.
 */

import { NextResponse, after } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event, email } = body ?? {};

    // Minimal guard — the form already validates, this just rejects junk.
    if (!event || typeof email !== "string" || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    }

    const webhookUrl = process.env.LEAD_ROUTING_WEBHOOK_URL;
    const response = NextResponse.json({ success: true });

    // Fire-and-forget: respond immediately, forward after (Vercel-safe via after()).
    after(async () => {
      if (!webhookUrl) {
        console.warn("[lead-routing] LEAD_ROUTING_WEBHOOK_URL is not set — event dropped:", event);
        return;
      }
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Forward the form's payload verbatim (it already matches the 4-event contract).
          body: JSON.stringify(body),
        });
      } catch (err) {
        console.error("[lead-routing] webhook forward failed", err);
      }
    });

    return response;
  } catch (err) {
    console.error("[lead-routing] submit error", err);
    return NextResponse.json({ error: "failed to process" }, { status: 500 });
  }
}
