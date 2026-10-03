# LinkedIn lead system

Two Claude Code skills that work as one system. `linkedin-prospector` finds the creators your
buyers already follow, collects the people commenting on their posts, scores each one against
your ideal customer, writes each a personal first message, and loads them into an Aimfox
campaign. Aimfox sends a blank connection request and, once they accept, that message.
`linkedin-closer` then answers the replies and the comments on your own posts, working each
conversation toward a booked call. Everything is stored in your own Supabase project and runs
from your own machine.

Plan on about an hour for the first setup, not counting account sign-ups.

## What you need, and what it costs

| Account | What it does here | Cost |
|---|---|---|
| Claude Code | Runs both skills and writes every message | Included with a Claude plan that has Claude Code |
| Aimfox | Sends connection requests and the first message at a safe pace | $49 a month, 14-day free trial |
| Unipile | Reads and answers your LinkedIn DMs and comments | About $55 a month |
| Apify | Finds creators and scrapes their commenters | Pay per use, about $7.50 per 1,000 prospects |
| Supabase | Stores every creator, prospect and message | Free tier is enough |

Connect the same LinkedIn account to Aimfox and to Unipile.

You also need Node 18 or newer (`node --version` to check).

## 1. Install both skills

Copy both folders, `linkedin-prospector` and `linkedin-closer`, into `~/.claude/skills/`. They
must sit side by side; the closer uses the prospector's scripts.

```bash
ls ~/.claude/skills/linkedin-prospector ~/.claude/skills/linkedin-closer
```

## 2. Let Claude walk you through setup

Open Claude Code and say "set up the LinkedIn lead system". It creates
`~/.linkedin-lead-system/`, copies in `config.json` and `.env`, and asks you about your offer,
your ideal customer, your niche keywords and a few messages you have sent before, so its
writing sounds like yours.

Set `LINKEDIN_LEADGEN_HOME` if you want that folder somewhere else.

## 3. Paste your keys into `.env`

Open `~/.linkedin-lead-system/.env` in a text editor and fill in:

```
APIFY_TOKEN=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
AIMFOX_API_KEY=
UNIPILE_DSN=
UNIPILE_API_KEY=
```

Paste them into the file yourself, not into the chat. The Supabase key is the service role key
from Project Settings, API. It can read and write your whole database, so keep the file private.
If that folder is ever inside a git repository, setup refuses to finish until `.env` is
ignored.

## 4. Create the tables in Supabase

In your Supabase project, open the SQL editor, paste the whole of
`~/.claude/skills/linkedin-prospector/schema.sql`, and run it once. Supabase does not let the
skill create tables over its API, so this one step is by hand.

## 5. Build the Aimfox campaign

Create the campaign with:

```bash
node "$HOME/.claude/skills/linkedin-prospector/scripts/prospector.mjs" create-campaign --name "LinkedIn Prospector"
```

This command writes the empty campaign and its steps directly. It creates a blank connection
request and exactly one message after acceptance: `{{CUSTOM.welcome_message}}`. InMail
optimization is off on a new campaign. It reads the settings back before reporting success,
prints the campaign id, and tells you to put it in `config.json` as `aimfox_campaign_id`.
It never adds people or presses Start. If multiple accounts are available, select the exact
account with `--account <id>` after inspecting `aimfox.mjs accounts`.

To repair an existing inactive campaign, add `--campaign <id>`. Active or running campaigns
are refused. If authentication or a setting cannot be configured, use the manual fallback in
`references/aimfox-campaign-setup.md`. Private API writes still need live verification; offline
tests alone do not prove that Aimfox accepts them.

Then put your Unipile account id into `unipile_account_id`.

## 6. Check everything

Ask Claude to run the setup check, or run it yourself:

```bash
node ~/.claude/skills/linkedin-prospector/scripts/prospector.mjs setup-check
```

Each line says pass or fail and what to fix.

## 7. Your first run

Say "find LinkedIn prospects". Claude will:

1. show you what finding creators will cost, then find them;
2. show you the cost of scraping their commenters, then scrape them;
3. score every commenter and reject anyone who does not fit;
4. write a welcome message for each one that does;
5. add them to your paused Aimfox campaign and check each stored message came back intact.

The skill never starts the campaign. You do, in Aimfox. Claude shows you a short checklist:

1. the Connect step has no note;
2. the connect optimization step has no note and no messages;
3. there is exactly one message after acceptance, and it is exactly `{{CUSTOM.welcome_message}}`;
4. InMail optimization is off.

Aimfox does not report stop on reply. If your campaign has the setting, turn it on.

Each line says "looks right", "WRONG", or "Aimfox does not say, check it". You also get one
real prospect's welcome message, so you can compare it with the preview in Aimfox. Open the
campaign, check all three, and press Start. Pressing Start is your sign-off; nobody types a
confirmation anywhere.

This is the only time the system waits for you. It comes back only if you edit the campaign
later: then the next batch asks you to pause it, runs the same checklist, and waits for you to
press Start again.

## 8. Turn on the hourly loop

After you press Start, tell Claude "I pressed Start". It checks the campaign is running and
unchanged, records your Start, and sets up the loop. From then on the system runs one pass an
hour: check Aimfox for accepted requests and
replies, push any new batch, answer DMs, and reply to comments on your posts.

Claude schedules this for you once your Start is recorded. In Claude Code the line is:

```
/loop 1h /linkedin-closer run
```

It runs while that Claude Code window stays open. Only one loop is ever recorded; asking for a
second is refused, and a pass that starts while another is still running exits straight away.

## 9. Read `needs-you.md` once a day

`~/.linkedin-lead-system/needs-you.md` lists everything the system will not decide for you:

- someone asked if they are talking to a bot;
- a complaint, or anything legal;
- a comment on your post that criticises your company;
- a personal message from a friend or colleague;
- a DM from someone the prospector never contacted (see reply scope below);
- the campaign waiting for you to press Start, or to pause it after an edit;
- a prospect who says they booked a call;
- any failed step.

Each time you use either skill, Claude also lists what is open, by kind and time. The details
stay in the file for you to read; Claude opens it only when you ask about one item. When you have dealt
with one, tell Claude and it clears that item. A problem that repeats each hour shows up once,
not 24 times a day; clearing it after the fix means you will hear about it again if it returns.

When a prospect says they booked, the closer thanks them and leaves you a reminder. Check your
calendar first, then say "mark <their name> as booked" so the system stops treating them as an
open lead. Only you can mark a meeting booked.

## Spending limits

Apify is the only part that charges per use. Before each run the skill prints the price per
item, how many items, and the estimated total. Two caps in `config.json` stop it:

- `per_run_cap_usd` (default $10): the most a single run may cost. A bigger job is refused
  before it starts, and Claude offers to split it into runs that fit.
- `total_cap_usd` (default $25): the most all runs together may cost. Raise it yourself when
  you want more prospects.

A typical first pass is 10 creators, their 30 most-commented posts, and up to 60 commenters
on each. That is about $7.50 for roughly 1,000 unique prospects. The hourly loop never scrapes;
it only works with prospects you already have.

## LinkedIn safety

Connection requests always go out blank. Across the campaigns this system was built from,
blank requests average about a 50% acceptance rate, while personalized or promotional notes
come in under 20%. The personal touch goes in the first message, after they accept.

Aimfox paces invites and messages to stay inside LinkedIn's limits. Leave its daily limits at
their defaults until the account has a few weeks of history.

## What "fully automatic" means

Once started, the system finds no new prospects on its own (that costs money, so you run it),
but it does push ready prospects, send welcome messages through Aimfox, and send DM and comment
replies with nobody approving each one. These guards stay on the whole time:

- Anyone who says stop, not interested, or wrong person is marked do-not-contact, removed from
  the Aimfox campaign, added to the Aimfox blacklist, and never messaged again. They get no
  reply, not even a polite one.
- Bot questions, complaints and legal matters get no reply; they go to `needs-you.md`.
- At most 50 DM replies and 25 comment replies in any 24 hours (both in `config.json`).
- Never more than two messages in a row to someone who has not answered.
- Replies never quote a price, never end on a bare link, and never push after a second no.
- Before each send the live chat is read again. If the person wrote something new since the
  draft, the draft is thrown away and written again.
- Comment replies on your posts never pitch, link, or ask for a DM.
- If LinkedIn starts limiting the account, sending stops for that hour and you get a line in
  `needs-you.md`. A message that may not have gone through is never sent a second time.

## Reply scope: who gets automatic replies

`reply_scope` in `config.json` decides who the closer answers on its own.

- `campaign_only` (the default): only people this system contacted. Everyone else in your
  inbox gets a draft, never a send, and a line in `needs-you.md`.
- `all`: everyone in your LinkedIn inbox. That includes customers, colleagues and friends, and
  the closer will reply to them as a salesperson trying to book a call. Choose this only if
  your LinkedIn inbox is used for prospecting and nothing else.

## Draft-only mode

Set `closer_mode` to `draft_only` and the closer writes every DM and comment reply but sends
none of them. Use it for your first week to read what it would have said, or on an account
where someone else already answers your messages. The prospector side keeps running either
way.


## Standalone Aimfox CLI

The thin Aimfox CLI shares the same client and requires `AIMFOX_API_KEY`. Read commands return
JSON using a limited set of fields; diagnostics go to stderr.

```bash
node "$HOME/.claude/skills/linkedin-prospector/scripts/aimfox.mjs" accounts
node "$HOME/.claude/skills/linkedin-prospector/scripts/aimfox.mjs" campaigns
node "$HOME/.claude/skills/linkedin-prospector/scripts/aimfox.mjs" campaign --campaign <id>
node "$HOME/.claude/skills/linkedin-prospector/scripts/aimfox.mjs" create-campaign --name "LinkedIn Prospector"
node "$HOME/.claude/skills/linkedin-prospector/scripts/aimfox.mjs" create-campaign --campaign <id> --apply
```

`create-campaign` previews by default in this standalone CLI. Add `--apply` to create or repair
the campaign, then verify its saved steps. The prospector command above retains its direct-write
setup behavior. Neither interface starts campaigns or adds an audience. Login-token generation
uses `{}` and keeps the returned token in memory. `AIMFOX_SESSION` is the private fallback when
generation fails or its read-only authentication probe returns 401/403; never paste it into chat. There is no installation or publication step in
these commands.


Creation selects the sole account, or an explicit `--account <id>` when more than one is
available. A repair resolves the campaign owners to that same workspace and refuses ambiguous
scope. Use `--json-file <private-file>` for a JSON object containing `name`, `campaign`, and/or
`account`; the same values cannot also be passed as flags. Keep private inputs outside source.
Exit codes for the standalone CLI: `0` read/preview/verified result, `1` failure or an unproven
write outcome, `2` invalid input or refusal. A partial write is not automatically retried.
