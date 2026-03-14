# Google OAuth Scopes Reference

All OAuth scopes used by OpenClaw Google Integration. Use the minimum scopes required for your use case.

---

## Gmail Scopes

| Scope Name | Full URL | Access | When to Use |
|------------|----------|--------|-------------|
| `gmail.readonly` | `https://www.googleapis.com/auth/gmail.readonly` | Read-only | Read and search emails, no sending or modifying |
| `gmail.send` | `https://www.googleapis.com/auth/gmail.send` | Write-only | Send emails only, cannot read inbox |
| `gmail.modify` | `https://www.googleapis.com/auth/gmail.modify` | Read + Write | Read, send, archive, label — everything except delete |
| `gmail.labels` | `https://www.googleapis.com/auth/gmail.labels` | Labels only | Create and manage labels without reading message content |
| `gmail.metadata` | `https://www.googleapis.com/auth/gmail.metadata` | Metadata only | Read headers/subject/sender only, not message body |

**Recommendation:** Use `gmail.modify` for bots that read and reply. Use `gmail.readonly` for monitoring-only workflows.

---

## Google Calendar Scopes

| Scope Name | Full URL | Access | When to Use |
|------------|----------|--------|-------------|
| `calendar.readonly` | `https://www.googleapis.com/auth/calendar.readonly` | Read-only | Read events and free/busy info |
| `calendar` | `https://www.googleapis.com/auth/calendar` | Full | Create, edit, delete events and calendars |
| `calendar.events` | `https://www.googleapis.com/auth/calendar.events` | Events only | Create and modify events, not calendar settings |
| `calendar.events.readonly` | `https://www.googleapis.com/auth/calendar.events.readonly` | Read events only | View events, not free/busy or calendar settings |

**Recommendation:** Use `calendar.events` for scheduling bots (narrower than full `calendar`). Use `calendar.readonly` for availability checks.

---

## Google Drive Scopes

| Scope Name | Full URL | Access | When to Use |
|------------|----------|--------|-------------|
| `drive.readonly` | `https://www.googleapis.com/auth/drive.readonly` | Read-only | Search and read files, no modifications |
| `drive` | `https://www.googleapis.com/auth/drive` | Full | All file operations including create, edit, delete |
| `drive.file` | `https://www.googleapis.com/auth/drive.file` | App files only | Only files created or opened by this app |
| `drive.metadata.readonly` | `https://www.googleapis.com/auth/drive.metadata.readonly` | Metadata only | File names, sizes, dates — not file content |

**Recommendation:** Use `drive.readonly` for document reading workflows. Avoid full `drive` scope unless you need to create or delete files.

---

## Google Docs Scopes

| Scope Name | Full URL | Access | When to Use |
|------------|----------|--------|-------------|
| `documents.readonly` | `https://www.googleapis.com/auth/documents.readonly` | Read-only | Read document content and structure |
| `documents` | `https://www.googleapis.com/auth/documents` | Full | Read and write document content |

**Note:** `drive.readonly` is required alongside Docs scopes to list and access files. The Docs API scope alone does not grant file discovery.

---

## Google Sheets Scopes

| Scope Name | Full URL | Access | When to Use |
|------------|----------|--------|-------------|
| `spreadsheets.readonly` | `https://www.googleapis.com/auth/spreadsheets.readonly` | Read-only | Read cell data and sheet structure |
| `spreadsheets` | `https://www.googleapis.com/auth/spreadsheets` | Full | Read and write cell data |

**Note:** Same as Docs — `drive.readonly` required to list and locate spreadsheet files.

---

## Google Contacts Scopes

| Scope Name | Full URL | Access | When to Use |
|------------|----------|--------|-------------|
| `contacts.readonly` | `https://www.googleapis.com/auth/contacts.readonly` | Read-only | Search and read contact records |
| `contacts` | `https://www.googleapis.com/auth/contacts` | Full | Read, create, update, delete contacts |

---

## Google Pub/Sub Scopes (Advanced)

| Scope Name | Full URL | Access | When to Use |
|------------|----------|--------|-------------|
| `pubsub` | `https://www.googleapis.com/auth/pubsub` | Full | Create topics, subscriptions, publish and receive messages |
| `cloud-platform` | `https://www.googleapis.com/auth/cloud-platform` | Full GCP | All GCP services — overly broad, avoid if possible |

**Recommendation:** Use the specific `pubsub` scope rather than `cloud-platform`.

---

## Recommended Scope Sets by Use Case

### Email Bot (Read + Reply)
```
https://www.googleapis.com/auth/gmail.modify
```

### Calendar Scheduling Bot
```
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/calendar.readonly
```

### Document Reader
```
https://www.googleapis.com/auth/drive.readonly
https://www.googleapis.com/auth/documents.readonly
https://www.googleapis.com/auth/spreadsheets.readonly
```

### Full OpenClaw Integration (Service Account)
```
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/gmail.modify
https://www.googleapis.com/auth/gmail.send
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/drive.readonly
```

---

## Scope Sensitivity Levels

Google classifies scopes into three sensitivity tiers. Higher tiers require Google verification for public apps — not needed for personal/internal use (Testing mode).

| Tier | Examples | Verification Required? |
|------|----------|----------------------|
| **Non-sensitive** | `calendar.readonly`, `drive.metadata.readonly` | No |
| **Sensitive** | `gmail.readonly`, `drive.readonly`, `contacts.readonly` | No (Testing mode) |
| **Restricted** | `gmail.modify`, `gmail.send`, `drive` | Yes (for public apps) |

For personal use or Google Workspace internal apps, all scopes work without verification as long as the OAuth app is in **Testing** mode.

---

## Adding Scopes After Initial Auth

If you need to add a scope after first authenticating:

1. Update the scope list in `~/.openclaw/openclaw.json`
2. Re-run `gog auth --force` to trigger a new consent screen
3. Grant the additional permissions when prompted

Existing tokens are invalidated when new scopes are requested — you'll get fresh tokens after re-auth.
