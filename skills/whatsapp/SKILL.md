---
name: whatsapp
description: >-
  Read and reply on your WhatsApp through Unipile: recent chats with real names and
  unread counts, a thread's messages, the screenshots and images people sent (downloaded
  so Claude can look at them), and replies drafted in your voice that send only after you
  approve the exact text. Use when the user says "/whatsapp", "check my WhatsApp",
  "what's new on WhatsApp", "what did <person> say on WhatsApp", "look at the screenshot
  <person> sent", or "reply to <person> on WhatsApp". Needs a Unipile account with
  WhatsApp connected.
---

# /whatsapp

Your WhatsApp, read and answered from Claude Code through Unipile's API. Everything goes
through one zero-dependency script:

```bash
node ~/.claude/skills/whatsapp/scripts/wa.mjs health
```

Write the path exactly like that, tilde and all, in every command. Never put it in a
variable (`W=...; node "$W"`) and never write `$HOME`: a worktree-isolated Claude Code
session refuses both as "a value computed at runtime" and runs nothing. The tilde form
passes.

## Step 0 — Prerequisites

Before any other operation, verify these are present. If any are missing, stop and tell
the user where to get each; do not proceed with broken state.

| Requirement | Check | Where to get it |
|---|---|---|
| Node.js 18 or newer | `node --version` prints v18 or higher | https://nodejs.org |
| A Unipile account | You can sign in to the Unipile dashboard | https://www.unipile.com |
| WhatsApp connected in Unipile | The dashboard lists a WhatsApp account | Connect WhatsApp from the Unipile dashboard; it shows a QR code to scan with your phone |
| Your Unipile API key and DSN | Both are in the config file below | The Unipile dashboard (the DSN is a host and port, like `api1.unipile.com:13111`) |
| The config file, private to you | `ls -l ~/.config/whatsapp-skill/.env` shows `-rw-------` | Created in the first-run steps below |
| Everything wired up | `node ~/.claude/skills/whatsapp/scripts/wa.mjs health` prints `"ok": true` | Follow what its error says |

If anything is missing, STOP. Do not guess an account id, and do not write the API key
anywhere but the config file.

### First run

1. Create `~/.config/whatsapp-skill/.env` with your two Unipile values:

   ```
   UNIPILE_API_KEY=<your key>
   UNIPILE_DSN=<your dsn>
   ```

2. `chmod 600 ~/.config/whatsapp-skill/.env`. The script refuses a config file other
   users on the machine can read, because it holds your API key.
3. Run `health`. It stops with "WA_ACCOUNT_ID is not set" and prints a ready-to-paste
   `WA_ACCOUNT_ID=...` line for each WhatsApp account your key can see. Add the right one
   to the file.
4. Run `health` again. `"ok": true` means you are set up.

Optional keys in the same file:

| Key | What it does |
|---|---|
| `WA_BLOCKLIST` | Path to a `.txt` file, one word or phrase per line (`#` comments allowed). A reply containing any of them, whole-word and case-insensitive, is refused. Use it for competitor names, internal code names, anything a customer must never read. A `.mjs` module exporting `vendorHit(text)` also works. Once set, a list that will not load refuses every draft rather than letting text through unchecked, and `health` fails. |
| `WA_CONFIG` | Set in your shell environment, not in the file: points at a config file somewhere else. |

Values may start with `~/`. `$HOME` is not expanded. Keys set in the shell environment
win over the file.

## What it can and cannot do

| Can | Cannot |
|---|---|
| List recent chats with names and unread counts | Start a new chat with someone |
| Read a thread, senders named per message, groups included | Mark chats read, react, send images or voice notes |
| Download images and screenshots, then look at them | Download view-once media, ever |
| Reply in an existing chat, once the user approves the exact text | Send anything the user has not seen word for word |

It only ever touches the account in `WA_ACCOUNT_ID`. A chat id from any other account on
the same Unipile key (LinkedIn, Instagram, a second WhatsApp) is refused before anything
in it is read.

## Commands

| Command | What it returns |
|---|---|
| `health` | `ok`, the config file it read, which keys are set (true/false, never the values), the account, its status, and the blocklist path or `"off"`. Fails if anything is missing or wrong, and says what. |
| `inbox [--limit 20] [--unread] [--dms] [--since <ISO>]` | Chats newest first: `chat_id, name, is_group, unread_count, last_at, read_only, muted`. A chat whose name lookup failed carries `name_error` and shows its raw id as the name. |
| `find --name "<text>" [--pages 5]` | `{matches, scanned, more}`. Several matches means ask the user which one. Empty `matches` with `more: true` means the search stopped early, not that the person is missing: raise `--pages`. |
| `thread --chat <id> [--limit 30]` | Messages oldest first: `from` ("me" for the user's own), `text`, `attachments`, `deleted`, `is_event`. |
| `media --chat <id> [--message <id>] [--limit 30] [--types img] [--max-mb 10]` | Saved file paths, plus what was skipped and why. |
| `draft --chat <id> --text-file <path> --after <message_id> [--group]` | Stores a reply and sends nothing: `draft_id`, `to`, `text`, `confirm` (10 characters). `--after` is the id of the newest message you read. |
| `send --draft <id> --confirm <code>` | Sends that draft, once, then reads it back: `message_id`, `verified_via`. |
| `drafts` | Every draft and its state. Works offline. |
| `abandon --draft <id>` | Retires a draft without sending it. Works offline. |

## Every time

1. `health`. If it fails, tell the user in one line what it said (for example "WhatsApp
   needs reconnecting in Unipile") and stop.
2. `inbox --unread` (newest first; the script does not sort by unread). Report the
   one-to-one chats first, then groups, one line each: name, unread count, the gist.
   Read the thread before giving a gist; never guess one from the chat name.
3. Groups with many unread messages get a two-line summary, not a transcript.

`last_at` on a chat is Unipile's sync time and can be months newer than the last real
message (seen 2026-10-06 on a group whose newest message was from December). Order by
it, but take dates from `thread`.

## Screenshots and images

```bash
node ~/.claude/skills/whatsapp/scripts/wa.mjs media --chat <chat_id> --limit 30
```

Then Read each path in `saved` and say what it shows in the context of the thread.
Images, including screenshots, are the default. Videos are listed under `skipped` and
fetched only if the user asks (`--types img,video`). Stickers, view-once media, files
over 10 MB and media WhatsApp no longer holds are always skipped, and the reason is in
the output.

Files land in `~/.cache/whatsapp-skill/media/<chat_id>/` (folders private to the user,
files mode 600). Any `media` run deletes files older than 7 days. They never go into a
repo or an artifact.

If an image shows a password, API key or card number, say so without repeating it, and
suggest the owner change it.

## Replying

Nothing is sent without the user approving that exact text in this session. "Reply to
everyone" still means one approval per message.

1. Read the thread first (`thread`), so the reply answers what was actually said last.
   Note the `id` of the newest message: `draft` needs it as `--after`, and refuses if
   anything newer has arrived since (use `--after none` for an empty chat).
2. Draft in the user's own voice, WhatsApp register: short, plain text, no greeting line,
   no sign-off. No prices, offers, refunds or commitments unless the user said so first.
3. Write it to a file in the session's scratchpad directory, or in
   `~/.cache/whatsapp-skill/` when there is none. Never write it inside a repo or the
   current project: these are private conversations, and a reply file in a working tree
   can be committed. Then review it for AI voice. If a humanizer or AI-voice checker is
   installed, run it; either way, read the text as the recipient would and fix anything
   that does not sound like the user.
4. `node ~/.claude/skills/whatsapp/scripts/wa.mjs draft --chat <id> --text-file <file> --after <newest id>`.
   The script refuses markdown WhatsApp would print literally (`**`, `__`,
   `[label](url)`, `#` headings, backticks, tables), an em dash (replies should read as
   typed by a person), anything on `WA_BLOCKLIST`, read-only chats, groups without
   `--group`, and anything that is not a person or a group (status broadcasts, channels).
   WhatsApp's own `*bold*` with one asterisk is fine. Pass `--group` only when the user
   named that group as the place to reply.
5. Ask the user with `AskUserQuestion`. The question carries the recipient, whether it is
   a group, and the exact text. Options: "Send as written", "Edit", "Skip".
6. On "Send as written": `node ~/.claude/skills/whatsapp/scripts/wa.mjs send --draft <draft_id> --confirm <confirm>`.
   Report who it went to and the `message_id`. The `confirm` code binds the text, the
   chat, the group permission and the `--after` snapshot, so the draft file cannot be
   changed between approval and the send without the send refusing.
7. On "Edit": write the new text and make a new draft. On "Skip": `abandon` the draft.

### What send refuses, and what to do

| Message | What happened | Do |
|---|---|---|
| `--confirm ... does not match` | Wrong code. Nothing sent; the draft is still usable. | Re-run with the code from `draft`. |
| `changed on disk since it was drafted` | The draft file's text, chat or snapshot was edited after approval. | New draft, new approval. |
| `arrived after the thread was read` (from `draft`) | A message came in between reading the thread and drafting. | Read the thread again, then redraft. |
| `someone wrote in the chat after this draft was made` | The conversation moved on. The draft is dead. | Read the thread again, redraft, ask again. |
| `already claimed` | Each draft can be sent once in its life, and this one has been tried. | Check `drafts` for what happened; never work around it. |
| `VERIFY BEFORE RETRY` | The message may or may not have gone out. State is `unconfirmed`. | Ask the user to check the chat on their phone. **Never resend.** If it is not there, `abandon` and redraft. |
| `WhatsApp rejected the send` | A definite rejection (400, 401, 403, 404, 422 or 429). State is `failed`. | Tell the user the reason; redraft if it makes sense. Any other error, a timeout or a dropped connection is `unconfirmed` instead. |
| Draft stuck in `sending` | The process died mid-send. | Same as `VERIFY BEFORE RETRY`. The script never decides this on its own. |

`verified_via` says how the send was confirmed: `direct` (read back at once),
`direct_after_retry` (read back after the read lagged), or `chat_list` (found by its id
in the chat's last 20 messages). On the first live send (2026-10-06), WhatsApp read the
message back `direct` on the first attempt, under the same id the send returned.
`chat_list` has only been exercised against the test server.

Drafts live in `~/.cache/whatsapp-skill/drafts/`, private to the user.

## When something fails

| Symptom | Meaning |
|---|---|
| `WA_ACCOUNT_ID is not set` | First run, or the line was removed. Paste one of the lines the error lists into the config file. |
| `WA_ACCOUNT_ID ... is not in Unipile` | The WhatsApp account was re-linked and has a new id. The error lists the current ones; update the config file. |
| `status is CREDENTIALS, not OK` | WhatsApp logged out of Unipile. Reconnect it by QR code in the Unipile dashboard. |
| `can be read by other users ... chmod 600` | The config file is too open. Run the `chmod` the error prints. |
| `Missing UNIPILE_API_KEY` or `Missing UNIPILE_DSN` | The config file is not where the error says, or lacks that line. |
| `the word blocklist could not load` | `WA_BLOCKLIST` names a file that is missing, empty, the wrong type, or (for `.mjs`) has no `vendorHit`. Reads still work; drafting refuses until it is fixed or the line is removed. |
| `WA_API_BASE is set but WA_TEST is not 1` | A test variable leaked into the shell. `unset WA_API_BASE`. |
| `media` exits 1 with `failed` entries | Those downloads errored, came back the wrong size, or passed the size cap, and were discarded. The `error` field says which. Retry once; the rest were saved. |
| `message ... is not in the last N messages` | `--message` only looks inside the `--limit` window. Raise `--limit`. |

## Tests

```bash
node --test ~/.claude/skills/whatsapp/tests/
```

The tests run against a fake Unipile server on 127.0.0.1 and a throwaway HOME; they never
reach the network, your config or your cache.
