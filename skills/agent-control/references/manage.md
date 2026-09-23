# Manage

`$H` is the SSH alias resolved in SKILL.md. Commands marked `(confirm gate)` follow the confirm gate in SKILL.md. Get an explicit yes in this conversation before running them. The gate also requires a running-jobs check before any restart or update, a verified backup before config edits and updates, and a re-check of `hermes --version`, `hermes doctor`, and `hermes gateway status` afterwards.

## How to run commands

| Shape | Form |
|---|---|
| Native | `ssh -o BatchMode=yes "$H" 'bash -lc "hermes ..."'` |
| Docker | `ssh -o BatchMode=yes "$H" 'docker exec <container> hermes ...'` |

Use a login shell on native installs so `PATH` matches a real login (`hermes` may live in `~/.local/bin` or `~/.hermes/hermes-agent/venv/bin`). If `hermes` is missing on that PATH, use the absolute path from the snapshot.

Single-quote the remote command so `~` expands on the server, not on your machine.

## Cron jobs

Prefer the CLI over editing `cron/jobs.json` by hand.

| Command | What it does |
|---|---|
| `hermes cron list` | ids, schedule, next/last run |
| `hermes cron status` | whether the scheduler is running |
| `hermes cron runs --limit 30` | recent runs (also the running-jobs check) |
| `hermes cron pause <id>` | reversible stop. Prefer this over remove. |
| `hermes cron resume <id>` `(confirm gate)` | start it again |
| `hermes cron edit <id> --prompt ...` `(confirm gate)` | change the job's prompt field |
| `hermes cron run <id>` `(confirm gate)` | queue for the next tick |
| `hermes cron remove <id>` `(confirm gate)` | delete. Only when asked. |

Native:

```bash
ssh -o BatchMode=yes "$H" 'bash -lc "hermes cron list"'
ssh -o BatchMode=yes "$H" 'bash -lc "hermes cron status"'
ssh -o BatchMode=yes "$H" 'bash -lc "hermes cron runs --limit 30"'
ssh -o BatchMode=yes "$H" 'bash -lc "hermes cron pause <id>"'
ssh -o BatchMode=yes "$H" 'bash -lc "hermes cron resume <id>"'          # confirm gate
ssh -o BatchMode=yes "$H" 'bash -lc "hermes cron edit <id> --prompt ..."'  # confirm gate
ssh -o BatchMode=yes "$H" 'bash -lc "hermes cron run <id>"'            # confirm gate
ssh -o BatchMode=yes "$H" 'bash -lc "hermes cron remove <id>"'         # confirm gate, only when asked
```

Docker (same subcommands):

```bash
ssh -o BatchMode=yes "$H" 'docker exec <container> hermes cron list'
ssh -o BatchMode=yes "$H" 'docker exec <container> hermes cron pause <id>'
```

`cron run` queues the job for the next scheduler tick. It is not a live test of a credentialed scheduled run. Judge success from the job's output under `cron/output/<id>/`, not from the CLI saying it succeeded.

This file documents `cron edit --prompt`. For any other edit flag, read `hermes cron edit --help` on the server. Do not guess flags.

### Timezone

Before you schedule or change a schedule, look at the clock the job will use:

```bash
ssh -o BatchMode=yes "$H" 'TZ=<their tz> date'
```

Ask for their timezone if you do not have it. Do not assume one.

### A job is three things

A job's behaviour comes from all three of these:

1. Its own `prompt` field.
2. Any command file it references.
3. The skills it loads.

Check all three before calling an edit done. Dump the job (native path shown; Docker uses `/opt/data/cron/jobs.json`):

```bash
ssh -o BatchMode=yes "$H" 'python3 -c "
import json, os
p = os.path.expanduser(\"~/.hermes/cron/jobs.json\")
d = json.load(open(p))
jobs = d[\"jobs\"] if isinstance(d, dict) else d
want = \"<id>\"
for j in jobs:
    if str(j.get(\"id\")) == want or j.get(\"name\") == want:
        print(\"prompt:\", (j.get(\"prompt\") or \"\")[:2000])
        for k in (\"command\", \"script\", \"skills\", \"command_file\"):
            if j.get(k) is not None:
                print(k + \":\", j.get(k))
"'
```

Then read the referenced command file and each named skill. Grep all three for the behaviour you think you changed.

## Skills

| Shape | Directory |
|---|---|
| Native | `~/.hermes/skills/` |
| Docker | `/opt/data/skills/` |

List them with the CLI:

```bash
ssh -o BatchMode=yes "$H" 'bash -lc "hermes skills"'
ssh -o BatchMode=yes "$H" 'docker exec <container> hermes skills'
```

The agent may have edited a skill on its own. Before you overwrite one, compare mtimes. `ls --time-style` is GNU-only. Use `stat` with a fallback, or `ls -lT` (BSD) / `ls -l --full-time` (GNU):

```bash
# Native, remote mtime of the file you would replace
ssh -o BatchMode=yes "$H" 'bash -lc "stat -c \"%y %n\" ~/.hermes/skills/<name>/SKILL.md 2>/dev/null || stat -f \"%Sm %N\" -t \"%Y-%m-%d %H:%M:%S\" ~/.hermes/skills/<name>/SKILL.md"'
```

Docker:

```bash
ssh -o BatchMode=yes "$H" 'docker exec <container> sh -c "f=/opt/data/skills/<name>/SKILL.md; stat -c \"%y %n\" \"\$f\" 2>/dev/null || stat -f \"%Sm %N\" -t \"%Y-%m-%d %H:%M:%S\" \"\$f\""'
```

If that `stat` pair fails, use:

```bash
ssh -o BatchMode=yes "$H" 'ls -lT ~/.hermes/skills/<name>/SKILL.md 2>/dev/null || ls -l --full-time ~/.hermes/skills/<name>/SKILL.md'
```

Compare that timestamp to the copy you are about to write. If the remote copy is newer, show the diff and ask. Do not overwrite until they say yes.

```bash
scp "$H":.hermes/skills/<name>/SKILL.md /tmp/hermes-skill-remote.md
diff -u /tmp/hermes-skill-remote.md <local-skill>/SKILL.md
rm -f /tmp/hermes-skill-remote.md
```

Overwriting a skill is `(confirm gate)`. Copy named files, not a recursive clobber of the skill directory.

Native write (after the gate):

```bash
scp <local-skill>/SKILL.md "$H":.hermes/skills/<name>/SKILL.md
```

Docker write (after the gate). `docker cp` from the server, or write onto the host side of the `/opt/data` bind mount:

```bash
scp <local-skill>/SKILL.md "$H":/tmp/hermes-skill.md
ssh -o BatchMode=yes "$H" 'docker cp /tmp/hermes-skill.md <container>:/opt/data/skills/<name>/SKILL.md; rm -f /tmp/hermes-skill.md'
```

## Config

Two files, two jobs:

| File | What it holds | How to read |
|---|---|---|
| `config.yaml` | settings | `hermes config`, or `cat` the file |
| `.env` | secrets | **never `cat .env`**. List assignment key names only, as the snapshot does. |

Native paths: `~/.hermes/config.yaml`, `~/.hermes/.env`. Docker paths: `/opt/data/config.yaml`, `/opt/data/.env`.

```bash
ssh -o BatchMode=yes "$H" 'bash -lc "hermes config"'
ssh -o BatchMode=yes "$H" 'cat ~/.hermes/config.yaml'
ssh -o BatchMode=yes "$H" 'docker exec <container> hermes config'
```

Key names from `.env` (values must not appear). This drops non-assignment lines, so a multi-line PEM or JSON value cannot leak through:

```bash
ssh -o BatchMode=yes "$H" 'sed -nE "s/^(export[[:space:]]+)?([A-Za-z_][A-Za-z0-9_]*)=.*/\2/p" ~/.hermes/.env'
ssh -o BatchMode=yes "$H" 'docker exec <container> sed -nE "s/^(export[[:space:]]+)?([A-Za-z_][A-Za-z0-9_]*)=.*/\2/p" /opt/data/.env'
```

If `.env` is missing or unreadable, say so. Print `env: missing` or `env: unreadable`, not an empty dump.

Identity lives in `SOUL.md` next to config. Treat edits like config (backup, confirm gate).

### What needs a restart

Most config changes need a restart to take effect:

| Shape | Restart |
|---|---|
| Native | `hermes gateway restart` `(confirm gate)` |
| Docker | `docker restart <container>` `(confirm gate)` |

A few keys hot-reload (they take effect on the next message, no restart): `model.context_length`, `compression.*`, and approval/security settings. Everything else waits for a restart, including `session_reset.notify`.

On Docker, restart the container. `hermes gateway restart` inside the container may be respawned by s6, so it is the wrong tool there.

### Edit sequence

Any `config.yaml` or `.env` change is `(confirm gate)`.

1. Backup first, then verify the zip exists:

```bash
ssh -o BatchMode=yes "$H" 'bash -lc "ts=\$(date +%Y%m%d-%H%M%S); mkdir -p \"\$HOME/hermes-backups\"; hermes backup -o \"\$HOME/hermes-backups/pre-config-\$ts.zip\"; test -f \"\$HOME/hermes-backups/pre-config-\$ts.zip\" && ls -l \"\$HOME/hermes-backups/pre-config-\$ts.zip\""'
```

Docker (zip must land on the host side of the `/opt/data` bind mount; see [Updating](#updating) if `data_mount` is not `bind`):

```bash
ssh -o BatchMode=yes "$H" 'ts=$(date +%Y%m%d-%H%M%S); echo "$ts"; docker exec <container> sh -c "mkdir -p /opt/data/backups"; docker exec <container> hermes backup -o /opt/data/backups/pre-config-$ts.zip'
```

Then confirm it on the host with `sudo test -s <host-data-dir>/backups/pre-config-<ts>.zip`, using the snapshot mounts line for `<host-data-dir>`. The official image makes that directory mode 700 and owned by uid 10000, so without `sudo` a normal SSH user sees nothing there even when the zip is present.

2. Edit the file.
3. If the change is not in the hot-reload set, restart behind the confirm gate. Running-jobs check first (below).
4. Re-check `hermes --version`, `hermes doctor`, `hermes gateway status`.

Do not leave a `.bak` next to the live file. The zip is the backup.

## Gateway and logs

Prefer `hermes gateway` and `hermes logs`. Init-system commands are read-only fallbacks when those fail.

| Action | Native | Docker |
|---|---|---|
| Status | `hermes gateway status` | `docker exec <container> hermes gateway status` |
| Restart `(confirm gate)` | `hermes gateway restart` | `docker restart <container>` |
| Stop `(confirm gate)` | `hermes gateway stop` | `docker stop <container>` |
| Gateway log | `hermes logs gateway -n 100` | same via `docker exec`, plus `docker logs --tail 200 <container>` |
| Errors | `hermes logs errors --since 24h` | same via `docker exec` |

```bash
ssh -o BatchMode=yes "$H" 'bash -lc "hermes gateway status"'
ssh -o BatchMode=yes "$H" 'bash -lc "hermes logs gateway -n 100"'
ssh -o BatchMode=yes "$H" 'bash -lc "hermes logs errors --since 24h"'
ssh -o BatchMode=yes "$H" 'docker exec <container> hermes gateway status'
ssh -o BatchMode=yes "$H" 'docker exec <container> hermes logs gateway -n 100'
ssh -o BatchMode=yes "$H" 'docker logs --tail 200 <container>'
```

Before any restart or stop, the running-jobs check must **exit 0 and parse**, and show nothing `running`. A non-zero exit, an unparseable result, or any `running` row refuses the restart and says why. The guard fails closed.

```bash
ssh -o BatchMode=yes "$H" 'bash -lc "hermes cron runs --limit 30"'
ssh -o BatchMode=yes "$H" 'docker exec <container> hermes cron runs --limit 30'
```

Then, behind the gate:

```bash
ssh -o BatchMode=yes "$H" 'bash -lc "hermes gateway restart"'
ssh -o BatchMode=yes "$H" 'docker restart <container>'
```

After a restart, re-run version, doctor, and gateway status and report them. A failure is a failure. Give the backup path and `hermes import <zip>` `(confirm gate)` as the restore.

### ⚠️ UNVERIFIED on systemd hosts

When `hermes gateway status` or `hermes logs` fails on Linux, these read-only fallbacks may help. Prefer the hermes commands. This subsection has not been exercised on systemd hosts.

User unit (typical native install):

```bash
ssh -o BatchMode=yes "$H" "systemctl --user status 'hermes-gateway*'"
ssh -o BatchMode=yes "$H" "journalctl --user -u 'hermes-gateway*' -n 100 --no-pager"
```

System unit (drop `--user`):

```bash
ssh -o BatchMode=yes "$H" "systemctl status 'hermes-gateway*'"
ssh -o BatchMode=yes "$H" "journalctl -u 'hermes-gateway*' -n 100 --no-pager"
```

A user service stops at logout without linger:

```bash
ssh -o BatchMode=yes "$H" 'loginctl show-user <user> -p Linger'
```

Enabling linger is `(confirm gate)`:

```bash
ssh -o BatchMode=yes "$H" 'sudo loginctl enable-linger <user>'
```

macOS fallback when `hermes gateway status` fails:

```bash
ssh -o BatchMode=yes "$H" 'launchctl list | grep -i hermes'
```

## Updating

If you do not have a snapshot in this conversation, run it from SKILL.md first. Docker updates need its `compose`, `upgrade_command`, `rollback_pin`, and `data_mount` lines.

### Native

1. Read-only check:

```bash
ssh -o BatchMode=yes "$H" 'bash -lc "hermes update --check"'
```

2. Behind the confirm gate, **fail closed** on the running-jobs check (`hermes cron runs --limit 30` must exit 0, parse, and show nothing `running`).
3. Backup and verify the file exists:

```bash
ssh -o BatchMode=yes "$H" 'bash -lc "ts=\$(date +%Y%m%d-%H%M%S); mkdir -p \"\$HOME/hermes-backups\"; hermes backup -o \"\$HOME/hermes-backups/pre-update-\$ts.zip\"; test -f \"\$HOME/hermes-backups/pre-update-\$ts.zip\" && ls -l \"\$HOME/hermes-backups/pre-update-\$ts.zip\""'
```

4. Update `(confirm gate)`:

```bash
ssh -o BatchMode=yes "$H" 'bash -lc "hermes update"'
```

5. Re-check and report:

```bash
ssh -o BatchMode=yes "$H" 'bash -lc "hermes --version"'
ssh -o BatchMode=yes "$H" 'bash -lc "hermes doctor"'
ssh -o BatchMode=yes "$H" 'bash -lc "hermes gateway status"'
```

On failure, say so. Restore with `hermes import <zip>` `(confirm gate)`, using the zip you just wrote.

### Docker

Never run `hermes update` inside a container.

Read the snapshot lines `compose`, `upgrade_command`, `rollback_pin`, and `data_mount`.

If `data_mount` is not `bind`, **stop**. Explain that the backup zip would sit in a named volume, so you cannot confirm it on the host side of a bind mount, and this skill will not upgrade in that case.

If the snapshot shows compose:

1. Running-jobs check, fail closed (via `docker exec`).
2. Backup inside the data dir and confirm the zip on the **host** side of the bind mount:

```bash
ssh -o BatchMode=yes "$H" 'ts=$(date +%Y%m%d-%H%M%S); echo "$ts"; docker exec <container> sh -c "mkdir -p /opt/data/backups"; docker exec <container> hermes backup -o /opt/data/backups/pre-$ts.zip'
ssh -o BatchMode=yes "$H" 'sudo test -s <host-data-dir>/backups/pre-<ts>.zip && sudo ls -l <host-data-dir>/backups/pre-<ts>.zip'
```

`<host-data-dir>` is the host source on the snapshot mounts line whose destination is `/opt/data`. That directory is mode 700 and owned by the container's user, which is why the check needs `sudo`. With no `sudo` on the server, `docker exec <container> test -s /opt/data/backups/pre-<ts>.zip` proves the same thing, because the snapshot's `data_mount: bind` already shows `/opt/data` lives on the host.

3. Pin the current image so you can go back. The snapshot's `rollback_pin` is the local image ID (`sha256:...`), not a registry digest, so it cannot be pulled again. Tag it before the upgrade, while it is still on the host:

```bash
ssh -o BatchMode=yes "$H" 'docker tag <rollback_pin> <image-repo>:pre-upgrade'
```

`<image-repo>` is the snapshot's `image:` value without its tag (for example `nousresearch/hermes-agent`).

4. Run the snapshot's printed `upgrade_command` `(confirm gate)`. Do not rebuild that command by hand.
5. Re-check `hermes --version`, `hermes doctor`, and `hermes gateway status` via `docker exec`. On failure, say so. Restore data with `hermes import /opt/data/backups/pre-<ts>.zip` `(confirm gate)`. To roll the image back, point the compose service's `image:` at `<image-repo>:pre-upgrade` and run only the `up -d` half of `upgrade_command` (confirm gate). Skip the `pull`, because that tag exists only on this host.

If the snapshot shows the container is **not** compose-managed, do **not** recreate it. Do not reconstruct `docker run`. Do not `docker rm`. Tell the user it was started by hand, name the image tag from the snapshot, and hand the recreate to them.

## Emergency stop

`hermes pause` stops **new** work only (cron, kanban, new gateway turns). In-flight turns keep running. Say that plainly.

```bash
ssh -o BatchMode=yes "$H" 'bash -lc "hermes pause --reason \"...\""'
ssh -o BatchMode=yes "$H" 'docker exec <container> hermes pause --reason "..."'
```

Hard stop, behind the confirm gate (running-jobs check first; in-flight turns are why you are here, so report any `running` row rather than pretending the pause finished them):

```bash
ssh -o BatchMode=yes "$H" 'bash -lc "hermes gateway stop"'
ssh -o BatchMode=yes "$H" 'docker stop <container>'
```

Lift the pause with `hermes resume` `(confirm gate)`. If you also stopped the gateway or container, start it again behind the same gate (`hermes gateway restart` native, `docker start <container>` on Docker), then resume. Pause state lives in the data dir, so it survives a container stop.

## Backups

```bash
ssh -o BatchMode=yes "$H" 'bash -lc "hermes backup -o <path>"'
ssh -o BatchMode=yes "$H" 'bash -lc "hermes backup -o <path> --quick"'
ssh -o BatchMode=yes "$H" 'docker exec <container> hermes backup -o /opt/data/backups/<name>.zip'
```

`--quick` includes `state.db`. That file can be large and holds conversation history.

Keep backups on the server. Never copy them to your machine unless the user asks.

Verify the zip exists after every backup (`test -s` and `ls -l` on the path you passed; for Docker, `sudo test -s` on the host side of the bind mount, since that directory is mode 700 and owned by the container's user). Restore with `hermes import <zip>` `(confirm gate)`.
