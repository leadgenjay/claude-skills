# Webhook contract — the 4 events your routing form sends

The form is **backend-free**. It never writes to a database and never holds an API key. Every
lead it captures is sent as a JSON `POST` to **one webhook URL you control** (n8n, Zapier, Make,
a GoHighLevel inbound webhook, or any HTTP endpoint). Your automation does the CRM work
(create/upsert the contact, assign the owner, start a nurture, etc.).

The webhook URL **is the shared secret** — keep it unguessable. No auth header is sent.

## The envelope (every event)

```json
{
  "event": "lander_optin | partial_submission | qualified | disqualified",
  "timestamp": "2026-06-27T15:30:00.000Z",
  "data": {
    "fullName": "Jane Doe",
    "email": "jane@acme.com",
    "phone": "+14155550123 | null",
    "website": "acme.com | null",
    "country": "United States | null",
    "landingPage": "<your page key, e.g. book-a-call>",
    "source": "calendar-routing:<page key>"
  }
}
```

Per event, `data` adds:

| Event | When it fires | Extra `data` fields |
|---|---|---|
| `lander_optin` | The moment we have name + email (step 1). **Your primary contact-creation event.** | `tracking: { pageUrl, referrer, utmSource, utmMedium, utmCampaign, utmTerm, utmContent }` |
| `partial_submission` | Lead abandons after step 1 (sent via `navigator.sendBeacon`). | `answers: {…}`, `lastStep: <int>` |
| `qualified` | Lead completes and is routed to a salesperson. | `answers: {…}`, `outcome: "assign"`, `assignedSalesperson: "<id>"`, `disqualifyReason: null` |
| `disqualified` | Lead completes and is soft-DQ'd. | `answers: {…}`, `outcome: "disqualify"`, `assignedSalesperson: null`, `disqualifyReason: "<reason>"` |

## Ordering & dedup (important)

- `lander_optin` always arrives **first**.
- Then **exactly one** of `partial_submission` *or* (`qualified` | `disqualified`) — never both
  (completing the form suppresses the abandonment beacon).
- ⇒ **A completed lead produces 2 events** (`lander_optin` + `qualified`/`disqualified`).
- There is **no delivery retry** — the form fires fire-and-forget. Your webhook node should
  respond `2xx` immediately and do the slow CRM work after responding.
- **Always upsert the contact by email** in every branch — the contact usually already exists
  from the earlier `lander_optin`.

## The `answers` dictionary

Question answers are keyed by each question's `id` (string values). Reserved contact keys are
prefixed with `__` so they can never collide with a question id:

| Key | Meaning |
|---|---|
| `__country` | Country name (e.g. `United States`) |
| `__country_iso` | ISO-2 (e.g. `US`) — drives the country lead-score tier |
| `__phone_cc` | Dial code (e.g. `+1`) |
| `__website` | Website |
| `<questionId>_other` | Free text when a question's "Other" option is chosen |

`partial_submission` may contain only the subset of answers captured before drop-off.

## Suggested webhook workflow (one node tree)

`Webhook (respond immediately) → Switch on data.event → 4 branches:`

- **`lander_optin`** — upsert contact by email; tag `optin` + `<page key>-lead`; store source + UTMs.
- **`partial_submission`** — upsert; tag `<page key>-partial`; map present answers to fields; start an abandonment workflow.
- **`qualified`** — upsert; assign the owner mapped from `assignedSalesperson`; create/advance an opportunity; map answers to custom fields; notify the rep.
- **`disqualified`** — upsert; tag the DQ; trigger the downsell matching `answers` (the form already shows the lead a downsell + optional short qualification call).

> **GoHighLevel note:** the webhook sends *values*, not GHL custom-field IDs. Pre-create your
> custom fields and map value → field inside your automation.
