# Connect over SSH

Guided setup for a Linux VPS. The same steps work for a Mac host (turn on Remote Login in System Settings, General, Sharing first). Ask before writing anything. Use AskUserQuestion when it is available. Nothing here is hardcoded.

## Interview

Collect every value from the user. Confirm the answers before writing `~/.ssh/config`.

1. **Alias.** A short lowercase `Host` name they will type (`ssh <alias>`). `hermes` is the skill default.
2. **Host or IP.** Hostname, public IP, or private-network name. Prefer a name that survives an IP change.
3. **SSH user.** The account they log in as. Confirm with `whoami` on the server rather than guessing.
4. **Password or existing key.** A password is enough for `ssh-copy-id`. Keys-only (typical cloud image) uses the console fallback below. This skill still mints a **dedicated** key. Do not reuse a general-purpose key.
5. **Does Hermes run as a different user than this login?** If yes, note that unix name. Commands that touch `~/.hermes` must run as the owner (see [Root vs the Hermes user](#root-vs-the-hermes-user)).

## Mint a dedicated key

A dedicated key is revocable on its own. You can cut this connection without breaking every other thing that key opens.

```bash
ssh-keygen -t ed25519 -f ~/.ssh/<alias>_key -C "claude-code-><alias>" -N ""
```

## Install the key

The flags are not optional.

```bash
ssh-copy-id -o PubkeyAuthentication=no \
            -o PreferredAuthentications=password,keyboard-interactive \
            -i ~/.ssh/<alias>_key.pub <user>@<host>
```

**Why the flags.** `ssh-copy-id` bypasses your `Host` alias, so `IdentitiesOnly` does not apply and ssh offers every key in `~/.ssh` first. That exhausts the server's auth-attempt budget and disconnects you after one or two password tries. It looks like a wrong password when the password was fine. Forcing password-only auth for this one command avoids it.

`ssh-copy-id` talks to `<user>@<host>`, not the alias, because the config block is not written yet.

## Cloud-console fallback

Use this when there is no password (keys-only image), `ssh-copy-id` is missing, or password auth is already off. Open the provider's serial or web console, log in, and install the public key by hand.

```bash
cat ~/.ssh/<alias>_key.pub
```

On the server:

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo '<paste the .pub contents>' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Paste into that user's `~/.ssh/authorized_keys`, the account you will SSH as.

## SSH config

Append to `~/.ssh/config`. Create the file `chmod 600` if it does not exist. Do not replace other `Host` blocks.

```
Host <alias>
    HostName <host>
    User <user>
    IdentityFile ~/.ssh/<alias>_key
    IdentitiesOnly yes
    StrictHostKeyChecking accept-new
    ServerAliveInterval 30
```

If the daemon is not on port 22, add `Port <n>`.

`IdentitiesOnly yes` stops ssh offering unrelated keys on every connect. `accept-new` trusts the host key the first time and then pins it. A **changed** host key later is a real warning (the machine's identity changed, or you are not talking to the same host). Stop and tell the user. Never clear `known_hosts` to silence it. `ServerAliveInterval 30` keeps idle sessions from dropping.

## Verify

Always pass `-o BatchMode=yes` so a broken link fails fast instead of hanging on a password prompt.

```bash
ssh -o BatchMode=yes <alias> 'bash -lc "command -v hermes || ls ~/.hermes"'
ssh -o BatchMode=yes <alias> 'docker ps'
```

The first command uses a login shell so PATH matches a real login. A hit on `hermes` or `~/.hermes` is a native install. `docker ps` listing an image matching `hermes-agent` is the docker shape (official image `nousresearch/hermes-agent`). `docker` missing is fine on a native host. `permission denied` is a Step 0 miss (add the SSH user to the `docker` group). Both missing means Hermes is not where these probes look. Ask where it is installed.

Then retry the skill's reachability check:

```bash
ssh -o BatchMode=yes -o ConnectTimeout=10 <alias> true
```

## Root vs the Hermes user

Find who owns the data directory before you write anything.

```bash
ssh -o BatchMode=yes <alias> 'ls -ld ~/.hermes /opt/data 2>/dev/null'
```

If you logged in as `root` (or any account that is not that owner), run Hermes commands as the user that owns `~/.hermes`:

```bash
ssh -o BatchMode=yes <alias> 'sudo -iu <user> bash -lc "command -v hermes || ls ~/.hermes"'
```

Never create files under that home as root. They land root-owned, and the agent cannot write them. Docker is the other way around. The SSH user needs `docker` access. Files inside the container are owned by the process user. Data lives at `/opt/data` on the official image.

## Optional private network

A private network such as Tailscale keeps SSH off the public internet.

## Revoke access

Delete the key line from the server's `authorized_keys`, then delete the local pair.

```bash
ssh -o BatchMode=yes <alias> 'grep -v "claude-code-><alias>" ~/.ssh/authorized_keys > ~/.ssh/authorized_keys.new && chmod 600 ~/.ssh/authorized_keys.new && mv ~/.ssh/authorized_keys.new ~/.ssh/authorized_keys'
rm ~/.ssh/<alias>_key ~/.ssh/<alias>_key.pub
```

The private key never leaves `~/.ssh/` and is never committed to any repo.

## If the alias is not hermes

The skill default target is the SSH alias `hermes`. For any other alias, set this in the environment you launch Claude Code from:

```bash
export HERMES_SSH_HOST=<alias>
```

You can still pass `@<alias>` as the first argument to skip that default for one invocation.
