# Account, billing, and the API token

Everything here is browser work by the user. You cannot do it for them: Hetzner has no API for
signup, billing, or token creation, by design. Your job is to give exact instructions, then verify
the result over the API.

---

## Account and billing

1. **Sign up** at <https://console.hetzner.cloud>. Hetzner Cloud is a separate console from
   Hetzner's dedicated-server "Robot" product. If the user lands somewhere that talks about
   auctions and dedicated hardware, they are in the wrong one.
2. **Verify the email**, then sign in.
3. **Add a payment method** before anything else. Console, then the account menu at the top right,
   then Billing. Credit card and PayPal are the usual options; SEPA direct debit exists for
   European customers after a short history.
4. **Create a project.** The console opens on a project list. A token belongs to exactly one
   project and can never see another, so the project chosen here is the one every later call acts
   on. Name it after the thing being built, not after the person.

### Why billing comes first

A brand new account with no payment method can read the entire API successfully and fails only at
the moment of creating a server:

```json
{"error":{"code":"forbidden","message":"..."}}
```

Every prerequisite check passes. The failure arrives after the user has picked a size, agreed to a
price, and expects a working box. Confirm billing is on file before Phase 5, not after.

### New-account limits

New accounts carry a low server limit until Hetzner has some history or has verified identity.
It is commonly a handful of servers. Creating past it returns a quota error rather than a billing
one, and the fix is a support ticket, which takes a business day or so. Worth knowing before
promising anyone a fleet. A single VPS is never affected.

---

## The API token

1. In the console, **enter the project** (not the account level).
2. Left sidebar, **Security**.
3. **API tokens** tab, then **Generate API token**.
4. Give it a description naming the machine that holds it, for example `macbook-claude-code`. When
   a token later needs revoking, the description is the only thing distinguishing it.
5. **Permissions: Read & Write.** This is the one field that matters and the default is not what
   you want. A Read token satisfies every check in Step 0 and then fails at server creation.
6. **Copy it now.** Hetzner shows the value exactly once and there is no way to retrieve it later.
   A lost token is replaced, not recovered.

### Where to keep it

In order of preference:

1. A secrets manager the user already runs, read at the point of use.
2. An environment variable exported from the shell profile: `export HCLOUD_TOKEN=...`
3. A file readable only by its owner:

```bash
mkdir -p ~/.config/hcloud
printf '%s' 'PASTE_TOKEN_HERE' > ~/.config/hcloud/token
chmod 600 ~/.config/hcloud/token
```

Never a file inside a git repository, and never `.env` in a project directory unless that path is
already gitignored and the user has confirmed it. A Hetzner token with write access can create
billable servers, so a leaked one costs real money rather than just data.

Read it back in a way that tolerates either home:

```bash
TOKEN="${HCLOUD_TOKEN:-$(tr -d '\n\r" ' < "$HOME/.config/hcloud/token" 2>/dev/null)}"
[ -n "$TOKEN" ] || { echo "no Hetzner token: set HCLOUD_TOKEN or write ~/.config/hcloud/token" >&2; exit 1; }
```

The `tr` matters. A token file written by a text editor picks up a trailing newline, and a token
pasted from the console sometimes arrives wrapped in quotes. Either one produces a
`401 unauthorized` against a token that is completely correct, which is a genuinely confusing half
hour.

---

## Verify the token, including that it can write

Reading proves nothing about write access. Both checks:

```bash
# 1. the token is valid at all
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.hetzner.cloud/v1/servers?per_page=1" \
| python3 -c "
import sys, json
d = json.load(sys.stdin)
if 'error' in d:
    print('INVALID:', d['error']['code'], '-', d['error']['message'])
else:
    print('token reads OK. servers in project:', d['meta']['pagination']['total_entries'])
"
```

```bash
# 2. the token can WRITE, proven by a create-then-delete of something free.
#    An SSH key costs nothing and leaves no trace.
PROBE=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "https://api.hetzner.cloud/v1/ssh_keys" \
  -d '{"name":"hetzner-vps-write-probe","public_key":"ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHZ2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2Z2 probe"}')

echo "$PROBE" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if 'error' in d:
    c = d['error']['code']
    if c == 'forbidden':
        print('READ-ONLY TOKEN. Generate a new one with Read & Write.')
    elif c == 'uniqueness_error':
        print('write OK (probe key already present from an earlier run)')
    elif c == 'invalid_input':
        print('write reached the API (input rejected, which still proves write access)')
    else:
        print('unexpected:', c, '-', d['error']['message'])
else:
    print('write OK. probe key id:', d['ssh_key']['id'])
"
```

Clean the probe up. It is free, but leaving debris in someone's project is untidy:

```bash
PROBE_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.hetzner.cloud/v1/ssh_keys?name=hetzner-vps-write-probe" \
| python3 -c "import sys,json; k=json.load(sys.stdin)['ssh_keys']; print(k[0]['id'] if k else '')")

[ -n "$PROBE_ID" ] && curl -s -X DELETE -H "Authorization: Bearer $TOKEN" \
  "https://api.hetzner.cloud/v1/ssh_keys/$PROBE_ID" -o /dev/null -w 'probe deleted (HTTP %{http_code})\n'
```

That probe public key is a deliberately invalid ed25519 body. Hetzner may accept it or reject it
as malformed, and **both outcomes prove write access**, which is the only thing being tested. The
branch above treats them the same on purpose.

---

## Rate limits

3600 requests per hour per project, returned in `RateLimit-Remaining`. Nothing in this skill comes
close unless a polling loop runs without a `sleep`. Every wait loop in `provisioning.md` sleeps.
If a limit is hit, the API returns `rate_limit_exceeded` and the wait is a full hour, so do not
write a tight poll.
