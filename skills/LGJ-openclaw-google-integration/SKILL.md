---
name: openclaw-google-integration
description: Complete Google Cloud setup for OpenClaw — create GCP project, enable APIs, configure OAuth, authenticate with gog CLI, and use Gmail, Calendar, Drive. Covers Desktop OAuth and Service Account auth. Use when connecting OpenClaw to any Google product.
---

# OpenClaw Google Integration

Connect OpenClaw to Gmail, Google Calendar, Google Drive, Docs, Sheets, and Contacts via the `gog` CLI and Google Cloud Platform.

---

## Overview

Two authentication paths depending on your account type:

| Auth Type | When to Use | Account Type |
|-----------|-------------|--------------|
| **Desktop OAuth** | Personal Gmail, interactive login OK | Any Google account |
| **Service Account** | Always-on bots, no browser available | Google Workspace only |

Both paths require a GCP project. Start here.

---

## 1. Google Cloud Project Setup

### Create the Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click the project picker (top-left) → **New Project**
3. Name it `OpenClaw` → **Create**
4. Wait ~30 seconds, then select the new project from the picker

### Enable Required APIs

Navigate to **APIs & Services > Library** and enable each:

```
Gmail API
Google Calendar API
Google Drive API
```

For real-time email (advanced, covered in Section 8):
```
Cloud Pub/Sub API
```

To enable via CLI (faster if you have gcloud installed):

```bash
gcloud services enable gmail.googleapis.com \
  calendar-json.googleapis.com \
  drive.googleapis.com \
  --project=YOUR_PROJECT_ID
```

### Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Select **External** → **Create**
3. Fill in required fields:
   - App name: `OpenClaw`
   - User support email: your email
   - Developer contact: your email
4. Click **Save and Continue** through Scopes (add none yet)
5. On Test Users: click **Add Users** → add your Gmail address
6. Click **Save and Continue** → **Back to Dashboard**

**Important notes:**
- Publishing status stays **Testing** — that's fine. Testing mode supports up to 100 test users and works indefinitely for personal use.
- Only users you add as test users can authenticate. Add any email that needs access.
- You do NOT need to submit for Google verification for personal/internal use.

---

## 2. OAuth Desktop Credentials

Use this for personal Gmail accounts or any setup where a browser login popup is acceptable.

### Create the Credential

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Application type: **Desktop app**
4. Name: `OpenClaw`
5. Click **Create**
6. Click **Download JSON** on the confirmation dialog

### Install the Credential

```bash
# Move downloaded file to OpenClaw config directory
mv ~/Downloads/client_secret_*.json ~/.openclaw/client_secret.json

# Verify it's in place
ls -la ~/.openclaw/client_secret.json
```

### Protect the Credential

```bash
# Restrict file permissions
chmod 600 ~/.openclaw/client_secret.json
```

Add to `.gitignore` in any project that uses this path:

```
# Google OAuth credentials — NEVER commit
~/.openclaw/client_secret.json
.openclaw/client_secret.json
client_secret*.json
```

The client secret alone cannot grant access — it still requires browser login. But treat it as sensitive: rotate it if exposed.

---

## 3. Service Account Authentication

Use this when running OpenClaw as a bot on Google Workspace (company accounts). No browser popup, no manual re-auth.

**Requirement:** Service accounts can only impersonate users on Google Workspace domains. They cannot access personal `@gmail.com` accounts.

### Create the Service Account

1. Go to **IAM & Admin > Service Accounts**
2. Click **Create Service Account**
3. Name: `openclaw-bot`
4. Description: `OpenClaw automation service account`
5. Click **Create and Continue** → skip role assignment → **Done**

### Generate and Install the JSON Key

1. Click the `openclaw-bot` account in the list
2. Go to the **Keys** tab
3. Click **Add Key > Create new key > JSON** → **Create**
4. Move and secure the downloaded key:

```bash
mv ~/Downloads/openclaw-bot-*.json ~/.openclaw/service-account.json
chmod 600 ~/.openclaw/service-account.json
```

### Enable Domain-Wide Delegation

1. On the service account detail page, click **Edit** (pencil icon)
2. Check **Enable Google Workspace domain-wide delegation**
3. Click **Save**
4. Note the **Client ID** (numeric, ~21 digits) — you'll need it next

### Authorize in Google Workspace Admin

This step is performed by a Workspace admin:

1. Go to [admin.google.com](https://admin.google.com)
2. Navigate to **Security > Access and data control > API controls**
3. Click **Manage Domain Wide Delegation**
4. Click **Add new**
5. Paste the **Client ID** from the previous step
6. Add OAuth scopes (comma-separated):

```
https://www.googleapis.com/auth/calendar,
https://www.googleapis.com/auth/gmail.modify,
https://www.googleapis.com/auth/gmail.send,
https://www.googleapis.com/auth/gmail.readonly,
https://www.googleapis.com/auth/drive.readonly
```

7. Click **Authorize**

### Configure OpenClaw

Edit `~/.openclaw/openclaw.json`:

```json
{
  "google": {
    "authType": "service-account",
    "keyFile": "~/.openclaw/service-account.json",
    "impersonateUser": "you@yourdomain.com"
  }
}
```

Replace `you@yourdomain.com` with the Workspace user the bot should act as.

See [references/google-scopes.md](references/google-scopes.md) for the full scope reference.

---

## 4. gog CLI Installation and Auth

`gog` is the OpenClaw CLI for Google products. Install it via ClawHub, then authenticate once.

### Install

```bash
clawdhub install gog
```

### Authenticate (Desktop OAuth)

```bash
gog auth
```

This opens a browser window. Sign in with your Google account, grant the requested permissions, and you're done. Tokens are stored in `~/.openclaw/tokens/` and auto-refresh — you won't need to re-auth unless the refresh token expires (see Section 9).

### Verify Authentication

```bash
# Check Gmail access
gog mail list

# Check Calendar access
gog calendar list
```

Both should return data without errors. If you see permission errors, confirm the APIs are enabled and your email is added as a test user.

---

## 5. Gmail Commands and Patterns

### Core Commands

| Command | What It Does |
|---------|-------------|
| `gog mail list` | Show recent emails (last 20 by default) |
| `gog mail search "query"` | Search using Gmail operators |
| `gog mail read <id>` | Read full email by message ID |
| `gog mail create` | Open interactive compose |
| `gog mail send` | Send a composed message |
| `gog mail reply <id>` | Reply to a message |
| `gog mail archive <id>` | Archive a message |
| `gog mail label <id> <label>` | Apply a label |

### Search Operators

`gog mail search` supports all Gmail search operators:

```bash
# From a specific sender
gog mail search "from:boss@company.com"

# Subject contains
gog mail search "subject:invoice"

# Unread emails
gog mail search "is:unread"

# Combined
gog mail search "from:boss subject:urgent is:unread"

# Date range
gog mail search "after:2024/01/01 before:2024/12/31"

# Has attachment
gog mail search "has:attachment filename:pdf"

# Label
gog mail search "label:important"
```

### Sending Email

```bash
gog mail send \
  --to "client@example.com" \
  --subject "Follow-up on proposal" \
  --body "Hi, following up on the proposal I sent..."
```

For HTML body or attachments, use a compose file:

```bash
gog mail compose --file ~/email-draft.json
```

---

## 6. Calendar Commands and Patterns

### Core Commands

| Command | What It Does |
|---------|-------------|
| `gog calendar list` | Upcoming events (next 7 days) |
| `gog calendar availability` | Show free/busy time slots |
| `gog calendar create` | Create a new event |
| `gog calendar read <id>` | Get full event details |
| `gog calendar update <id>` | Update an existing event |
| `gog calendar delete <id>` | Delete an event |
| `gog calendar search "query"` | Search events by title/description |

### Checking Availability

```bash
# Free slots today
gog calendar availability --date today

# Free slots this week
gog calendar availability --week

# Free slots for a date range
gog calendar availability --from 2024-03-15 --to 2024-03-22
```

### Creating an Event

```bash
gog calendar create \
  --title "Strategy Call" \
  --start "2024-03-15T14:00:00" \
  --end "2024-03-15T15:00:00" \
  --attendees "client@example.com,partner@example.com" \
  --description "Quarterly strategy review"
```

### Read-Only ICS Alternative (No OAuth)

For read-only calendar access without OAuth setup:

1. In Google Calendar, click the three-dot menu on a calendar → **Settings and sharing**
2. Scroll to **Integrate calendar**
3. Copy the **Secret address in iCal format** URL
4. Store in `~/.openclaw/openclaw.json`:

```json
{
  "google": {
    "calendar": {
      "icsUrl": "https://calendar.google.com/calendar/ical/..."
    }
  }
}
```

Use `gog calendar list --ics` to read from the ICS feed. No token management needed, but write operations are not available.

---

## 7. Drive, Docs, Sheets, and Contacts

### Google Drive

```bash
# Search files
gog drive search "quarterly report"

# List files in a folder
gog drive list --folder "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"

# Read file metadata
gog drive read <file-id>

# Download a file
gog drive download <file-id> --output ~/Downloads/

# List recent files
gog drive list --recent
```

### Google Docs

```bash
# Read document content as plain text
gog docs read <document-id>

# Export document as markdown
gog docs read <document-id> --format markdown

# Search within a document
gog docs search <document-id> "search term"
```

To get a document ID from a URL:
```
https://docs.google.com/document/d/DOCUMENT_ID_IS_HERE/edit
```

### Google Sheets

```bash
# Read an entire sheet
gog sheets read <spreadsheet-id>

# Query a specific range
gog sheets query <spreadsheet-id> --range "Sheet1!A1:D50"

# Get sheet names
gog sheets list <spreadsheet-id>

# Append a row
gog sheets append <spreadsheet-id> --range "Sheet1" --values "val1,val2,val3"
```

### Google Contacts

```bash
# Search contacts by name
gog contacts search "John"

# Search by email
gog contacts search "john@example.com"

# List all contacts
gog contacts list

# Get contact details
gog contacts read <contact-id>
```

---

## 8. Real-Time Email with Pub/Sub (Advanced)

By default, `gog mail list` polls Google's API. For real-time triggers when emails arrive, use Google Cloud Pub/Sub.

### Polling vs Pub/Sub

| Approach | Latency | Setup Complexity | Cost |
|----------|---------|-----------------|------|
| Polling (cron every 5 min) | 1–5 minutes | None | Free |
| Pub/Sub push | < 1 second | Moderate | Free tier usually sufficient |

Use Pub/Sub when you need to respond to emails in near real-time (e.g., auto-reply bots, lead routing).

### Prerequisites

- `gcloud` CLI installed and authenticated
- `gog` CLI installed
- A public HTTPS endpoint (Tailscale Funnel recommended for local dev)
- Pub/Sub API enabled in your GCP project

### Step 1: Create the Pub/Sub Topic

```bash
# Create the topic
gcloud pubsub topics create gog-gmail-watch \
  --project=YOUR_PROJECT_ID

# Grant Gmail permission to publish to it
gcloud pubsub topics add-iam-policy-binding gog-gmail-watch \
  --member="serviceAccount:gmail-api-push@system.gserviceaccount.com" \
  --role="roles/pubsub.publisher" \
  --project=YOUR_PROJECT_ID
```

### Step 2: Create the Push Subscription

```bash
gcloud pubsub subscriptions create gog-gmail-sub \
  --topic=gog-gmail-watch \
  --push-endpoint=https://YOUR_PUBLIC_URL/webhooks/gmail \
  --ack-deadline=30 \
  --project=YOUR_PROJECT_ID
```

### Step 3: Start Gmail Watch

```bash
# Tell Gmail to push notifications to your topic
gog gmail watch start \
  --topic projects/YOUR_PROJECT_ID/topics/gog-gmail-watch \
  --label INBOX
```

Gmail watch registrations expire after 7 days. Renew with a cron:

```bash
# Add to crontab — renew every 6 days
0 0 */6 * * gog gmail watch start --topic projects/YOUR_PROJECT_ID/topics/gog-gmail-watch --label INBOX
```

### Step 4: Start the Webhook Server

```bash
# Start OpenClaw webhook server on port 8080
gog gmail watch serve --port 8080
```

### Pub/Sub Setup Wizard

For an interactive guided setup:

```bash
openclaw webhooks gmail setup
```

This wizard handles topic creation, IAM binding, subscription, and watch registration in one flow.

### Tailscale Funnel for Local Dev

If you need a public HTTPS endpoint for local development:

```bash
# Expose local port 8080 publicly via Tailscale
tailscale funnel 8080
# Returns: https://your-machine.tail1234.ts.net
```

Use that URL as your push endpoint. See [references/pubsub-setup.md](references/pubsub-setup.md) for complete setup details.

### Pair with Cron Fallback

Pub/Sub delivery is reliable but not guaranteed. Always add a polling fallback:

```yaml
# ~/.openclaw/crons/gmail-fallback.yaml
name: gmail-fallback-poll
schedule: "*/10 * * * *"
action: gog mail list --unread --limit 50
description: Catch any emails missed by Pub/Sub
```

---

## 9. Troubleshooting and Gotchas

### "This app isn't verified" Warning

When running `gog auth`, Google shows a warning screen. This is expected for apps in Testing mode.

1. Click **Advanced**
2. Click **Go to OpenClaw (unsafe)**
3. Complete the login

This warning appears because the OAuth app hasn't been submitted to Google for verification. For personal/internal use, it's safe to proceed.

### Token Lifetimes

| Token | Lifetime | Auto-Refresh? | Action When Expired |
|-------|----------|---------------|---------------------|
| Access token | ~1 hour | Yes (automatic) | Nothing needed |
| Refresh token | ~7 days (Testing mode) | No | Re-run `gog auth` |
| Refresh token | Indefinite (Production) | No | Re-run `gog auth` if revoked |
| Client secret | Never expires | N/A | Only rotate if compromised |

Testing-mode refresh tokens expire after 7 days of inactivity. If you use OpenClaw daily, the token stays valid. If you see auth errors after a week away:

```bash
gog auth
```

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Access denied` | Email not added as test user | GCP Console → OAuth consent screen → Add test user |
| `Invalid client` | Wrong or corrupted client_secret.json | Re-download from GCP Console → Credentials |
| `Token has been expired or revoked` | Refresh token expired | Re-run `gog auth` |
| `API not enabled` | API not turned on in GCP | APIs & Services → Library → Enable the API |
| `Quota exceeded` | Hit daily API quota | Wait 24 hours or request quota increase |
| `insufficient_scope` | Missing OAuth scope | Re-run `gog auth` with updated scope config |
| `Domain-wide delegation not configured` | Service account setup incomplete | Complete Admin Console delegation step |
| `The user must be authenticated` | Service account, wrong impersonation email | Verify `impersonateUser` in openclaw.json |

### Token Management Commands

```bash
# Check current auth status
gog auth status

# Force re-authentication
gog auth --force

# Revoke tokens (logout)
gog auth revoke

# List stored tokens
ls ~/.openclaw/tokens/
```

### Security Checklist

- Never commit `client_secret.json` or `service-account.json` to git
- Store all credentials in `~/.openclaw/` with `chmod 600`
- Use a dedicated bot Gmail account for automation, not your personal account
- Revoke tokens immediately if a machine is compromised: GCP Console → Credentials → Revoke
- Request only the scopes you need — use `gmail.readonly` if you don't send email
- Rotate service account keys every 90 days for production bots

---

## Related Skills

- **LGJ-openclaw-cron-automation** — Schedule Gmail/Calendar tasks on a recurring basis
- **LGJ-openclaw-security-auditor** — Audit credential storage and permission scope
- **LGJ-openclaw-mcp-server-setup** — Add Google APIs as MCP tools

---

## References

- [google-scopes.md](references/google-scopes.md) — Full OAuth scope reference
- [pubsub-setup.md](references/pubsub-setup.md) — Detailed Pub/Sub configuration
- [GCP Console](https://console.cloud.google.com) — Manage projects, APIs, credentials
- [Google OAuth Playground](https://developers.google.com/oauthplayground) — Test scopes interactively
- [Pub/Sub Documentation](https://cloud.google.com/pubsub/docs) — Google's official reference
