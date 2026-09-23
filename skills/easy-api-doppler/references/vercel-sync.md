# Syncing Doppler to your deploy platform

Optional. Skip it entirely if you are happy opening the hosting dashboard when
production values change. The rest of this skill works without it.

What a sync buys you: add a key in Doppler, and it appears in production without
you touching the platform. One place to update instead of two, and no more
wondering which one is current.

The walkthrough below uses Vercel, since that is where it was proven. The shape
is the same for Netlify, Railway, Render, AWS and the rest, and every warning
about write-only variables applies to all of them.

---

## Before anything, understand the one dangerous case

**Sensitive variables are write-only, and a pull returns them blank.**

Vercel lets you mark a variable sensitive. After that nobody can read the value
back, which is the point. What makes it a trap is that `vercel env pull` does not
say so. The variable arrives in your pulled file as an empty string, with no
error, no warning, and nothing to distinguish it from a variable that is
genuinely empty.

Import that file into Doppler and you have stored blanks. Turn on the sync and
those blanks are pushed over the live secrets.

During the migration this skill came from, forty-five production secrets were
captured as empty strings this way, including a database service-role key and an
app secret. Nothing in the tooling flagged it. It was found by counting.

So the first command is always the checker:

```bash
SKILL=~/.claude/skills/easy-api-doppler
cd path/to/your/linked/project
bash "$SKILL/scripts/vercel-sync-check.sh" production
```

It reports how many variables came back empty and names them. Then open the
dashboard and look at the type beside each one, because the dashboard is the only
place that actually distinguishes empty from sensitive.

**Leave every sensitive variable out of Doppler.** The platform keeps managing
it, Doppler never learns it exists, and the sync cannot overwrite what it does
not know about. Rotating one of those still means opening the dashboard. That is
the price of having marked it sensitive, and it is a fair one.

---

## The fact that makes this safe

**Doppler syncs are additive.** They add and they update. They do not delete
variables they have never seen.

Verified during the migration: one project went from 42 entries to 66 after the
first sync, with zero pre-existing names or ids removed.

This is why you can turn a sync on for a live production app without a
maintenance window. The variables you deliberately kept out stay exactly as they
were.

---

## Step by step

### 1. Get your production values into `prd`

If the values already exist in the platform and none of them are sensitive:

```bash
vercel env pull .env.production.local --environment=production --yes
bash "$SKILL/scripts/doppler-import.sh" .env.production.local my-app prd
rm .env.production.local
```

If any came back blank, do not import that file. Remove the blank lines first,
or set those variables in Doppler by hand from the vendor's own dashboard, which
is where the real value still lives.

### 2. Check what the sync would ADD

Everybody checks what a sync overwrites. The additions are what actually break
things.

A `dev` config accumulates local flags. Promoted to production, they run. In one
case a config carried a session-replay flag and an analytics debug flag, both
read by deployed code, so the sync would have started recording real customer
sessions and put a debug library into their browsers.

Compare the two name lists and trace each new name to whether deployed code reads
it:

```bash
doppler secrets --only-names --json -p my-app -c prd
```

Application directories are live. A `scripts/` folder that only runs on your
laptop is not.

### 3. Strip the injected names

These come down in every pull and are refused on the way back:

```
VERCEL, VERCEL_ENV, VERCEL_URL, VERCEL_REGION, VERCEL_TARGET_ENV,
VERCEL_OIDC_TOKEN, VERCEL_BRANCH_URL, VERCEL_DEPLOYMENT_ID,
VERCEL_PROJECT_PRODUCTION_URL, and everything starting with VERCEL_GIT_
```

`doppler-import.sh` strips them automatically. If you uploaded by hand, delete
them in the Doppler dashboard before connecting anything. Leaving one in
produces `Secret name "VERCEL" is a reserved name in Vercel` and the sync
refuses to start.

### 4. Connect the sync

In the Doppler dashboard: your project, the `prd` config, Integrations, Vercel.
Authorise, pick the Vercel project, and target the **Production** environment.

On the import options, the safe default is to let Doppler manage only what it
knows about. You are adding, not replacing.

### 5. When the platform rejects a duplicate

If a name already exists in Vercel across several environments, the sync cannot
claim production without the existing entry moving out of the way. Do **not**
reach for `vercel env rm NAME production`. It reads like it removes one
environment and it deletes the whole entry, all environments at once. Proven on a
disposable probe: a `production,preview,development` entry vanished completely.

Narrow the target list through the API instead. The entry keeps its id and its
value, and preview and development carry on reading it:

```bash
# 1. find the entry
curl -s "https://api.vercel.com/v10/projects/$PROJECT_ID/env" \
  -H "Authorization: Bearer $VERCEL_TOKEN"

# 2. drop production from its targets
curl -X PATCH \
  "https://api.vercel.com/v9/projects/$PROJECT_ID/env/$ENV_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"target":["development","preview"]}'
```

`$PROJECT_ID` is in `.vercel/project.json`. Create `$VERCEL_TOKEN` under Account
Settings, Tokens, and remember to put it in Doppler rather than a file.

### 6. Verify

```bash
vercel env pull .env.check --environment=production --yes
```

Count the names. Confirm the ones you expected arrived and, more importantly,
confirm the ones you deliberately excluded still hold their values. Then delete
the file.

Do not verify with `vercel env ls`. It truncates, and on one project it showed
33 names where the pull returned 55.

---

## Two smaller things that waste an hour each

**A custom environment inflates every count.** If the project has one, say
`staging`, its entries carry an empty `target` array and a
`customEnvironmentIds` field instead. Anything grouping by `target` counts them
separately and reports impossible duplicate totals. On one project, 133 of the
apparent duplicates were staging.

**Five syncs on the free tier, and a sync is per pairing.** A Doppler config
paired with a platform environment is one sync, so a project syncing both
production and preview spends two of your five. Six production apps need six.
Decide which apps earn a sync before you wire any of them up.
