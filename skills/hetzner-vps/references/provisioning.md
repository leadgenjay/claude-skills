# Provisioning the server

Base URL `https://api.hetzner.cloud/v1`, header `Authorization: Bearer $TOKEN`.

Order matters and is not negotiable: **key, then firewall, then server.** The server call carries
the firewall, so the box is protected from its first boot rather than from a minute later.

Set the token once for everything below:

```bash
TOKEN="${HCLOUD_TOKEN:-$(tr -d '\n\r" ' < "$HOME/.config/hcloud/token" 2>/dev/null)}"
[ -n "$TOKEN" ] || { echo "no Hetzner token" >&2; exit 1; }

NAME=my-vps          # lowercase, digits and hyphens; it becomes the hostname
TYPE=cx23            # cheapest sane EU box. Reports `available:false` and builds anyway.
LOCATION=nbg1
IMAGE=ubuntu-24.04
SSH_USER=deploy      # the non-root user cloud-init will create
PUBKEY_FILE="$HOME/.ssh/id_ed25519.pub"
```

`NAME` becomes the server's hostname and must be a valid DNS label: lowercase letters, digits and
hyphens only. An underscore or a capital is rejected with `invalid_input`, which reads as a
generic failure and sends you looking at the wrong field.

---

## 1. Register the SSH key, or reuse it

Hetzner rejects a duplicate public key with `409 uniqueness_error`, so check first. Match on the
**key body**, not the comment: the comment is whatever was typed at `ssh-keygen` time and differs
between machines holding the same key.

```bash
PUBKEY="$(cat "$PUBKEY_FILE")"

SSH_KEY_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.hetzner.cloud/v1/ssh_keys?per_page=50" \
| python3 -c "
import sys, json
want = ' '.join(open('$PUBKEY_FILE').read().split()[:2])   # type + body, comment dropped
for k in json.load(sys.stdin)['ssh_keys']:
    if ' '.join(k['public_key'].split()[:2]) == want:
        print(k['id']); break
")

if [ -z "$SSH_KEY_ID" ]; then
  SSH_KEY_ID=$(python3 -c "
import json, os, urllib.request
pub = open('$PUBKEY_FILE').read().strip()
body = json.dumps({'name': '$NAME-key', 'public_key': pub}).encode()
req = urllib.request.Request('https://api.hetzner.cloud/v1/ssh_keys', data=body,
        headers={'Authorization': 'Bearer $TOKEN', 'Content-Type': 'application/json'})
print(json.load(urllib.request.urlopen(req))['ssh_key']['id'])
")
fi
echo "ssh key id: $SSH_KEY_ID"
```

If the user has no keypair, generate one before this step and tell them it is being created:

```bash
[ -f "$PUBKEY_FILE" ] || ssh-keygen -t ed25519 -f "${PUBKEY_FILE%.pub}" -N '' -C "hetzner-$NAME"
```

`-N ''` means no passphrase. That is right for a key an agent will use unattended, and worth
naming out loud, because a passphrase-less private key on a laptop is a real if modest risk. If
the user wants a passphrase, they should generate the key themselves and add it to `ssh-agent`.

## 2. Create the firewall, before the server exists

A Hetzner server gets a public IPv4 with **no filtering at all** by default. The firewall has to
exist before the server so it can be attached in the creation call.

Inbound SSH only. Outbound is unrestricted when no outbound rules are given, which is what package
installs and Docker pulls need.

```bash
MY_IP="$(curl -s https://api.ipify.org)/32"     # or 0.0.0.0/0, see below

FIREWALL_ID=$(python3 - <<PY
import json, urllib.request
rules = [{"direction": "in", "protocol": "tcp", "port": "22",
          "source_ips": ["$MY_IP"], "description": "ssh"}]
body = json.dumps({"name": "$NAME-fw", "rules": rules}).encode()
req = urllib.request.Request("https://api.hetzner.cloud/v1/firewalls", data=body,
        headers={"Authorization": "Bearer $TOKEN", "Content-Type": "application/json"})
print(json.load(urllib.request.urlopen(req))["firewall"]["id"])
PY
)
echo "firewall id: $FIREWALL_ID"
```

Shape details that produce `invalid_input` when wrong:

- `port` is a **string**, `"22"`, not the integer `22`. A range is `"8000-8080"`.
- `source_ips` entries must be CIDR. A bare `1.2.3.4` is rejected; use `1.2.3.4/32`.
- IPv6 sources go in the same `source_ips` array as `::/0` style CIDRs.
- Omitting outbound rules entirely allows all egress. Adding even one outbound rule switches to
  deny-by-default for outbound, which will break `apt` and Docker pulls in a way that looks like a
  broken mirror. Do not add outbound rules unless restricting egress is the actual goal.

**Locking SSH to the current IP is safer and will eventually lock the user out.** Home addresses
change. Say so at the time, and say where the fix is (console, Firewalls, edit the rule), because
the moment they need it is the moment they cannot reach the box. If the user travels, uses mobile
tethering, or has a dynamic address, `0.0.0.0/0` with key-only SSH is a defensible choice. Make it
a decision rather than a default.

## 3. Create the server, with the firewall attached in the same call

Cloud-init does the hardening. Keep `user_data` well under the **32 KiB** limit; past it the field
is truncated silently and the box boots half-configured.

```bash
SERVER_JSON=$(python3 - <<PY
import json, urllib.request, urllib.error

pub = open("$PUBKEY_FILE").read().strip()

cloud_init = """#cloud-config
package_update: true
package_upgrade: true

users:
  - name: $SSH_USER
    groups: [sudo]
    shell: /bin/bash
    sudo: ["ALL=(ALL) NOPASSWD:ALL"]
    ssh_authorized_keys:
      - SSH_PUBKEY_PLACEHOLDER

ssh_pwauth: false
disable_root: true

package_reboot_if_required: false
packages:
  - fail2ban
  - unattended-upgrades
  - ca-certificates
  - curl

write_files:
  - path: /etc/sysctl.d/99-hardening.conf
    content: |
      vm.swappiness=10
      net.ipv4.conf.all.rp_filter=1
      net.ipv4.conf.all.accept_redirects=0
      net.ipv4.conf.all.accept_source_route=0
  - path: /etc/apt/apt.conf.d/20auto-upgrades
    content: |
      APT::Periodic::Update-Package-Lists "1";
      APT::Periodic::Unattended-Upgrade "1";
  - path: /etc/ssh/sshd_config.d/99-hardening.conf
    content: |
      PermitRootLogin no
      PasswordAuthentication no
      KbdInteractiveAuthentication no
      X11Forwarding no
      MaxAuthTries 3

runcmd:
  - [ sh, -c, "curl -fsSL https://get.docker.com | sh" ]
  - [ usermod, -aG, docker, $SSH_USER ]
  - [ sh, -c, "fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile" ]
  - [ sh, -c, "grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab" ]
  - [ sysctl, --system ]
  - [ systemctl, enable, --now, fail2ban ]
  - [ systemctl, enable, --now, unattended-upgrades ]
  - [ sh, -c, "mkdir -p /run/sshd && sshd -t && ( systemctl reload ssh 2>/dev/null || systemctl restart ssh 2>/dev/null || true )" ]
""".replace("SSH_PUBKEY_PLACEHOLDER", pub)

body = json.dumps({
    "name": "$NAME",
    "server_type": "$TYPE",
    "image": "$IMAGE",
    "location": "$LOCATION",
    "ssh_keys": [$SSH_KEY_ID],
    "firewalls": [{"firewall": $FIREWALL_ID}],
    "user_data": cloud_init,
    "public_net": {"enable_ipv4": True, "enable_ipv6": True},
    "labels": {"managed-by": "hetzner-vps-skill"},
    "start_after_create": True,
}).encode()

req = urllib.request.Request("https://api.hetzner.cloud/v1/servers", data=body,
        headers={"Authorization": "Bearer $TOKEN", "Content-Type": "application/json"})
try:
    print(json.dumps(json.load(urllib.request.urlopen(req))))
except urllib.error.HTTPError as e:
    # urlopen raises on 4xx and DISCARDS the body, which is where Hetzner puts the
    # only useful part. Without this you get a bare "HTTP Error 422" and no reason.
    print(json.dumps({"__error": json.loads(e.read().decode())}))
PY
)

SERVER_ID=$(echo "$SERVER_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['server']['id'])")
SERVER_IP=$(echo "$SERVER_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['server']['public_net']['ipv4']['ip'])")
echo "server $SERVER_ID at $SERVER_IP"
```

**Write these three down now**, in the conversation, where the user can see them:

```
server id   : $SERVER_ID
firewall id : $FIREWALL_ID
ipv4        : $SERVER_IP
```

Teardown needs all three. A teardown that has to go looking for them is a teardown that finds
something else.

### Do not build the cloud-init with an f-string

The block above is a **plain** string with a `.replace()`, not an f-string, and that is deliberate.

`user_data` is YAML full of shell, and shell uses braces: `${VAR}`, `${VAR:-default}`, and command
grouping like `cmd && { a || b; }`. Inside an f-string every one of those is parsed as a Python
expression. Adding a perfectly ordinary grouped command produced:

```
SyntaxError: f-string: invalid syntax
```

at the brace, before anything reached Hetzner. Doubling the braces to escape them works and makes
the YAML unreadable, and the next person to paste a shell snippet in hits it again.

A placeholder plus `.replace()` costs one line and makes the block safe to edit. Shell-level
variables such as `$SSH_USER` still interpolate normally, because the surrounding heredoc is
unquoted and the shell substitutes them before Python ever sees the text.

Note the same runcmd uses `( ... )` rather than `{ ...; }`. A subshell is equivalent here and
survives being pasted into a context that does treat braces specially.

### The fields that matter

- **`firewalls: [{"firewall": <id>}]`** is a list of objects, not a list of IDs. A bare
  `[12345]` is rejected. This is the single most important field in the call: passing it here is
  what removes the exposure window. Attaching afterwards is a separate `POST` that lands one round
  trip later, and a public IPv4 running `apt` with no filtering is found by scanners in well under
  a minute.
- **`ssh_keys`** takes IDs. Names also work but collide across projects; IDs do not.
- **`labels`** cost nothing and make the box identifiable later. `managed-by` is enough.
- **`start_after_create: true`** is the default and is what you want here. The one case for
  `false` is creating from a snapshot of another running machine, where booting a clone would put
  two servers on one identity. Not applicable to a fresh image.
- **`public_net.enable_ipv4: false`** saves 0.60 a month and makes the box unreachable from most
  home and corporate networks. Only with the user's informed agreement.

## 4. Wait for three separate things

These are three different events and they are minutes apart. Treating any of them as the finish
line is the most common cause of "it says it worked but nothing is installed".

```bash
# a) the hypervisor has started it
for i in $(seq 1 60); do
  ST=$(curl -s -H "Authorization: Bearer $TOKEN" \
       "https://api.hetzner.cloud/v1/servers/$SERVER_ID" \
     | python3 -c "import sys,json; print(json.load(sys.stdin)['server']['status'])")
  [ "$ST" = "running" ] && break
  sleep 5
done
echo "hypervisor: $ST"

# b) sshd is answering
for i in $(seq 1 60); do
  ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=5 -o BatchMode=yes \
      "$SSH_USER@$SERVER_IP" true 2>/dev/null && break
  sleep 5
done

# c) cloud-init has actually finished. This is the one that matters.
ssh -o BatchMode=yes "$SSH_USER@$SERVER_IP" 'sudo cloud-init status --wait; docker --version'
```

`status: running` means the hypervisor powered it on, roughly 10 seconds in. Package installs and
the Docker script take another 60 to 180 seconds after that, and `apt` upgrades on a fresh image
can push it longer. `cloud-init status --wait` blocks until provisioning genuinely completes and
is the only reliable signal. Skipping it is why `docker: command not found` appears on a box that
is completely fine thirty seconds later.

`cloud-init status --wait` needs no `sudo` on Ubuntu 24.04. Verified 2026-09-07 on a live box:
both forms return `status: done` and exit 0. It prints a row of dots while it waits, which is
normal progress output and not an error. Use whichever form you like; `sudo` buys nothing here.

### `mkdir -p /run/sshd` before `sshd -t`, and why the last runcmd looks over-built

`sshd -t` validates the config, and it needs the privilege separation directory to exist. During
cloud-init nothing has created it yet, because `/run/sshd` is a `RuntimeDirectory` of
`ssh.service` and on Ubuntu 24.04 sshd is socket-activated, so the service has not started.

The plain form fails. Verified 2026-09-07 on a live box, reproduced by removing the directory:

```
$ sh -c 'sshd -t && systemctl reload ssh'
Missing privilege separation directory: /run/sshd
exit=255
```

`&&` short-circuits, `runcmd` returns non-zero, and cloud-init finishes with
`status: error` and `RuntimeError('Runparts: 1 failures (runcmd) in 1 attempted commands')`.
**Everything else on the box is correctly configured** (Docker, swap, fail2ban, the drop-in, and
`sshd -T` already reporting `permitrootlogin no`), so this is a red herring that sends you hunting a
provisioning failure that did not happen. It is also indistinguishable, from `cloud-init status`
alone, from a failure that genuinely mattered.

Hence the shape of that line:

- `mkdir -p /run/sshd` creates what `sshd -t` needs, and is harmless when it already exists.
- `sshd -t` still **fails the whole runcmd on a bad config**, which is the point. Verified: a
  deliberately broken drop-in still exits 255 through the full expression. Do not "simplify" this
  into something that always succeeds, or the guard stops guarding.
- `reload || restart || true` tolerates the service being inactive under socket activation without
  masking a config error, because a config error has already stopped the chain before this runs.

### When creation fails with `unsupported location for server type`

Two different refusals wear similar words and mean opposite things. Read the `code`, not the prose:

| `code` | message | Means | Do |
|---|---|---|---|
| `resource_unavailable` | `error during placement` | Transient stock shortage | Try another EU location, or retry later |
| `invalid_input` | `unsupported location for server type` | Not offered to this account at all | Move to another family |

Verified 2026-09-07 in one sitting at `nbg1`: `cx23` and `cx33` both **created**, `cx43` returned
`resource_unavailable`, and every ARM `cax` type returned `invalid_input` in every EU location with
both the image name and an explicit ARM image ID.

⚠️ **`cx23` and `cx33` both report `available: false` and build regardless**, so a create failure is
the signal, not the availability field. See `sizing-and-pricing.md`.

**So treat the type as a hypothesis and let creation be the test.** Catch the 422, and fall back
to the next candidate in the sorted list rather than failing the whole run:

```python
for candidate in ordered_candidates:          # cheapest first, from sizing-and-pricing.md
    result = create_server(server_type=candidate)
    if "__error" not in result:
        break
    msg = result["__error"]["error"]["message"]
    if "unsupported location for server type" in msg or "resource_unavailable" in msg:
        print(f"{candidate} is not orderable here, trying the next one")
        continue
    raise SystemExit(f"unexpected: {msg}")     # a real error, do not paper over it
```

**Re-quote the price if the fallback changes the type**, and tell the user the number moved. The
whole point of Phase 4 is that they agreed to a figure, and silently landing them on a more
expensive box because the cheap one was unavailable breaks that agreement.

### If SSH never answers

In order of likelihood:

1. **The firewall is locked to a different IP than the one you are connecting from.** Check what
   the API thinks the rule says, then check the current address:
   `curl -s https://api.ipify.org`. A VPN toggling between the two calls does this.
2. **Wrong username.** The image's default is `root`; the non-root user only exists once
   cloud-init has run. Early in the boot, `root` works and `$SSH_USER` does not.
3. **cloud-init failed before creating the user.** Get the console output from the API rather than
   guessing: `POST /servers/$SERVER_ID/actions/request_console` returns a WSS URL, or read
   `/servers/$SERVER_ID/actions` for a failed action.
4. **The key registered is not the key being offered.** `ssh -v` shows which key it tried.
