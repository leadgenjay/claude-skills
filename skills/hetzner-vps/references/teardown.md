# Teardown, and what keeps billing if you skip it

**Powering a server off does not stop the bill.** Hetzner charges for the reserved resources of a
stopped server, so "I shut it down over the weekend" saves nothing. Deleting it is the only thing
that stops the meter. This surprises almost everyone, so say it before the user needs to know it.

Four things bill, and deleting the server removes only the first two.

| Resource | Billed | Survives server deletion |
|---|---|---|
| Server | hourly, capped at the monthly price | no |
| Primary IPv4 | 0.60 / month | **yes, if it was created as a standalone Primary IP** |
| Snapshots | 0.0199 / GB / month | **yes** |
| Volumes | 0.0767 / GB / month | **yes** |
| Floating IPs | 3.50 / month | **yes** |

Firewalls are free. Leaving one behind costs nothing but clutters the project.

---

## Delete by pinned ID. Never by name.

The IDs recorded in Phase 5 are the whole point. A teardown that re-derives its target from a name
or a pattern is one typo away from deleting something else, and Hetzner projects routinely hold
production servers belonging to other work.

```bash
TOKEN="${HCLOUD_TOKEN:-$(tr -d '\n\r" ' < "$HOME/.config/hcloud/token" 2>/dev/null)}"
SERVER_ID=<the id from Phase 5>
FIREWALL_ID=<the id from Phase 5>
```

**Confirm the target before deleting it.** One extra call, and it is the difference between a
routine teardown and an incident:

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.hetzner.cloud/v1/servers/$SERVER_ID" \
| python3 -c "
import sys, json
s = json.load(sys.stdin)['server']
print('about to delete:')
print('  name  :', s['name'])
print('  type  :', s['server_type']['name'], 'in', s['location']['name'])
print('  ipv4  :', s['public_net']['ipv4']['ip'])
print('  labels:', s.get('labels'))
print('  created:', s['created'])
print('  delete-protected:', s['protection']['delete'])
"
```

**The server object has `location`, not `datacenter`.** Verified 2026-09-07 against the live API:
the top-level keys are `location`, `server_type`, `public_net`, `image`, `protection`, `labels` and
the rest, with no `datacenter` key at all. A great deal of older Hetzner example code reads
`s['datacenter']['location']['name']`, which now raises `KeyError: 'datacenter'` and, inside a
teardown script, does so **after** the delete may already have been issued. Read `s['location']`.

**`protection.delete: true` makes the delete a silent no-op** from the caller's point of view: the
API returns an error rather than deleting, and a script that ignores the response reports success.
Clear it first, deliberately:

```bash
curl -s -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "https://api.hetzner.cloud/v1/servers/$SERVER_ID/actions/change_protection" \
  -d '{"delete": false, "rebuild": false}' -o /dev/null -w 'protection cleared (HTTP %{http_code})\n'
```

Read the name back to the user and get a yes. If the name is not the one they expect, stop. There
is no undelete: the disk is wiped and the IPv4 returns to the pool immediately.

```bash
curl -s -X DELETE -H "Authorization: Bearer $TOKEN" \
  "https://api.hetzner.cloud/v1/servers/$SERVER_ID" \
  -o /dev/null -w 'server deleted (HTTP %{http_code})\n'

curl -s -X DELETE -H "Authorization: Bearer $TOKEN" \
  "https://api.hetzner.cloud/v1/firewalls/$FIREWALL_ID" \
  -o /dev/null -w 'firewall deleted (HTTP %{http_code})\n'
```

A `409` on the firewall means it is still attached to something. Delete the server first, give it
a few seconds, and retry.

---

## Sweep for the things that outlive the server

Run this after every teardown. Each of these has produced a small recurring charge on an account
its owner believed was empty.

```bash
echo "--- snapshots (billed per GB/month, survive deletion) ---"
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.hetzner.cloud/v1/images?type=snapshot&per_page=50" \
| python3 -c "
import sys, json
imgs = json.load(sys.stdin)['images']
if not imgs: print('  none')
for i in imgs:
    print(f\"  id={i['id']}  {i['image_size'] or 0:.1f}GB  '{i['description']}'  created {i['created'][:10]}\")
"

echo "--- volumes (billed per GB/month, survive deletion) ---"
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.hetzner.cloud/v1/volumes?per_page=50" \
| python3 -c "
import sys, json
vols = json.load(sys.stdin)['volumes']
if not vols: print('  none')
for v in vols:
    print(f\"  id={v['id']}  {v['size']}GB  '{v['name']}'  attached to {v.get('server')}\")
"

echo "--- unassigned primary IPs (0.60/month each) ---"
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.hetzner.cloud/v1/primary_ips?per_page=50" \
| python3 -c "
import sys, json
ips = [p for p in json.load(sys.stdin)['primary_ips'] if not p.get('assignee_id')]
if not ips: print('  none unassigned')
for p in ips:
    print(f\"  id={p['id']}  {p['ip']}  auto_delete={p['auto_delete']}\")
"

echo "--- floating IPs (3.50/month each) ---"
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.hetzner.cloud/v1/floating_ips?per_page=50" \
| python3 -c "
import sys, json
ips = json.load(sys.stdin)['floating_ips']
if not ips: print('  none')
for p in ips:
    print(f\"  id={p['id']}  {p['ip']}  server={p.get('server')}\")
"
```

Delete anything the user confirms is unwanted, again by ID:

```bash
curl -s -X DELETE -H "Authorization: Bearer $TOKEN" "https://api.hetzner.cloud/v1/images/<id>"
curl -s -X DELETE -H "Authorization: Bearer $TOKEN" "https://api.hetzner.cloud/v1/volumes/<id>"
curl -s -X DELETE -H "Authorization: Bearer $TOKEN" "https://api.hetzner.cloud/v1/primary_ips/<id>"
curl -s -X DELETE -H "Authorization: Bearer $TOKEN" "https://api.hetzner.cloud/v1/floating_ips/<id>"
```

> ⚠️ **The sweep is project-wide, and most projects are shared.** Run against a real account on
> 2026-09-07 it returned 3 volumes and 2 floating IPs, every one of them belonging to unrelated
> production work. The sweep tells you what is billing in the project. It does **not** tell you what
> this skill created. Read the list to the user, name the owner of anything you recognise, and
> delete only what they confirm.
>
> The one query that is genuinely scoped to this skill's own work is the label selector at the
> bottom of this file.

**Do not delete a volume without asking.** It holds data, and unlike the server it may be the only
copy. A snapshot is usually safe to remove once its server is gone, but say what it was before
removing it.

**Delete returns 200 for a server and 204 for a firewall.** Both are success. A check written as
`[ "$code" = "200" ]` reports a perfectly good firewall deletion as a failure and sends someone
looking for a problem that is not there.

### A primary IP with `auto_delete: false` outlives its server

A Primary IP created implicitly with the server is removed with it. One created explicitly, or one
whose `auto_delete` was set to `false` so the address could be kept across a rebuild, is not. It
sits unassigned at 0.60 a month indefinitely. The sweep above is the only thing that catches it.

---

## Local cleanup

Neither of these costs anything, and both cause confusion later.

```bash
ssh-keygen -R "$SERVER_IP"     # the host key, or the next server on that IP fails a scary check
```

That warning matters. Hetzner recycles IPv4 addresses quickly, so a new server can land on an
address you have seen before, and SSH then reports
`REMOTE HOST IDENTIFICATION HAS CHANGED` with a warning about man-in-the-middle. It is nearly
always address recycling and not an attack, but the only way to be sure is to have cleaned up.

Remove the `Host` block from `~/.ssh/config` too, if one was added in Phase 6.

The SSH key registered in Hetzner is free and probably shared with other servers. Leave it.

---

## Verify the project is actually empty

Do not report a teardown as complete without reading the state back:

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.hetzner.cloud/v1/servers?label_selector=managed-by%3Dhetzner-vps-skill" \
| python3 -c "
import sys, json
d = json.load(sys.stdin)
print('servers still labelled managed-by=hetzner-vps-skill:', len(d['servers']))
for s in d['servers']: print(' ', s['id'], s['name'])
"
```

The `labels` set at creation earn their keep here: the query is scoped to servers this skill made,
so it cannot accidentally report on, or invite the deletion of, anything else in the project.
