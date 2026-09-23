# Gotchas

Lessons that keep this skill from lying to you. Each one names the trap, then the command that avoids it. Native examples use `bash -lc`. Docker wraps the CLI as `docker exec <container> hermes ...`.

## Non-login SSH has a thin PATH

A non-interactive SSH session gets a minimal PATH (on macOS, `PATH=/usr/bin:/bin:/usr/sbin:/sbin`). Homebrew, `~/.local/bin`, and the Hermes venv are missing, so `command -v hermes` reports absent on a box where the gateway is healthy. The gateway (launchd, systemd, or s6) starts with a full PATH. Wrap native tool calls in a login shell.

```bash
ssh -o BatchMode=yes "$H" 'bash -lc "command -v hermes"'
```

A bare `ssh "$H" 'command -v hermes'` is weak evidence. Do not conclude a binary is missing from that probe.

The reverse happens inside the official Docker image. `docker exec` starts with `/opt/hermes/bin` on PATH, but `bash -l` resets PATH to the system default and drops it. Call `docker exec <container> hermes ...` directly, never through a login shell inside the container.

## Single-quote remote commands so `~` expands on the server

Single-quote the remote command so `~` expands on the server. Double quotes let this machine expand `$HOME` (and, in some shells, `~`) and send a path that does not exist there.

```bash
ssh -o BatchMode=yes "$H" 'ls ~/.hermes'
```

This bites every `~` path.

The remote login shell may be zsh, which globs an unquoted `*`. Quote patterns (`--include='*.py'`) or run the probe under `bash -c`.

## `cron run` over SSH is not a test of a scheduled job

`hermes cron run` executes in the SSH session. Jobs that need the scheduler's environment, a GUI keychain, or another credential store fail here even when they are healthy. The CLI can still print `Ran now: succeeded` after the wrapper already failed.

Exercise a credentialed job with a one-shot the scheduler picks up. `--deliver local` keeps the probe off chat. Confirm from the files the job wrote, not from the CLI's own "succeeded". Then remove the probe job (confirm gate).

```bash
ssh -o BatchMode=yes "$H" 'bash -lc "hermes cron create \"2m\" --name probe --script <script> --no-agent --deliver local --repeat 1"'
ssh -o BatchMode=yes "$H" 'ls -la ~/.hermes/cron/output/<job-id>/'
ssh -o BatchMode=yes "$H" 'bash -lc "hermes cron remove <job-id>"'
```

On docker, the output dir is under `/opt/data/cron/output/<job-id>/`.

## A green run can process zero items

`Last run: ok` means the scheduler launched the job. Read the output directory and count what it processed. Report empty work as empty work.

```bash
ssh -o BatchMode=yes "$H" 'bash -lc "hermes cron runs --limit 30"'
ssh -o BatchMode=yes "$H" 'ls -la ~/.hermes/cron/output/<job-id>/'
```

## `pause` does not stop in-flight turns

`hermes pause --reason <text>` stops **new** work (cron, kanban, new gateway turns). Turns already running keep going. Say that plainly. The hard stop is `hermes gateway stop`, behind the confirm gate.

```bash
ssh -o BatchMode=yes "$H" 'bash -lc "hermes pause --reason emergency-stop"'
```

## Some platforms split a message on blank lines

Some chat adapters split outgoing text on blank lines, so one report arrives as many messages. Collapse blank-line runs in text you did not author (quoted mail, signatures, foreign fields). Cap long lists with an honest `+N more`. The full record stays on disk. Nobody reads a 70-row dump on a phone.

```bash
python3 -c 'import sys,re; print(re.sub(r"\n\s*\n+", "\n", sys.stdin.read()))'
```

## Never print `.env` values

`.env` is readable over this link. So is `docker inspect` `Config.Env`. Do not `cat` either into a transcript, a log, a commit, or a chat message. The snapshot prints assignment key names only. For an ad-hoc name list:

```bash
ssh -o BatchMode=yes "$H" 'sed -nE "s/^(export[[:space:]]+)?([A-Za-z_][A-Za-z0-9_]*)=.*/\2/p" ~/.hermes/.env'
```

## Back up to a timestamped path

A `.bak` next to a live file is how keys leak into sync jobs and git. Use `hermes backup -o` with an explicit timestamped path, then verify the file exists. On docker, write under `/opt/data/backups/` and confirm it on the **host** side of that bind mount. The official image makes that directory mode 700, owned by uid 10000, so a plain `test -f` as your SSH user reports the zip missing when it is there. Use `sudo test -s`, or `docker exec <container> test -s /opt/data/backups/<file>` when `sudo` is not available.

```bash
ssh -o BatchMode=yes "$H" 'bash -lc "hermes backup -o ~/.hermes/backups/pre-<ts>.zip"'
ssh -o BatchMode=yes "$H" 'test -f ~/.hermes/backups/pre-<ts>.zip'
```

## Retry an SSH stall once

An overlay network (or a host dropping to sleep) can stall an in-flight session. Retry the same command once before debugging ssh. If it still fails, the host is unreachable. That needs the user, not more flags.

```bash
ssh -o BatchMode=yes -o ConnectTimeout=10 "$H" true
```

## The agent edits its own files

Hermes is an active agent, not a passive file store. Check the remote mtime before overwriting a skill, prompt, or `SOUL.md`. If the copy on the server is newer, stop and tell the user.

```bash
ssh -o BatchMode=yes "$H" 'ls -la ~/.hermes/skills/<name>/'
```

## Most `config.yaml` changes need a gateway restart

`config.yaml` is read at gateway start. Edits sit inert until a restart. A few keys hot-reload. If you are not sure, restart (confirm gate, including the `cron runs --limit 30` precondition). Native uses `hermes gateway restart`. Docker uses `docker restart <container>`.

```bash
ssh -o BatchMode=yes "$H" 'bash -lc "hermes gateway restart"'
```

## A local Docker skill shadows a shared skill of the same name

On docker, a skill in `$HERMES_HOME/skills` (often `/opt/data/skills` on the official image) hides the image's shared skill of the same name. Check the local copy first. Editing the shared copy does nothing if a local one exists.

```bash
ssh -o BatchMode=yes "$H" 'docker exec <container> ls -la /opt/data/skills/<name>'
ssh -o BatchMode=yes "$H" 'docker exec <container> hermes skills'
```

## A recreate that drops a named volume detaches data

Inspect mounts as source to destination only. Never print `Config.Env`. If `/opt/data` is a named volume (not a bind mount), say so and stop an upgrade or recreate that would drop it. Recreate is the user's. This skill restarts with `docker restart <container>` and hands a hand-started container back rather than reconstructing `docker run`.

```bash
ssh -o BatchMode=yes "$H" 'docker inspect --format "{{range .Mounts}}{{.Source}} -> {{.Destination}} ({{.Type}}){{println}}{{end}}" <container>'
```

## `hermes update` inside a container is lost on the next recreate

`docker exec <container> hermes update` writes the container filesystem. The next pull/recreate puts the image back. Do not update inside. Backup first (`hermes backup -o /opt/data/backups/pre-<ts>.zip`, verify on the host). Compose upgrades belong in `references/manage.md`. A hand-started container is handed back to the user.

```bash
ssh -o BatchMode=yes "$H" 'docker exec <container> hermes backup -o /opt/data/backups/pre-<ts>.zip'
```

## systemd fallbacks

⚠️ UNVERIFIED on systemd hosts. Prefer `hermes gateway status` and `hermes logs`. If that command itself failed, a read-only unit probe is the fallback (unit `hermes-gateway[-<profile>].service`). Do not treat this output as proven. User lingering so a systemd user session survives logout is in the same bucket. Do not enable lingering unless the user asked.

```bash
# ⚠️ UNVERIFIED on systemd hosts
ssh -o BatchMode=yes "$H" 'systemctl --user status hermes-gateway.service'
```
