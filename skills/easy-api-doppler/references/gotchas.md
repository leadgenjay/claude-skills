# Everything that went wrong, and what it looked like

Each entry below cost real time during a seven-project migration. They are
written as symptom first, because that is how you will meet them.

---

## `Doppler Error: EOF` the moment you run `doppler login`

`doppler login` opens a browser and waits on a `(Y/n)` confirmation. It needs a
terminal attached to stdin. Run it from inside an AI coding session, including
Claude Code's `!` prefix, and stdin is already closed, so it exits immediately
with `EOF`.

Nothing is broken. Open a real terminal window, log in there once, and the
credential is stored for every other tool on the machine.

The same applies to `doppler setup` when it asks which project to use. Pass
`--project` and `--config` if you want it non-interactive.

---

## Your secrets appeared in the session output

Both `doppler secrets upload` and `doppler secrets set` print the resulting
config to stdout when they succeed. Every variable in it, values included, not
only the one you just wrote. Measured on CLI v3.76.5 against a config holding
three variables: 494 bytes without the flag, 0 bytes with it.

That is sensible in a terminal you are looking at, and it is a leak in an AI
session, where every line of output goes into a transcript file.

`--silent` on every write. Then verify the flag rather than assuming, because
assuming is how it gets quietly dropped while debugging something else:

```bash
printf 'probe-value-123' | doppler secrets set SCRATCH_PROBE --silent -p my-app -c dev | wc -c
[ "$(doppler secrets get SCRATCH_PROBE --plain -p my-app -c dev | tr -d '\n' | shasum -a 256)" \
  = "$(printf 'probe-value-123' | tr -d '\n' | shasum -a 256)" ] && echo "value matches"
doppler secrets delete SCRATCH_PROBE --yes -p my-app -c dev
```

Zero bytes from the first line, `value matches` from the second. If the first
line prints anything other than `0`, check your CLI version.

`doppler secrets get --plain` prints the value, which is why it lives inside a
`$(...)` above and only the hash reaches your screen. Use that shape whenever
you verify a real secret.

Errors are safe on this version: a rejected `secrets set` reports the reason
without echoing the value. That is behaviour, not a guarantee, so keep the flag
on regardless.

---

## `You must specify a project`, then `The fallback file does not exist`

You ran a bare `doppler run --` somewhere Doppler has no pin for. Those two
errors arrive together and the second one is the misleading half: nothing is
wrong with any fallback file, and creating one is not the fix.

Pins are stored in `~/.doppler/.doppler.yaml` and keyed by **absolute path**. A
git worktree, a second clone, a CI checkout and a container are all different
absolute paths, so none of them inherit the pin you set in your main folder.

Two fixes. Pin the new path too, or pass the flags:

```bash
doppler setup --project my-app --config dev --scope "$(pwd)"
doppler run -p my-app -c dev -- npm run dev
```

In `package.json` always spell the flags out. The same script runs from your
laptop, from a worktree and possibly from CI, and only one of those is pinned.

---

## The deploy broke and cannot find any variables

Something wrapped `build`, `start` or `test` in `doppler run`.

Your hosting platform's build container has no Doppler CLI and no Doppler token.
Neither does your CI runner. The command fails before your code ever compiles,
and the error usually blames a missing environment variable rather than the
missing CLI, which sends you looking in the wrong place.

Wrap the dev server. Nothing else. Production values reach production through a
sync or through the platform's own dashboard.

---

## `Secret name "VERCEL" is a reserved name in Vercel`

An injected variable got into your Doppler config, and the sync is now trying to
push it back to the platform that created it.

`vercel env pull` returns runtime-injected names alongside your real ones, and
Vercel then refuses to accept them on the way in. Delete them from Doppler:

```
VERCEL
VERCEL_ENV
VERCEL_URL
VERCEL_REGION
VERCEL_TARGET_ENV
VERCEL_OIDC_TOKEN
VERCEL_BRANCH_URL
VERCEL_DEPLOYMENT_ID
VERCEL_PROJECT_PRODUCTION_URL
VERCEL_GIT_*   (every variable starting with this)
```

`scripts/doppler-import.sh` strips these during import, so this only bites when
you upload by hand.

---

## Variables came back blank and you did not notice

This is the expensive one.

A platform can mark a variable **sensitive**, which makes it write-only. Nobody
can read it back afterwards, including you, including the CLI. What makes it
dangerous is the failure mode: `vercel env pull` returns a sensitive variable as
an **empty string, with no error and no warning**. In the pulled file it is
indistinguishable from a variable that is genuinely empty.

Build your vault from that pull and you have stored blanks. Turn on a sync and
the blanks are written over the live production secrets.

Forty-five production secrets were captured as empty strings this way during the
migration this skill came out of, among them a database service-role key and an
app secret. They were caught before the sync ran, by counting them.

Run `scripts/vercel-sync-check.sh` before any sync. It reports every variable
that came back empty. Then open the dashboard and look at the type shown next to
each name, because that is the only place the answer actually lives.

Leave the sensitive ones alone. The platform keeps managing them, Doppler never
learns they exist, and a sync cannot overwrite what it does not know about.

---

## A secret whose value is its own name

The one that cost the most, on 2026-08-29.

`my-app/prd` held `OPENROUTER_MANAGEMENT_KEY` with the value
`OPENROUTER_MANAGEMENT_KEY` — the variable's own name, 25 characters, no
whitespace. Every check in the chain agreed the write had gone perfectly.

**The mechanism, which took two days to see.** The button reads the clipboard
once for its length hint and again at write time, with a dialog in between. That
dialog asks for the variable name. So you copy the name to paste into it, which
replaces the key you copied thirty seconds earlier, and the write stores the
name. The interface asked for exactly the action that destroyed its own input.

Any tool that reads the clipboard after showing a dialog has this bug. The fix
is to fingerprint the clipboard before the first dialog and refuse the write if
it moved, and to remove the reason to copy anything: pick the variable name from
a list rather than typing or pasting it.

The timeline is the useful part:

```
16:31:36.899Z  Doppler my-app/dev   1 added
16:31:39.159Z  Doppler my-app/prd   1 updated      <- overwrote the real key
16:31:39.705Z  Doppler -> Vercel sync fired, status: synced
16:31:41.253Z  Vercel production OPENROUTER_MANAGEMENT_KEY updated
```

Four and a half seconds from a wrong clipboard to a destroyed production
credential. Doppler reported `rollback: false` on the config log and Vercel
keeps no version history for environment variables, so the previous value was
not recoverable from either. The only surviving copy was baked into the running
deployment, where nothing can read it out. It had to be reminted.

**Why nothing caught it.** Every guard that existed was a shape guard: longer
than twelve characters, no whitespace. A variable name passes both. And the
verification step read the value back and compared its SHA-256 against the
clipboard — the same clipboard the value had just come from — so it agreed with
itself and reported success.

**Why it stayed hidden for hours.** Vercel injects environment variables at
build time, so the deployment already running kept using the old value. A cron
heartbeat succeeded thirteen minutes after the overwrite and was read as proof
that production was fine. Nothing would have surfaced it until the next deploy,
at which point three separate money paths would have started returning 401 at
once.

Three things to take from it:

- **A read-back proves transport, not correctness.** Compare against something
  that did not come from the same source, or accept that you have only shown
  the bytes arrived intact.
- **A secret being present is not evidence it is right.** Exercise the
  credential against the real API. `doppler run -- node script.js` with a script
  that prints only a length, a prefix and a fingerprint keeps the value out of
  the transcript while still telling you it works.
- **Once a config has a sync, writing to it is a production write.** There is no
  staging step and no undo, and the confirmation you get is the one you build.

`scripts/doppler-set.sh` refuses this case outright now, along with an empty
clipboard, an unflagged overwrite, and an unflagged write to a synced config.
To find any already sitting in a vault:

```bash
doppler secrets --json -p my-app -c prd \
  | tr ',' '\n' | sed -n 's/.*"\([A-Z_][A-Z0-9_]*\)":{"computed":"\1".*/\1/p'
```

---

## `vercel env rm NAME production` deleted the variable everywhere

The command reads like it removes one environment from an entry. It does not.
When an entry covers production, preview and development together, naming one
environment deletes the whole entry.

Proven on a disposable probe variable: a `production,preview,development` entry
vanished completely.

To free just production for a sync, edit the target list through the API instead.
The entry keeps its id and its value, and the other environments carry on
reading it:

```bash
curl -X PATCH \
  "https://api.vercel.com/v9/projects/$PROJECT_ID/env/$ENV_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"target":["development","preview"]}'
```

Get `$ENV_ID` from `GET /v10/projects/$PROJECT_ID/env`.

---

## `vercel env ls` shows fewer variables than you have

It truncates. On one project it listed 33 names where a pull returned 55.

Never diff against the listing. Pull to a file and count that.

---

## The duplicate count looks impossibly high

Custom environments. If the project has one, say `staging`, its entries carry an
empty `target` array and a `customEnvironmentIds` field instead. Tooling that
groups by `target` sees them as unclassified and counts them again.

On one project, 133 of the apparent duplicates were staging entries.

---

## The sync worked and then production behaved differently

Everyone checks what a sync would **overwrite**. Almost nobody checks what it
would **add**.

A local `.env` accumulates development flags. Push it to `prd` and those flags
are suddenly live. In one case a config carried `POSTHOG_SESSION_REPLAY_ENABLED`
and a debug flag, both read by deployed code. Syncing them would have switched on
session recording against real customers and put an analytics library into debug
mode inside their browsers.

Before the first sync, diff the name list going up and trace each **new** name to
whether deployed code reads it. Application directories are live. A `scripts/`
folder that only ever runs on your laptop is not.

---

## Doppler syncs are additive, and this is the good news

A sync adds and updates. It does not delete variables it has never heard of.

Verified during the migration: one project went from 42 to 66 entries, with zero
pre-existing names or ids removed.

That is what makes the whole arrangement safe to turn on for a live app. The
variables you deliberately keep out of Doppler stay exactly as they are.

---

## You ran out of syncs

Free tier limits, and only one of them ever bites:

| | Free |
|---|---|
| Users | 3 |
| Projects | 10 |
| Environments per project | 4 |
| Configs per environment | 10 |
| **Config syncs** | **5** |
| Service tokens | 50 |

A sync is configured per pairing of a Doppler config with a platform
environment, so a project that syncs both production and preview spends two.
Six production apps need six, which the free tier will not give you.

Decide which apps earn a sync before wiring any of them up. The rest keep working
perfectly well with variables managed in the platform dashboard, which is what
you were doing anyway.

---

## Installing the CLI by hand

If the automatic install did not run:

```bash
# macOS
brew install dopplerhq/cli/doppler

# Linux, Debian and Ubuntu
curl -sLf --retry 3 https://packages.doppler.com/public/cli/install.sh | sudo sh

# Anything else
# https://docs.doppler.com/docs/install-cli
```

---

## Getting out again

Nothing here locks you in. A config comes back as a plain `.env` whenever you
want one:

```bash
OUT=$(mktemp -t doppler-export)
chmod 600 "$OUT"
doppler secrets download --no-file --format env -p my-app -c prd > "$OUT"
echo "$OUT"
```

That writes every value in the config to disk, so it goes to a private temp
path rather than a predictable name in your project tree. Move it where you
need it, then delete it. Do not leave it sitting in a repo, and do not run this
one inside an AI session unless you mean to.

Directory pins come off the same way, one directory at a time:

```bash
doppler configure unset project config --scope "$(pwd)"
```
