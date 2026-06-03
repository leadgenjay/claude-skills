# Kit Integration Guide

CLI + API patterns for Lead Gen Jay email campaigns in Kit.com (formerly ConvertKit). Replaced the Beehiiv integration on 2026-05-21.

---

## Account Details

| Setting | Value |
|---------|-------|
| Platform | Kit.com (formerly ConvertKit) |
| API | v4 REST API — `https://api.kit.com/v4/` |
| Auth | `KIT_API_KEY` env var (v4 API key) sent as the `X-Kit-Api-Key` header |
| Get a key | <https://app.kit.com/account_settings/developer_settings> → "Add a new key" (copy immediately — not retrievable later) |
| SDK | **None** for v4 — the CLI calls REST directly via `fetch` |
| CLI | `kit` (npm script `kit`, or alias to `npx tsx cli/kit/index.ts`) — canonical interface |
| MCP | Kit's official MCP (`https://app.kit.com/mcp`, OAuth) is **intentionally not registered** — CLI covers the full v4 surface |
| Sender | jay@leadgenjay.com (authenticated domain) |
| Rate limit | 120 requests / rolling 60s per API key |

---

## CLI quickstart

```sh
# Help
kit --help

# Verify auth
kit account get

# Subscribers
kit subscribers list --limit 20
kit subscribers get 123456
kit subscribers create --email new@example.com --first-name Jane --field segment=trial
kit subscribers update 123456 --field segment=customer
kit subscribers unsubscribe 123456

# Broadcasts (one-off emails)
kit broadcasts list
kit broadcasts show 987
kit broadcasts create --subject "Subject" --body-file post.md --dry-run
kit broadcasts create --subject "Subject" --body-file post.md --send-at 2026-05-25T14:00:00Z

# Sequences (linear nurture drips) — fully API-authorable
kit sequences create --name "LGJ Nurture"
kit sequence-emails create --sequence 55 --subject "Welcome" --delay-value 0 --delay-unit days --body-file e1.md --published
kit sequences update 55 --active
kit sequences add-subscriber 55 --email user@example.com

# Tags / segments / custom fields
kit tags list
kit tags create --name "vip"
kit tags add 12 --email user@example.com
kit segments list
kit custom-fields list
kit custom-fields create --label "Segment"
```

See `cli/kit/README.md` for the full command surface.

---

## REST patterns (no SDK)

The CLI's `cli/kit/client.ts` is a thin `fetch` wrapper. To call Kit from other scripts:

```ts
const KIT_BASE = "https://api.kit.com/v4";

async function kit(path: string, init: RequestInit = {}) {
  const res = await fetch(KIT_BASE + path, {
    ...init,
    headers: {
      "X-Kit-Api-Key": process.env.KIT_API_KEY!,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Kit ${res.status}: ${(body.errors ?? []).join("; ")}`);
  }
  return res.status === 204 ? undefined : res.json();
}

// Create a subscriber (upsert by email)
await kit("/subscribers", {
  method: "POST",
  body: JSON.stringify({
    email_address: "user@example.com",
    first_name: "Jane",
    fields: { segment: "trial" },
  }),
});
```

Errors come back as `{ "errors": ["message", ...] }`. Pagination is cursor-based — list responses carry `pagination.end_cursor`; pass it as `?after=<cursor>`.

---

## Request schemas

### Broadcast (`POST /v4/broadcasts`)

```json
{
  "subject": "Hello!",
  "content": "<p>Email body as HTML</p>",
  "description": "Internal label",
  "preview_text": "Inbox preview snippet",
  "public": false,
  "published_at": "2026-05-21T12:00:00Z",
  "send_at": null,
  "subscriber_filter": [{ "all": [{ "type": "tag", "ids": [123] }], "any": null, "none": null }]
}
```

`send_at: null` keeps it a draft; an ISO timestamp schedules it. Omit `subscriber_filter` to target the whole list.

### Sequence (`POST /v4/sequences`)

```json
{
  "name": "LGJ Nurture",
  "email_address": "jay@leadgenjay.com",
  "send_days": ["monday", "wednesday", "friday"],
  "send_hour": 9,
  "time_zone": "America/New_York",
  "active": true
}
```

Only `name` is required — this creates an *empty* sequence.

### Sequence email (`POST /v4/sequences/{sequence_id}/emails`)

```json
{
  "subject": "Welcome to the sequence",
  "delay_value": 1,
  "delay_unit": "days",
  "content": "<p>Email body as HTML</p>",
  "preview_text": "...",
  "published": true,
  "position": 0
}
```

`delay_unit` is `days` or `hours`. Only the first email may use `delay_value: 0`. `published: false` keeps the email a draft.

---

## Content model

Kit broadcasts and sequence emails take a `content` **HTML string** (not structured blocks like Beehiiv). Three ways to supply it via the CLI:

| Flag | Behavior |
|------|----------|
| `--body-file post.md` | Markdown converted to HTML by `cli/kit/lib/markdown.ts` — headings, paragraphs, `**bold**`, `[text](url)` links, lists. Best for LGJ plain-text-style emails. |
| `--html-file post.html` | Raw HTML, used verbatim. |
| `--content "<p>..</p>"` | Inline HTML string. |

> Markdown gotcha: a line starting with `- ` becomes a `<li>`. Write the `- Jay` sign-off as a plain line, or use `--html-file`.

---

## Merge tags (Kit / Liquid syntax)

Kit uses **Liquid** templating:

```
Hi {{ subscriber.first_name | default: "there" }},

You can update your details any time.
```

| Field | Tag |
|-------|-----|
| First name | `{{ subscriber.first_name }}` |
| Email | `{{ subscriber.email_address }}` |
| Custom field | `{{ subscriber.<key> }}` — the field's `key` (lowercased, underscored — e.g. `last_name`, not `Last Name`) |
| Snippet | `{{ snippet.<key> }}` — reusable content block |
| Fallback | Liquid `default` filter: `{{ subscriber.first_name \| default: "there" }}` |

**Cross-tool reference (do NOT mix):**

| Tool | First-name tag | Fallback |
|------|----------------|----------|
| Kit | `{{ subscriber.first_name }}` | `{{ subscriber.first_name \| default: "there" }}` |
| GHL | `{{contact.first_name}}` | **bare — never `\|\| "..."` (GHL renders it literally)** |
| Beehiiv *(retired 2026-05-21)* | `{{ first_name }}` | — |
| Brevo *(retired 2026-05-15)* | `{{ contact.FIRSTNAME }}` | — |

The CLI's merge-tag validator (`cli/kit/lib/merge-tags.ts`) catches Beehiiv bare tags, GHL tags, and Brevo tags that leaked into Kit content, and aborts before submit.

> Verify the exact custom-field tag form against a live test send if unsure — Kit resolves `{{ subscriber.<key> }}` against the custom field `key`, which the API auto-generates from the label.

---

## Subscribers & custom fields

- **Create is an upsert** — `POST /v4/subscribers` with an existing email updates `first_name` instead of erroring.
- **Custom fields** are passed in the `fields` object keyed by the field's `key` (not its label). An unknown key returns a 422.
- **Create a custom field:** `kit custom-fields create --label "Segment"` — Kit derives the `key` (`segment`) automatically. Re-run `kit custom-fields list` to discover current keys before assuming.
- Subscriber states: `active`, `inactive`, `bounced`, `complained`, `cancelled`.

---

## Sequences (nurture drips)

Unlike Beehiiv, Kit sequences are **fully API-authorable**:

| Op | CLI |
|----|-----|
| Create empty sequence | `kit sequences create --name "..."` |
| Add an email | `kit sequence-emails create --sequence <id> --subject ... --delay-value <n> --delay-unit days --body-file e.md --published` |
| Reorder / edit an email | `kit sequence-emails update <emailId> --sequence <id> --position <n>` |
| Activate | `kit sequences update <id> --active` |
| Enroll a subscriber | `kit sequences add-subscriber <id> --email user@example.com` |
| List enrolled subscribers | `kit sequences subscribers <id>` |

Kit's branching **visual automations** (conditional logic, if/then) are NOT in the API — those are built in the Kit UI. LGJ nurture sequences are linear drips, so the API covers the common case.

---

## Webhooks

Kit supports 15+ events (far richer than Beehiiv's 3). No handler is wired up in this repo yet — skip until a downstream integration needs it.

Key events: `subscriber.subscriber_activate`, `subscriber.subscriber_unsubscribe`, `subscriber.subscriber_bounce`, `subscriber.tag_add`, `subscriber.tag_remove`, `subscriber.form_subscribe`, `subscriber.course_subscribe`, `subscriber.course_complete`, `subscriber.link_click`, `purchase.purchase_create`. Some require an extra id (form, tag, sequence, etc.).

```sh
kit webhooks list
kit webhooks create --url https://yourapp.com/api/webhooks/kit --event subscriber.tag_add --tag-id 123
kit webhooks delete <id>
```

---

## Best practices

### Broadcasts
- Run `--dry-run` on every new broadcast — the CLI validates merge tags and warns on em-dashes.
- Use `--body-file` markdown for plain-text-style emails; `--html-file` for anything richer.
- Schedule with an ISO 8601 UTC datetime: `--send-at 2026-05-25T14:00:00Z`.

### Sequences
- Author the whole sequence with the CLI, confirm in the Kit UI, then activate.
- `delay_value` on each email is measured from the previous step.

### Deliverability
- Domain is authenticated. Keep bounce rate under 2%.
- Kit adds the unsubscribe link automatically — no manual footer needed.

---

## What's NOT available via the API

| Feature | Status | Workaround |
|---------|--------|------------|
| Transactional email (receipts, password resets) | ❌ Newsletter/nurture only | Use GHL or another provider |
| Branching visual automations | ❌ UI-only | Build in the Kit UI; linear sequences are API-authorable |
| Bulk operations (bulk create subscribers, etc.) | ⚠️ Require OAuth, not API key | Loop single-resource calls, or use the Kit UI |
| Purchase creation | ⚠️ Requires OAuth | — |

---

## API reference

Full docs: <https://developers.kit.com/api-reference/overview>. Endpoint index: <https://developers.kit.com/llms.txt>. The authoritative source for exact request/response shapes.
