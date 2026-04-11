---
name: listmonk
description: "Compose and send emails via Listmonk. Send transactional emails to individuals or campaigns to lists. Use when the user says '/listmonk', 'send email', 'email blast', 'send newsletter', 'compose email', or 'listmonk send'."
---

# Send Email via Listmonk

Compose and send branded Consulti emails through the self-hosted Listmonk instance.

## Voice & Tone

**IMPORTANT:** All email copy MUST use Jay's brand voice. Load the `brand-voice` skill (`.claude/skills/brand-voice/SKILL.md`) before composing any email content. Apply the hard rules, tone mode selection, and voice fidelity checklist from that skill. Key reminders:
- No em dashes or en dashes. Use hyphens or ellipsis.
- No banned AI words or phrases.
- No paragraphs over 3 sentences.
- Conversational, direct, specific. Write like Jay texts a smart friend.
- Use Jay's signature phrases and sign-offs naturally.
- Run the 10-point voice fidelity checklist before sending.

## API Credentials

- **URL**: `https://mail.consulti.ai`
- **Auth**: Basic Auth `leadgenjay_api:wXh1cbi98WCXMrpNcZaOv2hd7yyhxOqb`
- **TX Template ID**: 5 (passthrough — uses `{{ .Tx.Data.body | Safe }}`)

## Workflow

### 1. Gather Details

Use `AskUserQuestion` to collect:

- **Recipient**: Single email address OR a Listmonk list (ask which one)
- **Subject line**: What the email is about
- **Email content**: What to say (user can provide bullet points, you'll craft the HTML)

### 2. Available Lists

Fetch current lists if needed:
```bash
curl -s -u 'leadgenjay_api:wXh1cbi98WCXMrpNcZaOv2hd7yyhxOqb' 'https://mail.consulti.ai/api/lists' | python3 -c "import sys,json; [print(f'  ID {l[\"id\"]}: {l[\"name\"]} ({l[\"subscriber_count\"]} subscribers)') for l in json.load(sys.stdin)['data']]"
```

Known lists:
- 5: Transactional (all users)
- 6: Getting Started
- 7: New Features
- 8: Marketing
- 9: Credit Warning
- 10: Customers (paying users)

### 3. Generate HTML Email

Use the Consulti email template structure:

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;">
<div style="max-width:560px;margin:0 auto;padding:40px 20px;">
  <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
    <div style="text-align:center;padding:0 0 24px 0;">
      <img src="https://consulti.ai/logo.png" alt="Consulti" style="height:32px;">
    </div>
    <!-- CONTENT HERE -->
  </div>
  <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:20px;line-height:1.5;">
    Consulti &middot; 7901 4th St N #25620, St. Petersburg, FL 33702<br>
    <a href="https://consulti.ai/settings/email-preferences" style="color:#9ca3af;">Email Preferences</a> &middot; <a href="https://consulti.ai/settings/email-preferences" style="color:#9ca3af;">Unsubscribe</a>
  </p>
</div>
</body>
</html>
```

**Brand tokens:**
- Primary: `#ED0D51`, hover: `#d40b48`
- Gradient: `linear-gradient(135deg, #ED0D51, #FF3D71)`
- Text: `#111827` (heading), `#4b5563` (body), `#9ca3af` (footer)
- Background: `#f9fafb`, Card: `#ffffff`, Border: `#e5e7eb`
- Button: `background:#ED0D51;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;`

### 4. Preview

Show the user a summary before sending:
- To: [recipient or list name]
- Subject: [subject]
- Preview of content (text version)

Ask for confirmation using `AskUserQuestion`.

### 5. Send

**Single recipient (transactional):**
```bash
curl -s -X POST -u 'leadgenjay_api:wXh1cbi98WCXMrpNcZaOv2hd7yyhxOqb' \
  'https://mail.consulti.ai/api/tx' \
  -H 'Content-Type: application/json' \
  -d '{
    "subscriber_email": "RECIPIENT_EMAIL",
    "template_id": 5,
    "data": {
      "subject": "SUBJECT_HERE",
      "body": "HTML_BODY_HERE"
    },
    "content_type": "html"
  }'
```

**List campaign (bulk):**
1. Create campaign:
```bash
curl -s -X POST -u 'leadgenjay_api:wXh1cbi98WCXMrpNcZaOv2hd7yyhxOqb' \
  'https://mail.consulti.ai/api/campaigns' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "CAMPAIGN_NAME",
    "subject": "SUBJECT",
    "lists": [LIST_ID],
    "from_email": "Consulti <noreply@in.consulti.ai>",
    "type": "regular",
    "content_type": "html",
    "body": "HTML_BODY",
    "template_id": 1,
    "send_at": null
  }'
```
2. Get the campaign ID from the response
3. Start the campaign:
```bash
curl -s -X PUT -u 'leadgenjay_api:wXh1cbi98WCXMrpNcZaOv2hd7yyhxOqb' \
  'https://mail.consulti.ai/api/campaigns/CAMPAIGN_ID/status' \
  -H 'Content-Type: application/json' \
  -d '{"status": "running"}'
```

### 6. Confirm

Report back: "Email sent to [recipient/list] with subject [subject]"

For campaigns, check status:
```bash
curl -s -u 'leadgenjay_api:wXh1cbi98WCXMrpNcZaOv2hd7yyhxOqb' \
  'https://mail.consulti.ai/api/campaigns/CAMPAIGN_ID' | python3 -c "import sys,json; c=json.load(sys.stdin)['data']; print(f'Status: {c[\"status\"]}, Sent: {c[\"sent\"]}, Views: {c[\"views\"]}')"
```

## Important Notes

- Always use `| Safe` in the passthrough template (template ID 5) — already configured
- For campaigns, use template ID 1 (Default campaign template — Consulti branded)
- Always include the CAN-SPAM footer (mailing address + unsubscribe)
- Never send without user confirmation
- The `from_email` should always be `Consulti <noreply@in.consulti.ai>`
