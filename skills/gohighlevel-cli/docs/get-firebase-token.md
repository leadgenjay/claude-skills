# Getting your GHL browser setup values

You only need this if you want to **build/update workflows** (the internal-API
`--experimental` commands). Everything else works with just `GHL_API_KEY`.

The Firebase web key and refresh token are read from your own logged-in
GoHighLevel session - no extension, no install, and no network call from the
helper. You paste one snippet into the browser's DevTools console and it copies
both values to your clipboard as ready-to-paste `.env` lines.

## Steps

1. In Chrome (or any Chromium browser), open and log into `https://app.gohighlevel.com`.
2. Open DevTools: **⌘⌥J** (Mac) / **Ctrl-Shift-J** (Windows/Linux) to jump straight to the
   Console.
3. Paste this and press Enter:

   ```js
   (async () => {
     const db = await new Promise((res, rej) => {
       const r = indexedDB.open("firebaseLocalStorageDb");
       r.onsuccess = e => res(e.target.result);
       r.onerror = () => rej("Cannot open IndexedDB");
     });
     const entries = await new Promise((res, rej) => {
       const tx = db.transaction("firebaseLocalStorage", "readonly");
       const all = tx.objectStore("firebaseLocalStorage").getAll();
       all.onsuccess = () => res(all.result);
       all.onerror = () => rej("Failed to read store");
     });
     for (const e of entries) {
       const user = e?.value || e;
       const apiKey = user?.apiKey;
       const refreshToken = user?.stsTokenManager?.refreshToken;
       if (apiKey && refreshToken) {
         copy(`GHL_FIREBASE_API_KEY=${apiKey}\nGHL_FIREBASE_REFRESH_TOKEN=${refreshToken}`);
         console.log("Setup values copied. Paste both lines into .env.");
         return;
       }
     }
     console.warn("No setup values found - make sure you're logged into GHL on this tab.");
   })();
   ```

4. The console prints `Setup values copied.`
5. Paste both lines into your `.env`:

   ```env
   GHL_FIREBASE_API_KEY=<copied public web key>
   GHL_FIREBASE_REFRESH_TOKEN=<copied refresh token>
   ```

> If the console shows `No setup values found`, make sure you ran the snippet on an
> `app.gohighlevel.com` tab where you're logged in (not a marketing page).

## Security — read before you use this

- **The refresh token is your entire GHL login**, not a scoped key. It grants full account
  access — anyone who obtains it can do anything you can. (The scoped, revocable
  Private Integration Token in `GHL_API_KEY` is the safe default for everything else.)
- **Own-account-only.** Generate and use this token only on **your own** agency
  account. **Never** paste a *client's* token, and never run the internal API against
  client sub-accounts. To provision workflows for clients, build the workflow once in
  the GHL UI and ship it in a **Snapshot** — sub-accounts inherit it on provision, with
  no token and no internal API. See the "Workflow building" section of the README.
- **Treat it like a password.** `.env` is gitignored — never commit it — and prefer
  sourcing the token from a secret manager / OS keychain rather than leaving it at rest
  in `.env`.
- **The internal API is unofficial.** `backend.leadconnectorhq.com` has no SLA, can
  change or break without notice, and may run against GHL's ToS. The CLI prints a
  one-time warning whenever the internal path is used (suppress with
  `GHL_SUPPRESS_INTERNAL_WARNING=1`); workflows are always created as draft.
- The Firebase web key is public application configuration. The refresh token is
  the sensitive value. Treat the copied pair like the refresh token.
- The snippet itself only **reads** from your own browser's IndexedDB and uses the
  built-in DevTools `copy()` helper. It makes no network calls.
- Tokens refresh automatically once both values are in `.env`; re-run the snippet only if you get an
  "expired/revoked" error.
