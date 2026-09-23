# Review

A read-only 24h review of what the agent did and what it told its owner. Four questions, in order of what they cost when wrong:

1. Was the data accurate?
2. Was the reporting good?
3. Was the messaging readable?
4. Was anything blocked?

This mode proposes. It never patches. Fixes are a separate pass through [manage.md](manage.md) and the confirm gate.

`$H` is the SSH alias resolved in SKILL.md. Native commands use `ssh -o BatchMode=yes "$H" 'bash -lc "hermes ..."'`. Docker commands use `ssh -o BatchMode=yes "$H" 'docker exec <container> hermes ...'`.

| Path | Native | Docker |
|---|---|---|
| `state.db` | `~/.hermes/state.db` | `/opt/data/state.db` |
| `jobs.json` | `~/.hermes/cron/jobs.json` | `/opt/data/cron/jobs.json` |
| cron output | `~/.hermes/cron/output/` | `/opt/data/cron/output/` |
| config | `~/.hermes/config.yaml` | `/opt/data/config.yaml` |

Never copy `state.db`, logs, or cron output to your machine.

```
MASKING (hard rule)
Every excerpt is piped through scripts/mask-excerpts.py ON THE SERVER
before it prints. If the masker prints the suppressed marker, report
that excerpt as suppressed. Never retry without masking.
```

```bash
scp ~/.claude/skills/agent-control/scripts/mask-excerpts.py "$H":/tmp/hermes-mask.py
ssh "$H" 'sqlite3 -readonly ... | python3 /tmp/hermes-mask.py'
```

Docker, or any host without the `sqlite3` CLI (the official image ships none), uses Python's own `sqlite3` module. `python3` is on the `docker exec` PATH in that image. Write each query as a small file on your machine, copy it up next to the masker, and run it read-only:

```python
# hermes-q.py: write this locally, one SELECT per file
import sqlite3, sys
DB = sys.argv[1] if len(sys.argv) > 1 else "/opt/data/state.db"
SQL = """
SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name
"""
db = sqlite3.connect("file:%s?mode=ro" % DB, uri=True)
for row in db.execute(SQL):
    print(" | ".join("" if v is None else str(v) for v in row))
```

```bash
scp hermes-q.py "$H":/tmp/hermes-q.py
# Docker: the query goes in on stdin, the masker runs on the server
ssh "$H" 'docker exec -i <container> python3 - < /tmp/hermes-q.py | python3 /tmp/hermes-mask.py'
# Native host without sqlite3
ssh "$H" 'python3 /tmp/hermes-q.py ~/.hermes/state.db | python3 /tmp/hermes-mask.py'
```

Swap the `SQL` string for each query in the phases below. `.tables` becomes the query above, and `.schema <t>` becomes `SELECT sql FROM sqlite_master WHERE name = '<t>'`. Remove `/tmp/hermes-q.py` together with the masker at the end.

Copy the masker once in Phase 0. Delete it when the review ends (`rm -f /tmp/hermes-mask.py`). The masker must run on the server. If `python3` is missing there, stop and say so. Do not pull excerpts onto your machine to mask them.

## Phase 0. Anchor

```bash
ssh -o BatchMode=yes "$H" 'date'
```

If SSH stalls, retry once before debugging. All windows below are a trailing 24h. If you will compare numbers across runs, record this timestamp and keep the same bound by hand.

Then copy the masker (pattern above) and leave it at `/tmp/hermes-mask.py` until Phase 5 finishes.

## Phase 1. What it sent

### Discover tables

Native:

```bash
ssh -o BatchMode=yes "$H" 'sqlite3 -readonly ~/.hermes/state.db ".tables"'
```

Docker. The official image has no `sqlite3` CLI, so use the query-file method above (its example query is `.tables`). Do not copy `state.db` off the server. A brand-new install with no conversations yet may have no `state.db`, so check first and say so if it is missing:

```bash
ssh -o BatchMode=yes "$H" 'docker exec <container> test -f /opt/data/state.db && echo present || echo missing'
```

Expect `sessions`, `messages`, and possibly `delivery_obligations`. If a table is missing, skip its query and say so.

Also run `.schema sessions` and `.schema messages`. Discover the session source column (it may be named `source`, `platform`, or something else). Do not assume its values. Print the distinct values you actually see, then join `messages` to `sessions` on the id column `.schema` shows.

```bash
ssh -o BatchMode=yes "$H" 'sqlite3 -readonly ~/.hermes/state.db ".schema sessions"'
ssh -o BatchMode=yes "$H" 'sqlite3 -readonly ~/.hermes/state.db ".schema messages"'
```

Docker. The same `.schema` lookups through the query-file method (`SELECT sql FROM sqlite_master WHERE name = 'sessions'`).

### Delivery obligations

If `delivery_obligations` exists, query the last 24h. Pipe through the masker. Any row not in state `delivered`, any `attempts > 1`, and any non-null `last_error` is a finding.

Native:

```bash
scp ~/.claude/skills/agent-control/scripts/mask-excerpts.py "$H":/tmp/hermes-mask.py
ssh "$H" 'sqlite3 -readonly ~/.hermes/state.db "
SELECT obligation_id, platform, state, attempts, last_error,
       datetime(created_at,\"unixepoch\",\"localtime\") ts,
       substr(replace(content,char(10),\"⏎\"),1,300)
FROM delivery_obligations
WHERE created_at > strftime(\"%s\",\"now\")-86400
ORDER BY created_at
" | python3 /tmp/hermes-mask.py'
```

Docker: put the same SELECT into `hermes-q.py` (plain single quotes, now that it lives in a Python file) and run it through the query-file method:

```python
SQL = """
SELECT obligation_id, platform, state, attempts, last_error,
       datetime(created_at, 'unixepoch', 'localtime') AS ts,
       substr(replace(content, char(10), '⏎'), 1, 300)
FROM delivery_obligations
WHERE created_at > strftime('%s', 'now') - 86400
ORDER BY created_at
"""
```

If `.schema delivery_obligations` shows different column names, use what you see. Keep the same columns in spirit (state, attempts, last_error, created_at, a short content excerpt).

### Assistant messages

Last 24h, joined to sessions. Use the source column you discovered. Do not filter to a guessed platform. Skip empty bodies (tool-call turns often have none). The `⏎` replacement keeps one row per message and preserves where the newlines were (you need them for the split check in Phase 3).

Native (rename `s.source` if `.schema` says otherwise):

```bash
ssh "$H" 'sqlite3 -readonly ~/.hermes/state.db "
SELECT m.id, s.source,
       datetime(m.timestamp,\"unixepoch\",\"localtime\") ts,
       substr(replace(m.content,char(10),\"⏎\"),1,300)
FROM messages m JOIN sessions s ON s.id=m.session_id
WHERE m.role=\"assistant\"
  AND m.timestamp > strftime(\"%s\",\"now\")-86400
  AND m.content IS NOT NULL AND length(trim(m.content)) > 0
ORDER BY m.timestamp
" | python3 /tmp/hermes-mask.py'
```

Docker. The same SELECT through the query-file method, with plain single quotes in place of the escaped double quotes.

For any message worth a close read, pull it in full by id, still through the masker (`SELECT content FROM messages WHERE id=N`).

### Failed jobs and gateway warnings

Failed jobs from `cron/jobs.json` (`last_status`, `last_error`, `last_delivery_error`), via a small python3 one-shot, masked. Native:

```bash
ssh "$H" 'python3 -c "
import json, os
p = os.path.expanduser(\"~/.hermes/cron/jobs.json\")
d = json.load(open(p))
jobs = d[\"jobs\"] if isinstance(d, dict) else d
for j in jobs:
    st = j.get(\"last_status\")
    err = (j.get(\"last_error\") or \"\")[:120]
    derr = (j.get(\"last_delivery_error\") or \"\")[:120]
    if derr or (st not in (None, \"ok\")):
        print(j.get(\"id\"), j.get(\"name\"), \"|\", st, \"|\", err, \"|\", derr)
" | python3 /tmp/hermes-mask.py'
```

Docker (path inside the container). If `python3` is missing in the container, say so. You can `docker exec cat /opt/data/cron/jobs.json` and run the same one-shot with `python3` on the host. Still do not copy the file to your machine.

```bash
ssh "$H" 'docker exec <container> python3 -c "
import json
d = json.load(open(\"/opt/data/cron/jobs.json\"))
jobs = d[\"jobs\"] if isinstance(d, dict) else d
for j in jobs:
    st = j.get(\"last_status\")
    err = (j.get(\"last_error\") or \"\")[:120]
    derr = (j.get(\"last_delivery_error\") or \"\")[:120]
    if derr or (st not in (None, \"ok\")):
        print(j.get(\"id\"), j.get(\"name\"), \"|\", st, \"|\", err, \"|\", derr)
" | python3 /tmp/hermes-mask.py'
```

Gateway warnings, masked:

```bash
ssh -o BatchMode=yes "$H" 'bash -lc "hermes logs gateway --since 24h --level WARNING" | python3 /tmp/hermes-mask.py'
ssh -o BatchMode=yes "$H" 'docker exec <container> hermes logs gateway --since 24h --level WARNING | python3 /tmp/hermes-mask.py'
```

If the user named a focus, still run this whole Phase 1 failure scan. Grade only matching items in Phase 3.

## Phase 2. What it did

Recent runs, masked:

```bash
ssh -o BatchMode=yes "$H" 'bash -lc "hermes cron runs --limit 200" | python3 /tmp/hermes-mask.py'
ssh -o BatchMode=yes "$H" 'docker exec <container> hermes cron runs --limit 200 | python3 /tmp/hermes-mask.py'
```

Newest files in `cron/output/` from the last 24h. GNU find uses `-newermt`. On macOS (BSD find) use `-mtime -1`. If `find` rejects `-newermt` (BusyBox), use `-mtime -1`.

Native:

```bash
ssh -o BatchMode=yes "$H" 'find ~/.hermes/cron/output -newermt "-24 hours" -type f | head -40'
ssh -o BatchMode=yes "$H" 'find ~/.hermes/cron/output -mtime -1 -type f | head -40'
```

Docker:

```bash
ssh -o BatchMode=yes "$H" 'docker exec <container> find /opt/data/cron/output -newermt "-24 hours" -type f | head -40'
ssh -o BatchMode=yes "$H" 'docker exec <container> find /opt/data/cron/output -mtime -1 -type f | head -40'
```

List paths only with `find`. Read file contents through the masker. Do not `scp` them home.

```bash
ssh "$H" 'cat ~/.hermes/cron/output/<job_id>/<file> | python3 /tmp/hermes-mask.py'
ssh "$H" 'docker exec <container> cat /opt/data/cron/output/<job_id>/<file> | python3 /tmp/hermes-mask.py'
```

Read the cron output files that correspond to Phase 1 deliveries. The output file is the raw material. The obligation `content` is what was sent. Divergence between them is itself a finding.

## Phase 3. Grade

Work message by message. Every finding needs the evidence inline: id, timestamp, the masked excerpt, and (for accuracy findings) the contradicting source.

Grade these dimensions:

1. **Accuracy of data.** For each number or claim in a delivered message, find where it came from (the job prompt, a command file it references, a script, a skill, a state file) and check it. Patterns to look for:
   - a metric rendered as zero when the upstream API was unavailable (should say "unavailable", never a fake zero)
   - "done" or "fixed" without artifact, command, or exit-status evidence
   - a green run that processed zero items, reported as healthy
   - growth deltas computed against a stale baseline
   - truncated fields (a label that ends in `...`) reported as complete
2. **Quality of reporting.** Did silent-on-success jobs stay silent? Did two jobs tell the owner the same thing twice? Are lists capped with an honest `+N more`, or dumped in full? Does the message say what the owner should do, or only relay data? Is anything delivered daily that has had zero actionable content all week (a candidate to fold or silence)?
3. **Readability.** Some platforms split a message on blank lines. Count would-be bubbles (`⏎⏎` in the excerpt, or a split on blank lines). Check for interpolated foreign text (email bodies, signatures, quoted threads) left raw, messages over about 30 lines / 3000 chars that should have been capped, and markdown in a surface that renders none of it.
4. **Blocking and delivery.** Beyond Phase 1's hard failures, look at shape. Messages per hour, the largest burst (a huge dump is unreadable and is the volume pattern that gets a sender rate-limited), retry storms in `delivery_obligations`, and repeated sends of near-identical content.
5. **Secrets and PII in delivered text.** A full card number, CVV, API key, or a customer's personal data in a delivered message is a finding on its own. Report it masked (the masker should already have done that) and name the skill, job, or script that printed it.
6. **Gateway system banners.** Lines the agent did not write (`Session automatically reset`, `Model: ...`, `Context compaction complete`) arriving as delivered messages are gateway noise. Check `session_reset.notify` in `config.yaml`. The gateway reads that file at start. Hot-reload keys are listed in [manage.md](manage.md). This one is not among them.
7. **Same fact, N messages.** Count how many separate messages carried one event. More than one is a finding. The fix is one sentence with the action, at the first place it is known.

If the user named a focus, still run Phase 1's failure scan in full. Delivery failures stay in the report. Grade the other dimensions only for messages and jobs matching the focus.

## Before you report

Check `hermes cron runs` and `hermes logs` since each event for a fix that already landed. Drop those findings.

```bash
ssh -o BatchMode=yes "$H" 'bash -lc "hermes cron runs --limit 200" | python3 /tmp/hermes-mask.py'
ssh -o BatchMode=yes "$H" 'bash -lc "hermes logs errors --since 24h" | python3 /tmp/hermes-mask.py'
ssh -o BatchMode=yes "$H" 'bash -lc "hermes logs gateway --since 24h" | python3 /tmp/hermes-mask.py'
```

Docker. Same three commands via `docker exec <container>`, still piped to `/tmp/hermes-mask.py` on the host.

A finding whose fix already landed in those logs or runs is dropped. A finding that is still happening is kept.

## Phase 5. Report

Terminal report, ranked by cost, not by category. For each finding:

- what happened (id, timestamp, masked excerpt)
- why it is wrong
- root cause (the script, the job prompt, or the skill)
- the proposed fix, and where it must land

Close with a short "apply?" list for the user to pick from. Apply nothing here. Approved fixes are a fresh pass through [manage.md](manage.md) and the confirm gate.

When the report is done:

```bash
ssh -o BatchMode=yes "$H" 'rm -f /tmp/hermes-mask.py'
```
