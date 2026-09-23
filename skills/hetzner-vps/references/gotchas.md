# Gotchas

Every entry was hit for real, not reasoned about. Dated ones were verified against the live API on
2026-09-07 while building this skill.

---

## Money

**A stopped server still bills.** Hetzner charges for the reserved resources of a powered-off
server. "I'll shut it down over the weekend" saves nothing at all. Only deletion stops the meter,
and this is the single most common misunderstanding about the platform. Say it before the user
discovers it on an invoice.

**Snapshots and volumes outlive the server that made them,** and keep billing at 0.0199 and
0.0767 per GB per month. Deleting a server does not touch either. `teardown.md` has the sweep.

**Prices are per location, and the same box can differ by 3.4x.** `server_types[].prices` is an
array with one entry per location, ordered by location name, so `prices[0]` is frequently `ash`.
`cpx11` reads 20.49 there and 5.99 in Falkenstein. Any quote built from index zero is wrong, and
wrong in the direction that loses the sale.

**The currency belongs to the account.** `/v1/pricing` returns `currency`, which was `USD` on the
account this was built against and is `EUR` on others. `vat_rate` likewise. Print what you read.

**The primary IPv4 is billed separately** at 0.60 a month and is not in the server type's price.
Small, and it is the gap between the quote and the first invoice.

**Singapore egress is 8.30 per TB, against 1.20 everywhere else,** on 0.5 TB included against
Europe's 20 TB. A busy box in `sin` can bill more for traffic than for itself.

---

## `available` is wrong in both directions, so never filter on it

Verified 2026-09-07 at `nbg1` by create-testing each candidate:

| Type | `available` | Creation | Reality |
|---|---|---|---|
| `cx23` 2c/4GB, 6.49 | **NO** | **CREATED** | cheapest sane box on the platform |
| `cx33` 4c/8GB, 9.99 | **NO** | **CREATED** | fine |
| `cax11` / `cax21` (ARM) | **yes** | REFUSED | `invalid_input: unsupported location for server type` |
| `cx43` 8c/16GB, 18.49 | NO | REFUSED | `resource_unavailable: error during placement` |

Filtering on `available` therefore hides the two cheapest boxes and offers two that cannot be built.
**Filter on `supported`; show `available` as a stock column.** This is what
`docs/infra/hetzner-provisioning.md` in lgj-os has said since 2026-08-10, and it is right.

**The two refusal messages mean opposite things, and only one is permanent:**

- `resource_unavailable` / `error during placement` = **transient stock**. Try another EU location
  or wait. `cx43` hit this while `cx23` and `cx33` built in the same minute.
- `invalid_input` / `unsupported location for server type` = **genuinely not offered** to this
  account. Every ARM `cax` type returned this in every EU location, with both the image name and an
  explicit ARM image ID. Move to another family.

Reading the second message literally sends you round all three EU sites before you doubt the type,
because it blames the location and the location is not the problem.

**Hetzner renames the lines.** `cx11`/`cx21`/`cx31`, then `cx22`/`cx32`/`cx42`, now
`cx23`/`cx33`/`cx43`. Any hardcoded type name more than a few months old is probably gone. Read
`supported` at run time and never ship a remembered default.

---

## The API response shape

**The server object has `location`, not `datacenter`.** Top-level keys are `location`,
`server_type`, `public_net`, `image`, `protection`, `labels` and the rest. A lot of older example
code reads `s['datacenter']['location']['name']` and now raises `KeyError: 'datacenter'`. Inside a
teardown script that can fire after the delete has been issued.

**`urlopen` raises on 4xx and throws the body away.** The body is where Hetzner puts the only
useful part. Without a `try/except urllib.error.HTTPError` that prints `e.read()`, a 422 arrives as
a bare `HTTP Error 422: Unprocessable Entity` and there is nothing to debug against. Every write
call in this skill catches it.

**`firewalls` takes a list of objects, not IDs.** `[{"firewall": 123}]`, never `[123]`.

**`port` is a string.** `"22"`, not `22`. A range is `"8000-8080"`.

**`source_ips` must be CIDR.** A bare `1.2.3.4` is rejected. Use `1.2.3.4/32`.

**Adding any outbound firewall rule switches outbound to deny-by-default,** which breaks `apt` and
Docker pulls in a way that looks like a broken mirror. Omit outbound rules unless restricting
egress is the actual goal.

**A duplicate SSH key returns `409 uniqueness_error`.** Match on the key **body**, not the whole
string: the trailing comment differs between machines holding the same key.

**`protection.delete: true` refuses the delete,** and a script that ignores the response reports a
teardown that never happened.

---

## Boot and timing

**Three separate events, minutes apart.** `status: running` is the hypervisor, about 6 seconds in
on the measured run. sshd answered at 28 seconds. Package installs and the Docker script continue
well past that. Only `cloud-init status --wait` means provisioning is finished, and it is the one
to gate on. Treating `running` as done is why `docker: command not found` appears on a box that is
completely healthy a minute later.

**`cloud-init status --wait` does not need `sudo`** on Ubuntu 24.04. Both forms return
`status: done` and exit 0, verified on a live box. It prints a long row of dots while waiting,
which is progress output rather than an error.

**`user_data` is capped at 32 KiB and truncates silently.** The box boots half-configured and
nothing reports a problem.

**Attaching the firewall after creation leaves a real exposure window.** The `POST` lands a round
trip after the server is already up with a public IPv4 running `apt` as root. Pass
`firewalls: [{"firewall": id}]` in the creation call instead, and there is no window at all.

---

## SSH

**Locking the firewall to your current IP will eventually lock the user out,** when their home
address changes. It is the safer default and it needs saying at the time, along with where the fix
is, because the moment they need to know is the moment they cannot reach the box.

**`disable_root: true` does not set `PermitRootLogin no`.** It leaves sshd at `without-password`
and plants a forced command in `/root/.ssh/authorized_keys`. Root is blocked, but `sshd -T` reports
that it is permitted, so every scanner and every colleague reading the config concludes otherwise.

**With a custom `users:` list, that forced command prints a nonsense message:**
`Please login as the user "NONE" rather than the user "root".` Cloud-init has no distro default
user to name. It reads like a broken setup rather than a deliberate refusal. The explicit
`PermitRootLogin no` drop-in replaces it with a plain `Permission denied (publickey)`.

**`sshd -t` fails during cloud-init with `Missing privilege separation directory: /run/sshd`.**
That directory is a `RuntimeDirectory` of `ssh.service`, and Ubuntu 24.04 socket-activates sshd, so
at runcmd time the service has never started and the directory does not exist. `sshd -t` exits 255,
an `&&` chain short-circuits, and cloud-init reports `status: error` on a box where every single
thing actually configured correctly. Prefix with `mkdir -p /run/sshd`.

**The systemd unit is `ssh` on Debian and Ubuntu**, not `sshd`. `systemctl reload sshd` fails there,
and `reload` on a socket-activated service that has not started yet fails too.

**The docker group applies at login.** A session opened while cloud-init is still running predates
`usermod -aG docker` and gets permission denied on the socket. Log out and back in. Never
`chmod 666 /var/run/docker.sock`, which hands every local user root-equivalent access.

**Hetzner recycles IPv4 addresses quickly,** so after a teardown run `ssh-keygen -R <ip>`. Skip it
and the next server on that address triggers
`REMOTE HOST IDENTIFICATION HAS CHANGED`, which looks alarming and is almost always recycling.

---

## Account

**Billing failures look like nothing until the last step.** A new account with no payment method
reads the entire API successfully and fails only at server creation, with `forbidden`. Every
prerequisite check passes first.

**A read-only token passes every check in Step 0** and fails at creation too. Prove write access
with the create-then-delete probe in `account-and-api-key.md` before quoting a price.

**A token file written by an editor carries a trailing newline,** and one pasted from the console
is sometimes wrapped in quotes. Either produces `401 unauthorized` against a token that is
completely correct. Strip with `tr -d '\n\r" '`.

**A token belongs to one project and cannot see another.** If servers are missing, the token is
probably scoped to a different project, not broken.

**New accounts carry a low server limit** until Hetzner has some history. Creating past it returns
a quota error and the fix is a support ticket. Never affects a single VPS.

**There is a separate Primary IP quota, and a deleted server's IPs are not freed instantly.**
Creating past it fails with `resource_limit_exceeded: Primary IP limit exceeded`, which reads like a
billing or account problem and is neither. A dual-stack server holds two primary IPs (v4 and v6), so
a project with 18 servers already holds 36. Verified 2026-09-07: a create-delete-create loop on such
a project succeeded on the first server and was refused on the next two seconds later, then the
count settled back with **zero** unassigned IPs, so nothing had leaked. If you hit this, check
`/v1/primary_ips` for genuinely unassigned addresses before assuming a leak; if there are none, wait
a few seconds and retry rather than deleting anything.

---

## Operating in a project that holds other people's servers

**Delete by pinned ID, never by name pattern.** A `grep`-shaped teardown in a shared project is how
an unrelated production box dies. Record the IDs at creation and use them.

**Label everything you create.** `labels: {"managed-by": "hetzner-vps-skill"}` costs nothing and
makes `?label_selector=managed-by%3Dhetzner-vps-skill` a query that cannot return anything this
skill did not make. Use it for the teardown verification rather than listing every server.
