# Hardening, and proving the login works

Cloud-init has already applied everything in this file. What is left is **verification**, and
verification means asserting each property, not observing that the box is up. A server that boots
and accepts a login can still have password auth on, no firewall attached, and no swap.

Every command below is run from the operator's machine against the new box.

---

## The verification sweep

Run this and read every line. It is the evidence that the phase is done.

```bash
ssh -o BatchMode=yes -o ConnectTimeout=10 "$SSH_USER@$SERVER_IP" 'bash -s' <<'EOS'
echo "user              : $(whoami)"
echo "passwordless sudo : $(sudo -n true 2>/dev/null && echo yes || echo NO)"
echo "docker            : $(docker --version 2>&1 | head -1)"
echo "docker sans sudo  : $(docker ps >/dev/null 2>&1 && echo yes || echo NO)"
echo "swap              : $(free -m | awk '/Swap/{print $2" MB"}')"
echo "swap persisted    : $(grep -c '^/swapfile' /etc/fstab) line(s) in fstab"
echo "fail2ban          : $(systemctl is-active fail2ban)"
echo "unattended-upgr   : $(systemctl is-enabled unattended-upgrades)"
echo "swappiness        : $(cat /proc/sys/vm/swappiness)"
sudo sshd -T | grep -E '^(permitrootlogin|passwordauthentication|maxauthtries|x11forwarding)'
EOS
```

What a correct run looks like, captured from a live `cpx12` on `ubuntu-24.04`, 2026-09-07:

```
user              : deploy
passwordless sudo : yes
docker            : Docker version 29.8.0, build 88096ef
docker sans sudo  : yes
swap              : 2047 MB
swap persisted    : 1 line(s) in fstab
fail2ban          : active
unattended-upgr   : enabled
swappiness        : 10
permitrootlogin no
passwordauthentication no
maxauthtries 3
x11forwarding no
```

Then two negative checks, which matter more than any of the positives:

```bash
# root must be refused outright
ssh -o BatchMode=yes -o ConnectTimeout=10 "root@$SERVER_IP" id
# expected: root@<ip>: Permission denied (publickey).

# the firewall must be attached, read back from the API rather than assumed
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.hetzner.cloud/v1/firewalls/$FIREWALL_ID" \
| python3 -c "
import sys, json
f = json.load(sys.stdin)['firewall']
for r in f['rules']:
    print('rule:', r['direction'], r['protocol'], r.get('port'), r['source_ips'])
print('applied_to:', [(a['type'], a.get('server', {}).get('id')) for a in f['applied_to']])
"
# expected: exactly one inbound tcp/22 rule, and applied_to naming this server id
```

An empty `applied_to` means the firewall exists and is protecting nothing. That is the failure the
create-time attachment is designed to prevent, so if it shows up, something went wrong in Phase 5
and the box has been unfiltered for however long it has been running.

---

## Why `PermitRootLogin no` is set explicitly

Cloud-init's `disable_root: true` does **not** set `PermitRootLogin no`. It leaves sshd at the
image default, `without-password`, and instead writes a forced command into
`/root/.ssh/authorized_keys` that prints a message and exits.

Root is genuinely blocked either way. Two reasons the explicit setting is still worth having:

1. **The stock message is broken here.** With a custom `users:` list and no distro default user,
   the forced command interpolates an empty name and the user sees:
   `Please login as the user "NONE" rather than the user "root".` Verified on a live box. It reads
   like a bug in your setup rather than a deliberate refusal.
2. **`sshd -T` reports `permitrootlogin without-password`,** so any security scan, compliance
   check, or colleague reading the config concludes root login is permitted. The check that would
   reassure them is the one that flags it.

The drop-in in `provisioning.md` fixes both. After it, root gets a flat
`Permission denied (publickey)` and `sshd -T` agrees with reality.

Ubuntu 24.04's `/etc/ssh/sshd_config` carries `Include /etc/ssh/sshd_config.d/*.conf`, so a
drop-in is the supported way to override, and the file is not touched by package upgrades the way
edits to the main config are. The unit to reload is **`ssh`**, not `sshd`, on Debian and Ubuntu.

---

## The Docker group, and the one case where it bites

`usermod -aG docker $SSH_USER` grants Docker access without `sudo`, and group membership is
resolved at login. A session opened **after** cloud-init finishes picks it up, which is the normal
case and is what the sweep above confirms.

It fails in one situation: someone SSHes in while cloud-init is still running, stays connected,
and then tries `docker ps`. That session predates the group change and gets
`permission denied while trying to connect to the Docker daemon socket`. The fix is to log out and
back in, not to `chmod` the socket. Anyone reaching for `chmod 666 /var/run/docker.sock` is about
to hand every local user root-equivalent access.

This is the practical reason to wait for `cloud-init status --wait` before doing anything else.

---

## Give the user a name to type

An IP address is forgotten by tomorrow. Append a host block:

```bash
cat >> ~/.ssh/config <<EOF

Host $NAME
  HostName $SERVER_IP
  User $SSH_USER
  IdentityFile ${PUBKEY_FILE%.pub}
  ServerAliveInterval 60
EOF
chmod 600 ~/.ssh/config
```

Then confirm it end to end, because a config block with a typo fails in a way that looks like the
server is down:

```bash
ssh "$NAME" 'echo connected as $(whoami) to $(hostname)'
```

`ServerAliveInterval 60` stops idle sessions being dropped by NAT timeouts, which otherwise shows
up as a shell that freezes mid-command after a few minutes and is invariably blamed on the server.

---

## What is deliberately not done

Say these out loud rather than leaving the user to assume they are covered:

- **No host-level firewall.** `ufw` is not enabled. The Hetzner cloud firewall sits in front of the
  box and filters before traffic arrives, so a second one is redundant and is a common way to lock
  yourself out. If a service later needs a port, open it in the **cloud** firewall.
- **No automatic reboots.** `unattended-upgrades` installs security patches; the drop-in leaves
  `package_reboot_if_required: false`, so a kernel update waits for a human. Check with
  `ls /var/run/reboot-required`. An unattended reboot of a box running a database is a worse
  outcome than a delayed kernel patch.
- **No backups.** They cost 20% of the server price and are off by default. Offer them explicitly
  if the box will hold state that cannot be rebuilt.
- **No monitoring or alerting.** Nothing will tell the user the disk filled up.
- **fail2ban is running with the distro default jail**, which watches sshd. With password auth off
  it is close to redundant, and it is cheap insurance that costs nothing to leave on.
