# Getting your GHL Firebase refresh token

You only need this if you want to **build/update workflows** (the internal-API
`--experimental` commands). Everything else works with just `GHL_API_KEY`.

The token is read from your own logged-in GoHighLevel session — no extension, no
install, nothing leaves your browser. You paste a one-line snippet into the browser's
DevTools console and it copies the token to your clipboard.

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
       const stm = (e?.value || e)?.stsTokenManager;
       if (stm?.refreshToken) {
         copy(stm.refreshToken); // DevTools copy() helper → clipboard
         console.log("✓ Refresh token copied. Paste into .env as GHL_FIREBASE_REFRESH_TOKEN=");
         return;
       }
     }
     console.warn("No refresh token found — make sure you're logged into GHL on this tab.");
   })();
   ```

4. The console prints `✓ Refresh token copied.` — the token is now on your clipboard.
5. Paste it into your `.env`:

   ```env
   GHL_FIREBASE_REFRESH_TOKEN=<paste here>
   ```

> If the console shows `No refresh token found`, make sure you ran the snippet on an
> `app.gohighlevel.com` tab where you're logged in (not a marketing page).

## Security — read before you use this

- **This token is your entire GHL login**, not a scoped key. It grants full account
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
- The snippet itself only **reads** from your own browser's IndexedDB and uses the
  built-in DevTools `copy()` helper. It makes no network calls.
- Tokens refresh automatically once in `.env`; re-run the snippet only if you get an
  "expired/revoked" error.
