# Phase 10 — Telegram Notifications

## Purpose
Configure Telegram bot for real-time reply alerts and manual approval workflows.

## Pre-checks
- Check `.env` for `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- If both present, ask user to confirm re-use

## Questions

### Q1 — Telegram Bot Token (if missing)
**Header**: "Bot token"
**Type**: free-text (masked input)
**Question**: "Paste your Telegram bot token. Create a bot at https://core.telegram.org/bots#botfather. Token format: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11'"
**Validation**:
- Matches format: digits:alphanumeric+hyphens
- Test: `GET https://api.telegram.org/bot{token}/getMe` returns 200 + valid bot info
- On failure: "Invalid token. Check with BotFather and retry."
**Persists to**: `.env` as `TELEGRAM_BOT_TOKEN={token}`
**Skip condition**: If already in `.env`, ask AskUserQuestion: "TELEGRAM_BOT_TOKEN found. Use existing? [Yes / No, update]"

### Q2 — Telegram Chat ID (if missing)
**Header**: "Chat ID"
**Type**: free-text
**Question**: "Telegram chat ID (numeric ID of your DM with the bot). Send /start to your bot in Telegram, then get the chat_id from the message update. Example: '-1001234567890' or '987654321'"
**Validation**: Numeric (may have leading minus for groups)
**Persists to**: `.env` as `TELEGRAM_CHAT_ID={id}`
**Skip condition**: If already in `.env`, ask AskUserQuestion: "TELEGRAM_CHAT_ID found. Use existing? [Yes / No, update]"

### Q3 — Test Notification (automatic)
**Header**: (automatic, no question)
**Type**: (auto-execute)
**Action**: After token and chat_id are saved, send test message: `POST https://api.telegram.org/bot{token}/sendMessage` with `{chat_id: "{TELEGRAM_CHAT_ID}", text: "✅ reply-claw connected and ready to send notifications"}`. Then ask AskUserQuestion: "Did you receive a ✅ test message in your Telegram chat? [Yes, received / No, check credentials / No, abort]"
- Yes → continue to next phase
- No, check credentials → return to Q1 (ask user to verify token/chat_id)
- No, abort → skip Telegram setup (warn that alerts will be disabled)
**On 403 error**: Display instructions: "Your bot hasn't been started yet. Open Telegram, find your bot, and send /start. Then come back and retry."
