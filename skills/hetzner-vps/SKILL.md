---
name: hetzner-vps
description: Stand up your own Hetzner Cloud VPS from scratch, guided end to end. Walks you through the account and billing setup, creating a Read-and-Write API token, interviewing you about what the box is for, quoting the real live price for your chosen region before anything bills, provisioning behind a firewall from first boot, hardening it, and handing you a working SSH login. Ends with a teardown that actually stops the billing. Use when the user wants a VPS, a cloud server, a Hetzner box, a server to run Docker or n8n or a scraper on, or says "spin up a server", "deploy a VPS", "I need a Linux box in the cloud".
---

# A Hetzner Cloud VPS, from no account to a working SSH login

This skill takes someone who may have never used Hetzner and leaves them with a hardened Linux
box they can `ssh` into, at a price they agreed to before a cent was spent.

**Read `references/gotchas.md` before Phase 1.** Most of the ways this goes wrong are silent:
a price quoted from the wrong region, a server that bills while powered off, a firewall attached
one round trip too late. Ten minutes in that file saves an hour and some money.

---

## Step 0 — Prerequisites

Verify every row before any other operation. If a row fails, **STOP** and tell the user exactly
which one and where to get it. Do not proceed on partial credentials, and do not write bash that
assumes a missing token exists.

| Requirement | Check | Where to get it |
|---|---|---|
| Hetzner Cloud account with billing added | `curl -s -H "Authorization: Bearer $HCLOUD_TOKEN" https://api.hetzner.cloud/v1/servers` returns JSON with a `servers` key | Phase 1 walks the signup. Billing must be added or server creation fails with `forbidden`. |
| A project inside that account | A token only ever belongs to one project | Console, top level, "New project" |
| `HCLOUD_TOKEN` (Read **and** Write) | `curl -s -H "Authorization: Bearer $HCLOUD_TOKEN" https://api.hetzner.cloud/v1/ssh_keys` returns `ssh_keys`, not `unauthorized` | Phase 2. Console, project, Security, API tokens, Generate. **Shown once.** |
| An SSH keypair on this machine | `ls ~/.ssh/id_ed25519.pub` | `ssh-keygen -t ed25519 -C "hetzner-vps"` if absent |
| `curl`, `ssh`, `python3` | `command -v curl ssh python3` | Preinstalled on macOS and most Linux |

`python3` is used to read JSON. `jq` is nicer if present (`command -v jq`), but do not require it:
plenty of machines lack it, and every example here works without it.

**Never echo a token value back to the user, and never write one into a file in a git repo.**
Read it from the environment. If the user pastes a token into the chat, use it, then tell them to
rotate it in the console afterwards, because chat logs persist.

---

## What this skill does, and where it stops

**It delivers:** a running server, protected by a firewall from first boot, with a non-root sudo
user, key-only SSH, automatic security updates, a swap file, Docker installed, and a verified
`ssh user@ip` login. Plus a teardown that genuinely stops the billing.

**It does not install an application.** That is the next skill's job, and keeping the boundary
there is deliberate. Once the box is up, hand off:

| The user wants | Chain to |
|---|---|
| n8n, self-hosted, with HTTPS | the `n8n-self-hosting` skill, which takes an SSH target and does the rest |
| A private uncensored LLM | the `abliterated-llm-vps` skill |
| Anything else | Docker is already installed and the user has sudo. Build from there. |

---

## Phase 1: Account and billing

Read `references/account-and-api-key.md`, section "Account and billing".

Most first-time failures are billing, not code. A brand new account with no payment method
returns `403 forbidden` on server creation while every read call succeeds, so the token looks
perfectly valid right up to the moment it matters. Confirm billing is on file before Phase 5.

New accounts are also sometimes capped at a low server limit until identity is verified. Read
the limit before promising a fleet:

```bash
curl -s -H "Authorization: Bearer $HCLOUD_TOKEN" \
  "https://api.hetzner.cloud/v1/servers?per_page=1" \
| python3 -c "import sys,json; d=json.load(sys.stdin); print('existing servers:', d['meta']['pagination']['total_entries'])"
```

## Phase 2: Create the API token

Read `references/account-and-api-key.md`, section "The API token".

The one thing to get right: the token needs **Read & Write**, not Read. A read-only token passes
every check in Step 0 and then fails at server creation. Verify write access explicitly before
quoting a price, using the harmless round trip in that file.

## Phase 3: Interview the user

Read `references/sizing-and-pricing.md`. Ask these, in this order, and do not guess an answer:

1. **What will run on it?** This sets RAM, which is the binding constraint far more often than CPU.
2. **Where are the users, or what does it talk to?** Region is a pricing decision here, not just a
   latency one. See Phase 4.
3. **Monthly budget?** Quote against it rather than assuming cheapest is wanted.
4. **Does anything need x86?** ARM is dramatically cheaper on this provider, and it breaks
   x86-only Docker images. Ask before recommending it.
5. **How much outbound traffic?** Cheap in Europe, expensive in Singapore, and the difference is
   nearly seven-fold per terabyte.

Do not offer a default until the answers are in, and **derive it from the live `supported` list,
never from `available` and never from memory.** `available` is a stock reading that is wrong in both
directions: it hides `cx23` and `cx33`, the two cheapest boxes, and offers ARM types that cannot be
built. Type names also churn (`cx11`/`cx21`, then `cx22`/`cx32`, now `cx23`/`cx33`), so a remembered
default goes stale. `references/sizing-and-pricing.md` has the query.

## Phase 4: Quote the real price, and get a yes

**Blocking. Never create a server before the user has agreed to a number.**

Read `references/sizing-and-pricing.md`, section "Quoting a price correctly". The three ways this
goes wrong, all of which have produced a wrong quote:

- `prices` is an array with **one entry per location**, and the same box can differ by more than
  3x between them. Never read `prices[0]`. Filter to the chosen location.
- **Shortlist on `supported`, not `available`.** Filtering on stock hides the cheapest boxes; see
  `references/sizing-and-pricing.md`. In the EU that is the difference between quoting 7.09 and 38.
- **The currency is per account.** `/v1/pricing` returns `currency`, and it is `USD` on some
  accounts and `EUR` on others. Read it. Do not print a symbol you did not read.
- **The primary IPv4 is billed separately** from the server and is not in the server price.

Present a single total that includes the server, the IPv4, and any backups, in the account's own
currency, at the chosen location. Then ask for confirmation. The reference has the query that
assembles it.

## Phase 5: Provision

Read `references/provisioning.md` and follow it in order. The order is the point:

1. Register the SSH public key, or reuse the existing one by fingerprint.
2. **Create the firewall first**, inbound `tcp/22` only.
3. Create the server with `firewalls: [{"firewall": <id>}]` **in the same call**, so it is
   protected from first boot. Attaching a firewall afterwards leaves a window, sometimes over a
   minute, where a public IPv4 sits open while cloud-init runs. Scanners find hosts in that window
   routinely.
4. Pass the cloud-init `user_data` from that file, which creates the non-root user, installs
   Docker, adds swap, and turns on unattended security upgrades.
5. Wait for `status: running`, then wait for sshd, then wait for `cloud-init status --wait`.
   These are three different events and the third is the one that matters.

Record the **server ID**, the **firewall ID**, and the **IPv4**. Phase 7 needs all three, and a
teardown that has to rediscover them is a teardown that deletes the wrong thing.

## Phase 6: Harden and verify the login

Read `references/hardening-and-ssh.md`.

Cloud-init has already done most of it. What remains is verification, and verification means
proving each property, not observing that the box is up:

- `ssh user@ip true` succeeds as the non-root user.
- Root password login is refused.
- The firewall really is attached, read back from the API rather than assumed.
- Docker runs as the non-root user without sudo.
- Unattended upgrades are enabled.

Write the `~/.ssh/config` block from that file so the user can type `ssh myserver` instead of
remembering an IP address. That single step is the difference between a box someone uses and a
box they abandon.

## Phase 7: Hand off, or tear down

If the box is staying, tell the user plainly:

- What it costs per month, the number they agreed to in Phase 4.
- That **a powered-off server still bills.** This surprises nearly everyone. Stopping a server
  reserves its resources and Hetzner charges for them. Only deleting it stops the billing.
- Where the teardown instructions are.

If the box was temporary, run the teardown in `references/teardown.md` now, while the IDs are
still in hand. It deletes the server, the firewall, and any snapshots, which bill separately and
outlive the server that made them.

**Delete by pinned ID, never by name pattern.** A `grep`-shaped teardown in a project that holds
other people's production servers is how an unrelated box dies. The reference is written to make
the ID-pinned form the easy one.
