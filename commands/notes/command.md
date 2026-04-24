---
description: Start a claude-review session for inline commenting. Use ONLY when user says "/notes", "review this file", "leave comments", or "inline review". Do NOT use for generic "open file" requests.
argument-hint: <file>
allowed-tools: Bash(claude-review review:*), Bash(claude-review address:*), Bash(claude-review resolve:*), Bash(claude-review reply:*), Bash(open http*), Edit, Read, Write, AskUserQuestion
---

You are opening a document for interactive review using claude-review.

## Step 1: Open in browser

Run `claude-review review --file "$ARGUMENTS"` to start the review server and get the URL.

Then run `open <URL>` to open it in the user's default browser.

## Step 1b: Verify the page loaded

Run `curl -s -o /dev/null -w "%{http_code}" <URL>` to check the server returns 200.

If the status is NOT 200:
1. Check `claude-review review` output for the correct URL — the path after `/projects/` should NOT duplicate the full absolute file path
2. Try stripping duplicate path segments from the URL
3. If still failing, stop the server with `claude-review stop` and retry

Only proceed once you get a 200 response. Then tell the user: "Opened in your browser. Highlight any text and leave inline comments. Let me know when you're done."

## Step 2: Wait for confirmation

Use the AskUserQuestion tool to ask:

Question: "Are your review notes ready?"
Options:
- "Yes, pull my comments" — proceed to Step 3
- "Still reviewing" — wait and ask again

Do NOT proceed until the user confirms.

## Step 3: Pull comments and act on them

Run `claude-review address --file "$ARGUMENTS"` to fetch all unresolved comments.

First, read the file using the Read tool to understand its current state.

Then for each comment thread:
1. If the user made a clear change request → make the edit and reply confirming
2. If the user asked a question → reply with your answer
3. If unclear → reply asking for clarification

After processing all comments, summarize what you changed and ask if the user wants to do another review pass.
