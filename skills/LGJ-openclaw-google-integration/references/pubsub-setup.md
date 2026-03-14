# Google Pub/Sub Setup Reference

Detailed reference for configuring Google Cloud Pub/Sub to push real-time Gmail notifications to OpenClaw.

---

## Architecture Overview

```
Gmail → Cloud Pub/Sub Topic → Push Subscription → Your HTTPS Endpoint → OpenClaw
```

1. Gmail sends a push notification to the Pub/Sub topic whenever your inbox changes
2. Pub/Sub immediately forwards it to your webhook endpoint
3. OpenClaw processes the notification and fetches the new email details via Gmail API

---

## Prerequisites

Before starting:

- [ ] GCP project created with Pub/Sub API enabled
- [ ] `gcloud` CLI installed (`brew install google-cloud-sdk` on Mac)
- [ ] `gcloud auth login` completed
- [ ] `gog` CLI installed and authenticated
- [ ] A public HTTPS endpoint (see Tailscale section below)

---

## Step 1: Enable Pub/Sub API

```bash
gcloud services enable pubsub.googleapis.com \
  --project=YOUR_PROJECT_ID
```

Verify it's enabled:

```bash
gcloud services list --enabled --project=YOUR_PROJECT_ID | grep pubsub
```

---

## Step 2: Create the Topic

```bash
gcloud pubsub topics create gog-gmail-watch \
  --project=YOUR_PROJECT_ID
```

Verify creation:

```bash
gcloud pubsub topics list --project=YOUR_PROJECT_ID
```

---

## Step 3: Grant Gmail Publisher Permission

Gmail needs permission to publish notifications to your topic. This uses a Google-managed service account (`gmail-api-push@system.gserviceaccount.com`) — you do not create it.

```bash
gcloud pubsub topics add-iam-policy-binding gog-gmail-watch \
  --member="serviceAccount:gmail-api-push@system.gserviceaccount.com" \
  --role="roles/pubsub.publisher" \
  --project=YOUR_PROJECT_ID
```

Verify the binding was applied:

```bash
gcloud pubsub topics get-iam-policy gog-gmail-watch \
  --project=YOUR_PROJECT_ID
```

You should see `gmail-api-push@system.gserviceaccount.com` listed with `roles/pubsub.publisher`.

---

## Step 4: Create the Push Subscription

```bash
gcloud pubsub subscriptions create gog-gmail-sub \
  --topic=gog-gmail-watch \
  --push-endpoint=https://YOUR_PUBLIC_URL/webhooks/gmail \
  --ack-deadline=30 \
  --message-retention-duration=1d \
  --project=YOUR_PROJECT_ID
```

**Parameter notes:**
- `--ack-deadline=30` — OpenClaw has 30 seconds to acknowledge each message before Pub/Sub retries
- `--message-retention-duration=1d` — Unacknowledged messages are retained for 1 day
- Replace `YOUR_PUBLIC_URL` with your actual HTTPS endpoint

Verify the subscription:

```bash
gcloud pubsub subscriptions describe gog-gmail-sub \
  --project=YOUR_PROJECT_ID
```

---

## Step 5: Start Gmail Watch

Register your inbox with Google to start sending notifications:

```bash
gog gmail watch start \
  --topic projects/YOUR_PROJECT_ID/topics/gog-gmail-watch \
  --label INBOX
```

To watch multiple labels:

```bash
gog gmail watch start \
  --topic projects/YOUR_PROJECT_ID/topics/gog-gmail-watch \
  --label INBOX \
  --label SENT
```

Check watch status:

```bash
gog gmail watch status
```

**Important:** Gmail watch registrations expire after exactly 7 days. Set up renewal.

---

## Step 6: Automate Watch Renewal

Add to crontab (`crontab -e`):

```bash
# Renew Gmail watch every 6 days (before the 7-day expiry)
0 8 */6 * * /usr/local/bin/gog gmail watch start --topic projects/YOUR_PROJECT_ID/topics/gog-gmail-watch --label INBOX >> ~/.openclaw/logs/gmail-watch-renewal.log 2>&1
```

Or as an OpenClaw cron YAML (`~/.openclaw/crons/gmail-watch-renewal.yaml`):

```yaml
name: gmail-watch-renewal
schedule: "0 8 */6 * *"
action: gog gmail watch start --topic projects/YOUR_PROJECT_ID/topics/gog-gmail-watch --label INBOX
description: Renew Gmail Pub/Sub watch before 7-day expiry
timezone: America/New_York
```

---

## Step 7: Start the Webhook Handler

```bash
# Start on default port 8080
gog gmail watch serve

# Specify a custom port
gog gmail watch serve --port 3001

# Run in background
gog gmail watch serve --port 8080 &
```

The handler:
1. Receives POST requests from Pub/Sub
2. Decodes the base64-encoded notification
3. Fetches the new email(s) via Gmail API
4. Triggers your configured OpenClaw actions

---

## Tailscale Funnel: Public HTTPS for Local Dev

Tailscale Funnel exposes a local port to the internet over HTTPS. No server required.

### Setup

```bash
# Install Tailscale if not already installed
brew install tailscale

# Authenticate
tailscale up

# Expose port 8080 publicly
tailscale funnel 8080
```

Output will include your public URL:
```
https://your-machine.tail1234.ts.net → http://localhost:8080
```

Use this URL as your `--push-endpoint` in Step 4.

### Update Subscription Endpoint

If your Tailscale URL changes, update the subscription:

```bash
gcloud pubsub subscriptions modify-push-config gog-gmail-sub \
  --push-endpoint=https://NEW_URL/webhooks/gmail \
  --project=YOUR_PROJECT_ID
```

---

## Testing the Setup

### Send a Test Notification

Publish a fake message to verify your webhook handler is receiving:

```bash
gcloud pubsub topics publish gog-gmail-watch \
  --message='{"emailAddress":"you@gmail.com","historyId":"12345"}' \
  --project=YOUR_PROJECT_ID
```

Your webhook endpoint should receive a POST within 1–2 seconds.

### Check Subscription Metrics

```bash
# View undelivered message count
gcloud pubsub subscriptions describe gog-gmail-sub \
  --project=YOUR_PROJECT_ID \
  --format="value(pushConfig,messageRetentionDuration)"

# Pull messages manually (useful for debugging)
gcloud pubsub subscriptions pull gog-gmail-sub \
  --max-messages=5 \
  --project=YOUR_PROJECT_ID
```

### Verify Watch is Active

```bash
gog gmail watch status
```

Expected output:
```
Gmail watch active
Topic: projects/YOUR_PROJECT_ID/topics/gog-gmail-watch
Expiration: 2024-03-22T08:00:00Z
Labels: INBOX
```

---

## Webhook Payload Structure

Pub/Sub delivers messages as JSON with a base64-encoded `data` field:

```json
{
  "message": {
    "data": "eyJlbWFpbEFkZHJlc3MiOiJ5b3VAZ21haWwuY29tIiwiaGlzdG9yeUlkIjoiMTIzNDUifQ==",
    "messageId": "1234567890",
    "publishTime": "2024-03-15T14:30:00Z"
  },
  "subscription": "projects/YOUR_PROJECT_ID/subscriptions/gog-gmail-sub"
}
```

Decoded `data`:
```json
{
  "emailAddress": "you@gmail.com",
  "historyId": "12345"
}
```

The `historyId` is used to fetch the actual emails that changed. OpenClaw's `gog gmail watch serve` handles this automatically — it calls the Gmail History API to get the specific messages added since the last known `historyId`.

---

## Common Pub/Sub Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `PERMISSION_DENIED: User not authorized` | gmail-api-push service account not added as publisher | Re-run Step 3 IAM binding |
| `NOT_FOUND: Resource not found (topic)` | Topic doesn't exist or wrong project ID | Verify topic name and project ID |
| `DEADLINE_EXCEEDED` | Webhook handler didn't respond within ack-deadline | Check handler is running; increase `--ack-deadline` |
| `Push endpoint returned HTTP 404` | Wrong URL or handler not running | Verify URL and start `gog gmail watch serve` |
| `Push endpoint returned HTTP 500` | Handler crashed on message | Check `~/.openclaw/logs/` for error details |
| `Watch registration failed` | Pub/Sub topic not found or no publisher permission | Complete Steps 2–3 before running Step 5 |
| `Watch expiration: past` | 7-day watch expired | Re-run `gog gmail watch start` |
| `Quota exceeded for pubsub` | Exceeded free tier (10GB/month) | Review message volume or upgrade billing |

---

## Monitoring and Logs

### OpenClaw Logs

```bash
# Watch live webhook activity
tail -f ~/.openclaw/logs/gmail-webhook.log

# Check for errors
grep -i error ~/.openclaw/logs/gmail-webhook.log | tail -20

# Check watch renewal log
cat ~/.openclaw/logs/gmail-watch-renewal.log
```

### GCP Console Monitoring

In the GCP Console, go to **Pub/Sub > Subscriptions > gog-gmail-sub > Metrics** to view:
- Message delivery latency
- Undelivered message count
- Oldest unacked message age

A healthy subscription shows:
- Latency < 2 seconds
- Undelivered count near 0
- Oldest unacked age < 30 seconds

---

## Cleanup

To remove all Pub/Sub resources:

```bash
# Stop Gmail watch
gog gmail watch stop

# Delete subscription
gcloud pubsub subscriptions delete gog-gmail-sub \
  --project=YOUR_PROJECT_ID

# Delete topic
gcloud pubsub topics delete gog-gmail-watch \
  --project=YOUR_PROJECT_ID
```

---

## Cron Fallback Pairing

Pub/Sub is reliable but not guaranteed (network issues, handler downtime). Always pair with a polling fallback:

```yaml
# ~/.openclaw/crons/gmail-fallback.yaml
name: gmail-fallback-poll
schedule: "*/10 * * * *"
action: gog mail list --unread --since-minutes 15 --limit 50
description: Catch emails missed during Pub/Sub downtime
```

This polls every 10 minutes and fetches any unread emails from the last 15 minutes — overlapping coverage ensures no emails are dropped.
