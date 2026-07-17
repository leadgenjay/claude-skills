# GoHighLevel CLI

A command-line interface for GoHighLevel that lets you (or Claude Code) drive your CRM from the terminal — contacts, opportunities, calendars, conversations, workflows, emails, payments, forms, social media, locations, and documents.

Built by [Lead Gen Jay](https://leadgenjay.com).

---

## What you get

- **11 command groups** covering the full GHL surface (contacts, opportunities, calendars, workflows, conversations, emails, payments, forms, social, locations, documents).
- **A REPL** — type `ghl` with no args and you get an interactive shell with autocomplete.
- **Workflow builders** — Python scripts that take a markdown file and turn it into a live GHL workflow (see `builders/`).
- **A one-line token helper** — a DevTools console snippet that exports the Firebase token you need for the "internal" GHL API (the public API can't create workflows; the internal one can). See [`docs/get-firebase-token.md`](docs/get-firebase-token.md).
- **A Claude Code skill** at `cli_anything/gohighlevel/skills/SKILL.md` so Claude can use the CLI on your behalf.

---

## Install (60 seconds)

Requirements: **Python 3.10+** and a GoHighLevel sub-account.

```bash
git clone <this repo> gohighlevel-cli
cd gohighlevel-cli
./install.sh
```

The installer creates a `.venv/`, installs the package, and copies `.env.example` → `.env`.

Open `.env` and fill in:

```env
GHL_API_KEY=pit-xxxxxxxx-...        # GHL Settings → Private Integrations
GHL_LOCATION_ID=YOUR_LOCATION_ID    # the long ID in your GHL URL
```

Smoke test:

```bash
./ghl contacts list --limit 5
```

You should see 5 contacts (or an empty list, depending on the account). Done.

---

## Quickstart examples

```bash
# Contacts
./ghl contacts search --query "jay@"
./ghl contacts create --first-name Jay --last-name Test --email jay@test.com
./ghl contacts tags add --contact-id <id> --tag consulti_trial

# Workflows
./ghl --json workflows list
./ghl workflows enroll --contact-id <id> --workflow-id <id>

# Opportunities
./ghl opportunities list --pipeline-id <id>

# Conversations
./ghl conversations list --contact-id <id>

# REPL (no args = interactive shell with autocomplete)
./ghl
```

`--json` works on most read commands and pipes cleanly into `jq`.

---

## Workflow building

Almost everything in this CLI runs on the official, scoped **Private Integration Token** (`GHL_API_KEY`) against GHL's public API — that's the safe default and all you need for contacts, opportunities, calendars, conversations, payments, enrolling contacts in existing workflows, and more.

The one thing the public API **can't** do is *create or update* workflows. There are two ways to handle that:

### Recommended: build once, ship a Snapshot

Build the workflow once in the GHL UI, then save it to a **Snapshot**. New sub-accounts inherit the workflow when you provision them from that Snapshot — no token, no internal API, nothing to leak. **This is the right path for provisioning client accounts**, and it covers the large majority of real use cases.

### Advanced (experimental): programmatic creation via the internal API

If you genuinely need to create workflows *programmatically* (e.g. generating sequences from markdown), the CLI can drive GHL's **internal** API. This is powerful but comes with real trade-offs — read the warning before you use it.

> ⚠️ **Use this on YOUR OWN agency account only.**
> - The Firebase refresh token is **your entire GHL login** (full account access), **not** a scoped key. Anyone who gets it can do anything you can.
> - **Never** paste a *client's* token, and never run the internal API against client sub-accounts. Provision client workflows with Snapshots instead.
> - It talks to GHL's **unofficial** internal API (`backend.leadconnectorhq.com`) — no SLA, may change or break without notice, and may run against GHL's ToS. Workflows are always created as **draft**.
> - Treat the token like a password: it's already gitignored, but prefer sourcing it from a secret manager / OS keychain rather than leaving it at rest in `.env`. See [`docs/get-firebase-token.md`](docs/get-firebase-token.md).

### Step 1 — grab the token

Open `app.gohighlevel.com` (logged in), open DevTools (**⌘⌥J** / **Ctrl-Shift-J**), and paste this into the Console:

```js
(async () => {
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open("firebaseLocalStorageDb");
    r.onsuccess = e => res(e.target.result);
    r.onerror = () => rej("Cannot open IndexedDB");
  });
  const entries = await new Promise((res, rej) => {
    const tx = db.transaction("firebaseLocalStorage", "readonly");
    const all = tx.objectStore("firebaseLocalStorage").getAll();
    all.onsuccess = () => res(all.result);
    all.onerror = () => rej("Failed to read store");
  });
  for (const e of entries) {
    const stm = (e?.value || e)?.stsTokenManager;
    if (stm?.refreshToken) {
      copy(stm.refreshToken); // DevTools copy() → clipboard
      console.log("✓ Refresh token copied. Paste into .env as GHL_FIREBASE_REFRESH_TOKEN=");
      return;
    }
  }
  console.warn("No refresh token found — make sure you're logged into GHL.");
})();
```

It copies your refresh token to the clipboard. Paste it into your `.env` as `GHL_FIREBASE_REFRESH_TOKEN=...`. Full walkthrough: [`docs/get-firebase-token.md`](docs/get-firebase-token.md).

### Step 2 — build a workflow

`builders/` has example builders that turn a markdown email-sequence doc into a live workflow:

```bash
# Course Interest sequence (10 emails, 14 days)
python builders/wf1-course-interest-builder.py

# High Ticket Interest sequence (5 emails + 1 SMS)
python builders/wf5-ht-interest-builder.py

# Post-Call Sales (3 tag-triggered branch workflows)
python builders/wf6-post-call-sales-builder.py

# Consulti free-trial nurture (8 emails)
python builders/consulti-nurture-builder.py

# Post-purchase nurture (6 emails)
python builders/post-purchase-nurture-builder.py
```

Each builder supports `--update` to re-deploy without creating a duplicate workflow.

---

## Project layout

```
gohighlevel-cli/
├── ghl                         # the executable wrapper
├── setup.py                    # package definition
├── install.sh                  # one-shot installer
├── .env.example                # template for your secrets
│
├── cli_anything/               # the actual Python package
│   ├── gohighlevel/            # GHL commands (the main thing)
│   │   ├── gohighlevel_cli.py  # ~1,260 lines of CLI
│   │   ├── utils/              # API clients (public + internal + workflow builder)
│   │   └── skills/SKILL.md     # Claude Code skill manifest
│   ├── nextcloud/              # bonus: Nextcloud CLI
│   └── blotato/                # bonus: Blotato CLI
│
├── docs/
│   └── get-firebase-token.md   # DevTools snippet for the internal-API token
│
└── builders/                   # example workflow builders
    ├── wf1-course-interest-builder.py
    ├── wf5-ht-interest-builder.py
    ├── wf6-post-call-sales-builder.py
    ├── consulti-nurture-builder.py
    ├── post-purchase-nurture-builder.py
    ├── email-sequences-doc-builder.py
    └── _email_sequences_parser.py
```

---

## Using it with Claude Code

The repo includes a Claude Code skill so Claude can call the CLI on your behalf:

1. Copy `cli_anything/gohighlevel/skills/SKILL.md` into a Claude Code skills directory (e.g. `~/.claude/skills/gohighlevel-cli/SKILL.md`).
2. Add `ghl` to your shell's PATH (or symlink the `ghl` wrapper somewhere on PATH).
3. In any Claude Code session, say "use the gohighlevel-cli skill" and Claude will be able to run `ghl ...` for you.

---

## Two layers of GHL API

The CLI talks to two APIs:

| API | What it can do | How it authenticates |
|-----|----------------|----------------------|
| **Public** (`services.leadconnectorhq.com`) | Read everything, create contacts/opportunities/etc. **Workflows are GET-only here.** | `GHL_API_KEY` (Private Integration Token) |
| **Internal** (`backend.leadconnectorhq.com`) | Everything the GHL UI can do — including **creating workflows**. Hidden behind a `--experimental` flag on commands that use it. | Firebase JWT, refreshed from `GHL_FIREBASE_REFRESH_TOKEN` |

You only need the Firebase token if you want to **build** workflows. Everything else works with just the API key.

---

## Security notes

- The public API uses a **scoped Private Integration Token** (`GHL_API_KEY`) — revocable in the GHL dashboard without touching the rest of your session. Prefer it; it's all most workflows need.
- The Firebase refresh token is **your entire GHL login** (full account access), not a scoped key. **Use it on your own agency account only — never a client's**, and prefer Snapshots for provisioning client workflows (see [Workflow building](#workflow-building)).
- Treat the Firebase token like a password. `.env` is gitignored — **never** commit it — and prefer sourcing the token from a secret manager / OS keychain over leaving it at rest in `.env`.
- The internal API (`backend.leadconnectorhq.com`) is **unofficial**: no SLA, may change or break without notice, and may run against GHL's ToS. It's gated behind `--experimental`, and the CLI prints a one-time warning when it's used (suppress with `GHL_SUPPRESS_INTERNAL_WARNING=1`).
- The token-grab snippet only **reads** from your own browser's IndexedDB on the GHL tab and uses the built-in DevTools `copy()` helper — it makes no network calls. See [`docs/get-firebase-token.md`](docs/get-firebase-token.md).

---

## License

Private / personal use.
