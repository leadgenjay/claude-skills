---
name: agent-control
description: "Connect Claude Code over SSH to the server running your own self-hosted Hermes agent (Nous Research hermes-agent). Check its health, fix what broke, manage cron jobs, skills and config, and review what it sent. Use when the user says \"/agent-control\", \"my hermes agent\", \"hermes gateway\", \"check my agent\", \"hermes cron\", \"why did my agent fail\", \"ssh into my hermes server\", or \"hermes review\"."
---

# Hermes

Connect over SSH to the server that runs the user's own self-hosted Hermes agent. Check it, fix what broke, manage cron jobs, skills and config, and review what it sent. Load a reference only when that mode needs it. SSH PATH, quoting, cron-run, and Docker traps live in `references/gotchas.md`.

## Step 0 — Prerequisites

Verify every row before anything else. If a row fails, STOP and tell the user how to fix it. Do not guess or generate placeholder commands.

Resolve `$H` (next section) before the SSH rows. A row marked for one mode or one install shape applies only there, so a server without python3 still gets status, fix and manage.

| Requirement | Check | Where to get it |
|---|---|---|
| ssh client | `ssh -V` | Ships with macOS (Xcode command line tools, `xcode-select --install`). On Linux, the OpenSSH client package. |
| a reachable target | `ssh -o BatchMode=yes -o ConnectTimeout=10 "$H" true` | If this fails, run connect mode (`references/connect.md`). |
| the bundled scripts installed | `[ -f ~/.claude/skills/agent-control/scripts/hermes-snapshot.sh ]` | This skill's `scripts/` directory. Re-install the skill if the file is missing. |
| python3 on the server for review mode | `ssh "$H" 'command -v python3'` | Install Python 3 on the server. Skip review until it is there. |
| docker access for the SSH user (Docker installs) | `ssh "$H" 'docker ps >/dev/null'` | Add the SSH user to the `docker` group, or log in as a user that can talk to the daemon. |

A `docker: permission denied` line from the snapshot means the SSH user cannot talk to the daemon. Fix that (this table) before you decide the shape.

## Target resolution

1. If the first argument is `@<alias>`, that alias is `$H`.
2. Else `$HERMES_SSH_HOST` if set.
3. Else the SSH alias `hermes`.

Every remote command runs as `ssh -o BatchMode=yes "$H" '...'`. Single-quote the remote command so `~` expands on the server, not on this machine. On native linux and macos installs, wrap tool calls in `bash -lc "..."` so PATH matches a real login. Some installs keep `hermes` off even the login PATH (a macOS launchd install, for one), so when the snapshot prints `hermes_bin:`, use that absolute path in place of `hermes` in every command here and in the references. Docker installs run the CLI as `docker exec <container> hermes ...`.

If the BatchMode probe fails, go to connect mode. Do not guess a host.

## Modes

| Mode | What it does |
|---|---|
| `connect` | Set up the SSH alias, dedicated key, and config. `references/connect.md`. |
| `status` | Default. Run the snapshot, then summarize in plain language. This file. |
| `fix` | Snapshot, diagnose, propose the exact command, confirm gate, verify. Recipes in `references/manage.md`. |
| `manage` | Cron, skills, config, gateway, backup, update, Docker hand-off. `references/manage.md`. |
| `review` | Read-only review of what the agent sent and did. `references/review.md`. |

## Status mode

Run the bundled snapshot (read-only, never prompts, never prints a secret value). Stdin is the script. Positional args must follow `--`.

```bash
ssh -o BatchMode=yes "$H" 'bash -ls' < ~/.claude/skills/agent-control/scripts/hermes-snapshot.sh
ssh -o BatchMode=yes "$H" 'bash -ls -- --container <container>' < ~/.claude/skills/agent-control/scripts/hermes-snapshot.sh
```

| Exit | Meaning |
|---|---|
| 0 | Snapshot finished. First line is `shape: docker`, `linux`, `macos`, or `unknown`. |
| 2 | Hermes was not found. Say so. Offer connect mode, or ask where it is installed, then re-run. |
| 3 | More than one matching container. Print the list, ask the user which container (AskUserQuestion when available), re-run with `--container`. |
| 64 | Usage error (bad arguments). Fix the invocation and re-run. |

Then summarize in plain language. What is healthy, what is not, the one next step. A version older than 0.20.4 is a warning from the snapshot. Call it out, then keep going.

## Update check

Finish every status run with this, after the summary. It reads the latest release from GitHub on this machine and compares it with the snapshot's `version:` line, so nothing extra runs on the server.

```bash
curl -fsSL -H "User-Agent: Mozilla/5.0" https://api.github.com/repos/NousResearch/hermes-agent/releases/latest \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["tag_name"], "|", d["name"])'
```

The release tag looks like `v2026.9.11`. The snapshot's version line carries the same date in brackets, as in `Hermes Agent v0.21.2 (2026.9.11)`. Compare the two dates.

- If the dates match, or the agent's date is later, say in one line that it is on the latest release.
- If the agent's date is older, name both versions and offer to update. Ask with AskUserQuestion when it is available ("Update now" or "Not now"). On yes, follow Updating in `references/manage.md`. The confirm gate, the running-jobs check and the backup all still apply. Never start an update the user did not ask for.
- If the request fails or the snapshot printed `version: unavailable`, say the check could not run. Never report the agent as current without a result.

New commits on the main branch with no newer release do not make the agent out of date. Offer updates for releases only.

On native installs, `hermes update` sets aside any hand edits to the agent's own code before it pulls. If `git -C ~/.hermes/hermes-agent status --short` on the server shows changed files, tell the user before updating and save the diff first (`git -C ~/.hermes/hermes-agent diff > ~/hermes-backups/local-edits-<ts>.patch`), so the edits can be put back afterwards.

## Shapes

Prefer `hermes gateway` and `hermes logs` over `systemctl`, `journalctl`, or `launchctl`. Those are read-only fallbacks when the hermes command itself fails. systemd fallbacks are unverified (see `references/gotchas.md`).

| Shape | CLI | Restart | Logs | Data |
|---|---|---|---|---|
| docker | `docker exec <container> hermes ...` | `docker restart <container>` (confirm gate) | `docker logs --tail 200 <container>` | `/opt/data` (official image `nousresearch/hermes-agent`) |
| linux | `bash -lc "hermes ..."` (`~/.local/bin/hermes` or `~/.hermes/hermes-agent/venv/bin/hermes`) | `hermes gateway restart` | `hermes logs gateway` | `~/.hermes` |
| macos | same as linux | `hermes gateway restart` | `hermes logs gateway` | `~/.hermes` |

On native shapes, the snapshot resolves the absolute binary path. Follow that.

## The confirm gate

The following need an explicit yes in the conversation. `cron create/edit/run/resume/remove`, overwriting a skill, any `SOUL.md` / `config.yaml` / `.env` change, `gateway restart/stop`, `docker restart`, `docker compose up`, `hermes update`, `hermes resume`.

- Before any restart or update, `hermes cron runs --limit 30` must exit 0 and parse, and show nothing `running`. A non-zero exit, an unparseable result, or any `running` row refuses the restart and says why. The guard fails closed.
- Before config edits and updates, `hermes backup -o <explicit path>` has run and the file is verified to exist.
- After an update or restart, re-run `hermes --version`, `hermes doctor`, and `hermes gateway status`, and report them. A failure is surfaced as a failure, along with the backup path to restore from via `hermes import <zip>`.
- Emergency stop. `hermes pause --reason <text>` first, then say plainly that in-flight turns continue (`pause` does not stop them). `hermes gateway stop` (behind the gate) is the hard stop.
- `doctor --fix` is not used.

On docker, wrap those CLI calls with `docker exec <container>`. Restart with `docker restart <container>` after the same cron-runs precondition.

## Rules

- Never print `.env` values or `docker inspect` env values (`Config.Env`). The snapshot prints assignment key names only.
- Never copy `state.db` or logs off the server. Query them in place (`sqlite3 -readonly` on the box). Review mode pipes every excerpt through `scripts/mask-excerpts.py` on the server.
- Pause a cron job rather than remove it, unless the user asked to remove it.
- Check whether the agent edited a file more recently before overwriting it.
- Back up to a timestamped path (`hermes backup -o ...`), not a `.bak` next to the file.
- Treat a bare non-login SSH probe as weak evidence. Non-interactive PATH is thin. Wrap native commands in `bash -lc` (see `references/gotchas.md`).
