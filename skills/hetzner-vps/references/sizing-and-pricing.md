# Sizing the box and quoting the price

Two jobs here, and they interleave. You cannot size without knowing the region, because the
region decides which sizes exist at all.

---

## The three-state availability model, which is where quotes go wrong

`/v1/datacenters` returns three lists per datacenter, and only one of them means "you can order
this":

| List | Meaning |
|---|---|
| `supported` | The datacenter can run this type. Stable. **This is the filter to use.** |
| `available` | A live stock reading. Volatile, and wrong in both directions. Information, never a filter. |
| `available_for_migration` | An existing server may be resized into it. Irrelevant when creating. |

🔴 **Do not filter on `available`.** Verified 2026-09-07 at `nbg1` by create-testing every candidate:

| Type | `available` says | Creation actually |
|---|---|---|
| `cx23` (2c/4GB, cheapest x86) | **NO** | **CREATED** |
| `cx33` (4c/8GB) | **NO** | **CREATED** |
| `cax11` / `cax21` (ARM) | **yes** | **REFUSED** |

So the field is not merely incomplete, it is inverted for exactly the rows that matter: filtering on
it hides the two cheapest boxes on the platform and offers two that cannot be built. Filter on
`supported`, show stock as a column, and let a create attempt settle it.

The `cx` line reads `available: false` in all three EU datacenters and **builds anyway**. It is the
cheapest x86 range on the platform and it is what the Inbox Insiders masking fleet actually runs, so
a shortlist that drops it is a shortlist that quietly quadruples the bill.

Filter on `supported`, intersected with a non-null-`deprecation` check. Never `server_types` on its
own, and never a remembered list: Hetzner has renamed this line twice (`cx11`/`cx21`/`cx31`, then
`cx22`/`cx32`/`cx42`, now `cx23`/`cx33`/`cx43`), so any hardcoded type name in a document more than a
few months old is probably gone.

---

## Quoting a price correctly

Three independent traps, each of which alone produces a wrong number.

**1. `prices` is one entry per location.** Not a single price. The array is ordered by location
name, so `prices[0]` is whichever location sorts first, frequently `ash`. For `cpx11` that is
20.49 a month against 5.99 in Falkenstein, so reading index zero overstates a European quote by
3.4x. Always filter to the location the user actually chose.

**2. The currency belongs to the account, not to Hetzner.** `/v1/pricing` returns a `currency`
field that is `EUR` on some accounts and `USD` on others, and a `vat_rate` that is `0` on some and
19 or more on others. Read both. Print the symbol you read, and use `gross` rather than `net`
unless the user is VAT-registered and has asked for the net figure.

**3. The primary IPv4 is billed on top of the server.** It is in `/v1/pricing` under
`primary_ips`, not in the server type's price. Currently 0.60 a month everywhere. Small, but it is
the difference between a quote that matches the first invoice and one that does not. An IPv6-only
server avoids it entirely, at the cost of being unreachable from IPv4-only networks, which
includes many home connections and most corporate VPNs. Do not suggest IPv6-only unless the user
understands that.

### The query that assembles a correct quote

Reads live, filters on `supported`, shows stock as a column, prices at one location, adds the IPv4:

```bash
LOCATION=nbg1   # the location the user chose

python3 - "$LOCATION" <<'PY'
import json, os, sys, urllib.request

LOCATION = sys.argv[1]
TOKEN = os.environ.get("HCLOUD_TOKEN") or \
        open(os.path.expanduser("~/.config/hcloud/token")).read().strip(' \n\r"')

def get(path):
    req = urllib.request.Request("https://api.hetzner.cloud/v1" + path,
                                 headers={"Authorization": "Bearer " + TOKEN})
    return json.load(urllib.request.urlopen(req))

pricing = get("/pricing")["pricing"]
cur = pricing["currency"]
vat = float(pricing["vat_rate"])
ipv4 = next(float(p["price_monthly"]["gross"]) for t in pricing["primary_ips"]
            if t["type"] == "ipv4" for p in t["prices"] if p["location"] == LOCATION)

sup, avail = set(), set()
for dc in get("/datacenters")["datacenters"]:
    if dc["location"]["name"] == LOCATION:
        sup   |= set(dc["server_types"]["supported"])   # the filter
        avail |= set(dc["server_types"]["available"])   # shown as a column only

rows = []
for t in get("/server_types?per_page=100")["server_types"]:
    if t["id"] not in sup or t.get("deprecation"):
        continue
    pr = next((p for p in t["prices"] if p["location"] == LOCATION), None)
    if not pr:
        continue
    rows.append((float(pr["price_monthly"]["gross"]), t["name"], t["cores"], t["cpu_type"],
                 int(t["memory"]), t["disk"], t["architecture"],
                 pr["included_traffic"] / 1024**4, float(pr["price_per_tb_traffic"]["gross"]),
                 "yes" if t["id"] in avail else "NO"))
rows.sort()

print(f"Location {LOCATION} | currency {cur} | VAT {vat*100:.0f}% | primary IPv4 {cur} {ipv4:.2f}/mo")
print(f"{'type':7} {'cores':11} {'RAM':6} {'arch':5} {'stock':6} {'server':>10} {'ALL-IN':>10}  traffic")
for m, name, c, cpu, ram, disk, arch, tb, over, stock in rows[:10]:
    print(f"{name:7} {str(c)+' '+cpu:11} {ram:<3}GB  {arch:5} {stock:6} "
          f"{cur} {m:>6.2f} {cur} {m+ipv4:>6.2f}  {tb:.1f}TB incl, {cur} {over}/TB over")
PY
```

Quote the **ALL-IN** column. That is the number the user will recognise on their invoice. A `NO` in
the stock column is not a reason to skip a row: try it and read the error.

---

## Region is a pricing decision, not just a latency one

Verified 2026-09-07 with the query above. The cheapest orderable box, all in:

| Location | Cheapest / with >=4 GB | All-in / month | Included traffic | Overage |
|---|---|---|---|---|
| `nbg1` `fsn1` `hel1` (EU) | `cpx11` 2c/2GB / **`cx23` 2c/4GB** | 6.59 / **7.09** | 20 TB | 1.20 / TB |
| `ash` `hil` (US) | `cpx11` 2c/2GB / `cpx21` 3c/4GB | 21.09 / 38.09 | 1 TB | 1.20 / TB |
| `sin` (Singapore) | `cpx11` 2c/2GB / `cpx21` 3c/4GB | 12.09 / 22.59 | 1 TB | **8.30 / TB** |

`cx23` is the sane EU default and it reports `available: false`. It builds. Do not skip it.

Three things follow, and each is worth saying out loud to the user:

- **Europe is 5x cheaper once RAM is equalised**: 7.09 for `cx23` against 38.09 for the nearest US
  box, because neither `cx` nor `cax` is sold outside the EU. If the workload is a backend service,
  a scraper, a bot, an n8n instance, or anything else without latency-sensitive human users, put it
  in Europe. Only pay for `ash`/`hil` when real US users hit it directly.
- **Included traffic differs by 40x.** Europe gets 20 TB. Ashburn gets 1 TB. Singapore gets 0.5 TB.
- **Singapore overage is 8.30 per TB, nearly seven times the rate anywhere else.** A chatty box
  there can quietly generate a bill far larger than the server itself. Flag it explicitly before
  anyone picks `sin`.

---

## ARM: in stock, and refused at creation

On paper `cax11` is a bargain: 4 GB for 7.59 all-in, and it is one of the few rows reporting
`available: true`.

**It could not actually be created**, while `cx23` next to it at 7.09 (reporting `available: false`)
built first time. So ARM is not even a saving here. Verified 2026-09-07 against a live account: every `cax` type,
in every EU location, with both the x86-name and the explicit ARM image ID, was refused with
`invalid_input: unsupported location for server type`, while `cpx12` in the same location with the
same key and firewall succeeded on the next call. The API listed all four `cax` types as
`available` in all three EU datacenters throughout.

So **do not quote an ARM box until a creation has succeeded.** Offer it only as a first candidate
with an automatic fallback (`provisioning.md`, section "When creation fails with `unsupported
location for server type`"), and re-quote the price if the fallback fires. Whether this is
account-specific, stock, or a quiet withdrawal is not something the API will tell you, so the only
honest test is to try.

If it does create, the remaining catch is `arm64`. It is fine for most modern software, and the following are all published
multi-arch: Docker itself, Postgres, Redis, Caddy, nginx, Node, Python, Go, n8n, Ollama.

It breaks on: anything shipping an `amd64`-only image, most commercial or vendor-supplied
containers, older self-hosted projects, some Playwright and Chrome builds, and anything with a
compiled binary dependency published for x86 only. The failure mode is a container that pulls and
then immediately exits, sometimes with `exec format error` and sometimes with nothing useful at
all.

**Ask, do not assume.** "Is there any specific Docker image or vendor software this has to run?"
If the answer names anything, or is uncertain, choose x86. The saving is not worth an afternoon.

---

## Sizing by RAM, because RAM is what runs out

CPU throttles. RAM kills the process. Size on RAM and let the cores follow.

| Workload | RAM | Reasonable start (EU / US) |
|---|---|---|
| A single small service, a bot, a cron runner | 2 GB | `cpx11` / `cpx11` |
| n8n, single mode, light use | 4 GB | **`cx23`** / `cpx21` |
| n8n queue mode, or a few containers | 8 GB | **`cx33`** / `cpx31` |
| Postgres with real data, or a scraper fleet | 16 GB+ | **`cx43`** / `cpx41` |

`cx23` and `cx33` were create-tested on 2026-09-07 and both built. `cx43` was refused that day with
`resource_unavailable: error during placement`, which is a **stock** shortage rather than a dead
type: try another EU location, or try again later, before moving up to the 4x-dearer `cpx42`.

`shared` vCPU is fine for almost everything here. `dedicated` (the `ccx` line) costs roughly 4x
and is worth it only for sustained full-core load: continuous video encoding, a busy CI runner,
heavy database work. Do not default to it.

**The disk is not resizable downward, and the whole plan is not resizable downward at all.** A
server can be upgraded to a larger type later, but Hetzner cannot shrink one, because the disk
image cannot be shrunk safely. Starting one size too small is a cheap mistake to fix. Starting one
size too large means rebuilding to get out of it. Say this when the user is torn between two
sizes, and recommend the smaller.

---

## The extras, and what they cost

| Item | Price | Notes |
|---|---|---|
| Primary IPv4 | 0.60 / month | Billed separately. Included in the ALL-IN column above. |
| Backups | **+20% of the server price** | Automatic daily, 7 kept. Enable at creation or later. |
| Snapshots | 0.0199 / GB / month | **Survive server deletion and keep billing.** See `teardown.md`. |
| Volumes | 0.0767 / GB / month | Separate block storage, also survives deletion. |
| Floating IP | 3.50 / month | Only needed to move an address between servers. |

Backups at +20% are usually worth it for anything holding state the user cannot rebuild. For a
disposable box, they are not. Ask rather than deciding.

The two that cause surprise invoices are **snapshots** and **volumes**, because both outlive the
server. Teardown has to handle them explicitly.
