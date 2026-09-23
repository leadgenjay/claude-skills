---
name: easy-api-doppler
description: "Stop pasting API keys into your AI coding session. Move every secret into Doppler once, then hand Claude the name instead of the value, so nothing lands in a transcript and there is nothing to rotate afterwards. Ships a scanner that counts key-shaped strings already sitting in your own transcripts, a safe .env importer, a pre-sync checker that catches write-only platform variables before they get blanked, and an optional one-press macOS button. Use when the user says \"easy api doppler\", \"doppler\", \"secrets manager\", \"stop asking me to rotate my key\", \"where do I put my API key\", \"env file\", \"vault\", or pastes a key into the chat."
invoke: user
---

# Easy API Doppler

You paste an API key into the chat so your assistant can wire it up, and the
first thing it says back is that you should rotate that key. The advice is
correct, which is the annoying part. Everything you type into a session gets
written to a transcript file on your own disk, in plain text, and it stays
there. Whatever you pasted is now sitting in a file you will never open again.

So the fix is not a better prompt or a stricter permission rule. It is to keep
the value out of the conversation in the first place.

By the end of this you will add a key like so:

1. Copy it from the vendor's site.
2. Run one command.
3. Tell Claude the name.

The value goes clipboard, pipe, vault. It never touches the model, so it never
touches the transcript, so there is nothing to rotate.

### Where the bundled commands live

Installing put five helper scripts in one place. Set this once per terminal and
every command below works from whatever directory you happen to be in:

```bash
SKILL=~/.claude/skills/easy-api-doppler
```

If you moved the skill, point `SKILL` at wherever it went. The plain `doppler`
commands need none of this.

---

## Step 0. Prerequisites (blocking)

Check these before anything else. If any are missing, **STOP** and get the
missing piece first. Do not carry on with a half-configured vault, and do not
write placeholder commands to paper over a gap.

| # | Requirement | Check | Where to get it |
|---|---|---|---|
| 1 | A Doppler account, free tier is enough | You can sign in at dashboard.doppler.com | https://dashboard.doppler.com/register |
| 2 | The `doppler` CLI | `doppler --version` prints a version | Installing this skill tries to install it for you. If it did not land, follow https://docs.doppler.com/docs/install-cli |
| 3 | You are logged in | `doppler me` prints your email | `doppler login`, **in a real terminal window**. See the warning below. |
| 4 | A project with a `.env` file you want to move | `ls -a` shows it | No `.env` yet? Skip Step 3 and add secrets one at a time from Step 6. |

Only Step 7 needs anything else, and Step 7 is optional. If you plan to do it,
you also need the `vercel` CLI (`vercel whoami` prints your username) and a
project already linked with `vercel link`.

If anything in the table above is missing, STOP.

**The one that catches everybody.** `doppler login` opens a browser and waits on
a `(Y/n)` prompt. It needs a real terminal. Run it through your AI session's
shell, including Claude Code's `!` prefix, and it dies instantly with:

```
Doppler Error: EOF
```

That is a closed stdin, not a broken install. Open Terminal, run `doppler login`
there, come back. You do this once per machine.

---

## Step 1. Find out how big your own problem is

Before changing anything, look at what is already on disk.

```bash
bash "$SKILL/scripts/scan-transcripts.sh"
```

It counts strings shaped like credentials across your saved sessions and prints
file names and a total. It never prints a match, because printing one would put
the key straight back into the session you are reading the report in. On a large
history it takes a minute or two, and it modifies nothing.

For scale, the machine this skill was built on reported 1,360 transcripts, 4.2 GB
on disk, and 208 files holding a key-shaped string.

A match is not proof that a live credential is in there. Test keys, examples and
long-dead keys all match too. But any key you actually remember pasting should
be treated as exposed and rotated now, on its own merits. Nothing below undoes
what is already written.

---

## Step 2. Point Doppler at a project

One Doppler project per repo. Names are lowercase and hyphenated.

```bash
doppler projects create my-app
```

Every project gets environments. Two is plenty:

- `dev` holds what your `.env.local` holds. Your laptop reads this one.
- `prd` holds the real production values.

Doppler creates `dev`, `stg` and `prd` for you. Ignore `stg` until you need it.

---

## Step 3. Import the `.env` you already have

```bash
bash "$SKILL/scripts/doppler-import.sh" .env.local my-app dev
```

That wrapper exists because the bare CLI has three sharp edges:

**It prints your secrets.** `doppler secrets upload` without `--silent` dumps
the whole config to stdout when it finishes. In an AI session that output is a
tool result, and a tool result is transcript. Six live keys reached a transcript
this way on the day this skill was written, from a single missing flag.

**It accepts values it should not.** A `.env` pulled down from a deploy platform
carries injected names like `VERCEL` and `VERCEL_TARGET_ENV` that the platform
then refuses to take back. The wrapper drops them.

**Empty values are ambiguous and dangerous.** A blank value in a pulled file
means either the variable is genuinely empty or the platform marked it sensitive
and would not hand it over. The wrapper leaves those out and names them, which
is the safe answer in both cases. Read Step 7, then re-run with
`--include-empty` if you have confirmed they really are empty.

Afterwards it verifies by reading the names back. Doppler adds three of its own
(`DOPPLER_PROJECT`, `DOPPLER_CONFIG`, `DOPPLER_ENVIRONMENT`), so seeing three
more than you imported is correct.

If you would rather do it by hand, the flag is the whole point:

```bash
doppler secrets upload .env.local --project my-app --config dev --silent
```

---

## Step 4. Keep your `.env.local` file

Delete nothing yet. In a Next.js app an injected environment variable wins over
`.env.local`, which is verified behaviour in `@next/env`, so once you run through
Doppler the file is a harmless fallback rather than a competing source of truth.

Leave it for a few weeks. When you have forgotten it exists, delete it.

The exception is a `.env` that was committed at some point. Two commands, and
the second is the one that matters:

```bash
git check-ignore -v .env.local        # no output means it is not ignored
git ls-files --error-unmatch .env.local   # exit 0 means it is committed
```

If the second one succeeds, those values are in your git history and stay there
through any number of later deletions. That is a separate emergency, and the
only fix is rotating every key in the file.

---

## Step 5. Run your code through Doppler

```bash
doppler run -p my-app -c dev -- npm run dev
```

Pin the directory once and the flags become optional:

```bash
doppler setup --project my-app --config dev --scope "$(pwd)"
doppler run -- npm run dev
```

Two things about pins. They are keyed by **absolute path**, so a git worktree or
a CI checkout is a different path and is not pinned. Pass `-p` and `-c` there.
And in `package.json`, where the same script runs from several places, spell the
flags out:

```json
"scripts": {
  "dev": "doppler run -p my-app -c dev -- next dev"
}
```

Each invocation costs roughly 250 to 400 milliseconds against a 40 millisecond
baseline. Irrelevant for a dev server. Wrong inside a loop.

### Never wrap `build`, `start` or `test`

Wrap the dev server and nothing else.

Your deploy platform's build container has no Doppler CLI and no Doppler token.
Neither does your CI runner. Wrapping `build` breaks every deploy, and it is the
single most common way people break their own site on day one of doing this. The
production values get to production through the sync in Step 7, or through the
platform's own dashboard. They do not get there through `doppler run`.

### `dev` on your laptop, always

Running local work against `-c prd` points your machine at production Stripe,
production Redis and the production database. It works, which is why people do
it, and then a test row lands in a real table.

---

## Step 6. The command that replaces pasting keys

This is the part that removes the friction.

```bash
bash "$SKILL/scripts/doppler-set.sh" OPENAI_API_KEY my-app
```

Copy the key from the vendor's site, run that, then tell Claude the name. It
writes `dev` and `prd`, always with `--silent`, and refuses four things the
bare CLI accepts without comment:

- **An empty clipboard.** The bare command stores an empty string, exits 0 and
  prints nothing. A later sync then writes that blank over the live secret.
- **The variable's own name as its value**, or any all-caps underscored token.
  See the incident below. This is the guard that costs nothing and saves most.
- **Replacing a value that already exists**, unless you pass `--overwrite` or
  answer the prompt. That write is the destructive one.
- **Writing to a config that syncs to a deploy platform**, unless you pass
  `--allow-sync` or answer the prompt. It names the platform when it asks.
- **A clipboard holding more than one line.** An API key is one line; several
  means you copied a block of text. Genuinely multi-line secrets go through the
  bare CLI.
- **A clipboard that changed since the run started.** Set
  `DOPPLER_SET_EXPECT_SHA` to the fingerprint you showed the user and the write
  refuses if the clipboard has moved since. The button does this automatically.
- **A value under 24 characters**, unless you pass `--force` or answer the
  prompt. Short is not always wrong, so it asks rather than refusing.

With no terminal to ask on, the prompts refuse rather than assume yes.

Everything that can be judged from the clipboard alone is available without a
project or a variable name:

```bash
bash "$SKILL/scripts/doppler-set.sh" --validate
```

It prints the length, flags a short value, and refuses an empty, multi-line,
whitespace-bearing or variable-name-shaped clipboard. The button runs it as its
first act, so a bad clipboard is caught before you are asked to pick anything.
A wrong clipboard is wrong whichever project you were about to choose, and being
told so after two dialogs is how you end up clicking through the warning.

### What the guard is for

On 2026-08-29 the 25-character string `OPENROUTER_MANAGEMENT_KEY` was written
as the *value* of `OPENROUTER_MANAGEMENT_KEY` in `my-app`. Two seconds
later Doppler's Vercel sync pushed it to production and overwrote the only
surviving copy of the real key. Doppler had no rollback and Vercel keeps no
version history for env vars, so it could only be replaced, not recovered.

**How the name got onto the clipboard is the whole story.** You copy the key,
press the button, and then reach the field asking for the variable name — so you
copy the name to paste in. That copy replaces the key. `pbpaste | doppler
secrets set` then reads the clipboard as it is *now*, not as it was when you
pressed, and stores the name.

The button read the clipboard twice with a dialog in between, and its own
interface gave you a reason to change it in that gap. Nothing else had to go
wrong.

Nothing caught it either. The value is longer than twelve characters and holds
no whitespace, which was the whole of the checking. And the read-back that
reported success compared the stored value against the clipboard it had just
come from, so it agreed with itself.

Two fixes, and they work together. The clipboard is now fingerprinted before
any dialog opens and re-checked before every write, so a value that changed
mid-flow is refused rather than stored. And the name is chosen from a list of
what the project already holds, so there is nothing to copy in the first place.

**A read-back is a transport check, not a correctness check.** It proves the
bytes arrived unmangled. It cannot tell you they were the right bytes. The only
thing that can is exercising the credential against the real API, which is a
separate step and is never optional for a key that reaches production.

### By hand, if you would rather

```bash
pbpaste | doppler secrets set OPENAI_API_KEY --silent -p my-app -c dev
pbpaste | doppler secrets set OPENAI_API_KEY --silent -p my-app -c prd
```

That is the whole mechanism the wrapper is built on, and it is fine for a
`dev` config on a project with no sync. It has none of the four refusals, so
check the clipboard yourself before you run it, and read Step 7 before you
point it at a `prd` that syncs anywhere.

Both lines, because `dev` and `prd` are separate configs and your laptop reads
`dev`. Write only `prd` and the key works in production while `npm run dev`
cannot see it. The clipboard still holds the key for the second line.

Where the two environments genuinely need different values, such as a payment
provider's test and live keys, copy each one and write it to its own config,
and pass the config names to the wrapper: `doppler-set.sh STRIPE_SECRET_KEY
my-app prd`.

On Linux, swap `pbpaste` for `xclip -selection clipboard -o` on X11, or
`wl-paste` on Wayland. The wrapper picks whichever of the three you have.

Then tell Claude the name:

> `OPENAI_API_KEY` is in Doppler under `my-app`, in both `dev` and `prd`. Wire
> it up and run things with `doppler run`.

### Why `--silent` is not optional

Leave it off and a successful write prints the **entire config** to stdout when
it finishes. Not the one variable you just set. All of them, values included.
Measured on CLI v3.76.5 against a config holding three variables: 494 bytes out
without the flag, 0 bytes with it.

In a terminal you are looking at, that is a convenience. In an AI session it is
a tool result, and a tool result is transcript.

Prove it on your own machine rather than taking the number on faith. Write a
throwaway value, count the bytes, confirm it landed anyway, delete it:

```bash
printf 'probe-value-123' | doppler secrets set SCRATCH_PROBE --silent -p my-app -c dev | wc -c
[ "$(doppler secrets get SCRATCH_PROBE --plain -p my-app -c dev | tr -d '\n' | shasum -a 256)" \
  = "$(printf 'probe-value-123' | tr -d '\n' | shasum -a 256)" ] && echo "value matches"
doppler secrets delete SCRATCH_PROBE --yes -p my-app -c dev
```

The first line prints `0`. The second prints `value matches`. Drop `--silent`
from the first line and watch the byte count jump to the size of your whole
config.

Notice what the second line does not do. `doppler secrets get --plain` writes
the value to stdout, so it stays inside a `$(...)` and only its hash comes out.
Reach for that shape any time you need to confirm a real secret rather than a
throwaway probe. The wrapper and the button do the same thing for the same
reason.

And notice what it cannot do. Here the expected value is written out twice, so
the comparison is real. On a genuine key both sides come from the same
clipboard, and a hash always agrees with itself. That check is worth running,
because a mangled write is a thing that happens. It is just not the check you
think it is, so do not let a green one stand in for using the credential.

The one thing forfeited by never seeing the value is that you cannot eyeball
it, and a key you have never looked at is a key you can get wrong without
noticing. That is the trade, and the answer to it is Step 6's refusals plus a
real call against the vendor's API, not a peek.

### Why the value never reaches the model

The key moves clipboard, pipe, network. It is never a command-line argument, so
it is not in your shell history and not in a process list. Your assistant sees
the command you ran, not what flowed through the pipe. Run this yourself in a
terminal, or paste the whole line into your session, since either way the only
thing in the text is the variable's name.

---

## Step 7. Before you sync to a deploy platform

Optional, and worth doing for anything already in production.

A sync means adding a key in Doppler and having it appear in your hosting
platform without you opening a dashboard. Doppler pushes, the platform receives,
and you stop having two places to update.

Skip this whole step unless the app is already linked to Vercel and deployed.
Nothing later depends on it.

**Run the checker first.** From your linked project directory:

```bash
bash "$SKILL/scripts/vercel-sync-check.sh" production
```

It pulls your production variables and reports which ones came back empty. Those
are the ones that will hurt you. Vercel lets you mark a variable sensitive, which
makes it write-only, and a pull then returns it as an empty string with no error
and no warning. Build a vault from that pull and you have stored blanks. Sync the
blanks back and the live secrets are gone.

That is not hypothetical. Forty-five production secrets were captured as empty
strings this way while this skill was being written, including a service-role
database key and an app secret. They were caught before the sync ran.

A sync carries whatever Doppler holds, and a wrong value travels just as fast
as a blank. On 2026-08-29 a placeholder written to `my-app/prd` reached
Vercel production 2.1 seconds later and replaced a live key. Sync status read
`synced`, every check was green, and the running deployment kept working
because Vercel bakes env vars in at build time, so the damage was invisible
until the next deploy. **Once a sync exists, a write to that config is a
production write.** Treat it like one.

The safe arrangement: leave every sensitive variable where it is. The platform
keeps managing it, Doppler never learns it exists, and a sync cannot overwrite
what it does not know about. Rotating one of those still means the dashboard, and
that is the price of having marked it sensitive.

Full walkthrough, including the reserved names and what to do when the platform
rejects a duplicate: [`references/vercel-sync.md`](references/vercel-sync.md).

---

## Step 8. The button, if you are on a Mac

Optional. The command in Step 6 is the real path and works everywhere.

```bash
bash "$SKILL/scripts/install-button.sh"
```

That compiles an app into `~/Applications` using Apple's own `osacompile`, on
your machine. No binary ships with this skill. Bind it to a Stream Deck key or a
mouse button, then adding a key is: copy, press, answer two questions.

It reads the first twelve characters of your clipboard and its length, guesses
the variable name from twenty vendor prefixes, and hands the write to
`doppler-set.sh`. Its first act is `--validate`, so a clipboard that cannot be
a key is refused before the project picker opens. The name dialog offers
**Test only**, which runs the dry run
and shows you what would happen without writing anything — use it the first
time, and any time you are about to aim at something live. Every refusal in Step 6 applies, so the button cannot be
looser than the command. Afterwards it swaps the clipboard, so the key comes
off and a line for your session goes on.

The ordering there is load bearing. The only safe write is
`pbpaste | doppler secrets set`, so putting that command on the clipboard first
would destroy the value it needs to read.

**The button writes `prd`, and `prd` may be wired to production.** If the name
already exists, or the config syncs to a deploy platform, it stops and says
which before writing. Answer those dialogs rather than clicking through them:
one press on a synced config reaches your live site in about two seconds, and
neither Doppler nor the platform keeps a copy of what was there before.

The logic deliberately lives in the script rather than in the compiled app. An
app carries no version and looks identical however stale it is, and this one
sat two hours behind its source for two days without anything noticing. Now a
fix to the guards takes effect on the next press with no rebuild. Check the
button itself with:

```bash
bash "$SKILL/scripts/install-button.sh" --verify
```

It decompiles what is installed and diffs it against the source, because that
is the only honest way to ask.

---

## Step 9. Tell your assistant the rules

Offer to add this to the project's `CLAUDE.md`, ask before writing, and keep it
short. Substitute the real project name.

```markdown
## Secrets

Secrets live in Doppler under the `my-app` project, not in `.env`. Ask for a
variable by name and never ask for its value. Run local commands with
`doppler run -p my-app -c dev -- <cmd>`.

Never wrap `build`, `start` or `test` in `doppler run`. The CI runner has no
Doppler token and the deploy will fail.
```

---

## When something goes wrong

Every trap worth knowing, with the evidence behind it, is in
[`references/gotchas.md`](references/gotchas.md). The short list:

- `Doppler Error: EOF` on login means no terminal. Step 0.
- `The fallback file does not exist` means you are in a directory with no pin.
  Pass `-p` and `-c`.
- A deploy that suddenly cannot find its variables means something wrapped
  `build`. Step 5.
- `Secret name "VERCEL" is a reserved name` means an injected name got into
  your config. Delete it from Doppler, do not fight the platform.
- A key that 401s on every endpoint although the vault clearly holds it: check
  whether the stored value is the variable's own name. Step 6 refuses that now;
  anything written before it did is still sitting there.
- The button behaving unlike the source you just edited: it is a stale build.
  `install-button.sh --verify` says so, and re-running the installer fixes it.

## What the free tier holds

Three users, ten projects, four environments per project, and **five config
syncs**. The sync cap is the one that binds, and it counts per pairing of a
Doppler config with a platform environment, not per project. Six production apps
need six syncs. Plan which ones earn it before you start wiring them up.
