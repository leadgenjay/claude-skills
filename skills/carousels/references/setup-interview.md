# Setup Interview — first run (or `--reconfigure`)

Run this interview whenever `config/config.json` is missing from the skill directory, or the user asks to reconfigure. Ask conversationally, one section at a time — do not dump every question at once. At the end, write the config, then confirm the summary back to the user.

The skill installs fine WITHOUT Fal.ai or Blotato configured — this interview is exactly where those get established. Never treat a missing key as an install failure.

## 1. Who is this for

- **Name / brand name** — used in prompts ("photo of the man/woman" framing) and file naming.
- **Instagram handle** (without the @) — rendered bottom-left on every slide and in the preview mockup.
- **Niche + audience** — one line each. Stored so future carousels default to the right voice.

## 2. Reference photos (REQUIRED — the skill cannot make identity slides without them)

Ask for **two well-lit photos** of the person who fronts the account:

| Photo | What to ask for | Used on |
|---|---|---|
| `cover` | Waist-up, expressive (pointing, excited, holding a phone), plain background preferred | Cover slide |
| `cta` | Clean headshot, friendly direct smile | CTA slide |

Rules to tell the user:
- Phone photos are fine. Sharp, well-lit, one person only, no sunglasses.
- The FULL photo is passed to the image model as the sole reference — this is what keeps their real face on the slides. Cropped/tiny/blurry photos produce face drift.
- Faceless brand? Record `photos: {}` and use text-only covers (the skill supports it, engagement is typically lower — say so).

Save the files to `config/photos/cover.<ext>` and `config/photos/cta.<ext>` (copy from wherever the user provides them). Also ask for an optional square avatar for the preview mockup → `config/photos/avatar.png`.

If the user owns a trained Flux LoRA of themselves, record `loraUrl` (+ `loraTrigger`) — otherwise skip; reference photos are the default and work well.

## 3. Brand design tokens

Default = the proven V3 system. Only override what the client actually has:

| Token | Question | Default |
|---|---|---|
| `accentColor` | "Primary brand color for emphasized words?" | `#ED0D51` |
| `highlightColor` | "Highlighter color behind key words?" | `#FFE033` |
| `backgroundStyle` | keep default unless they insist | `warm off-white #F8F6F1 with subtle dot grid, like premium notebook paper` |
| `displayFont` | "A bold condensed display font you use?" | `Big Shoulders Black` |
| `bodyFont` | "Body font?" | `Manrope` |
| `bannedWords` | extra words they never say (merged with the built-in AI-slop list) | `[]` |

Dark backgrounds are refused — light backgrounds are a hard rule of this system, not a preference.

## 4. Fal.ai (REQUIRED for generation — walk them through it now if missing)

Check `FAL_KEY` in env, then `config/.env`. If missing:

1. Send them to https://fal.ai → sign up → dashboard → **Keys** → create a key.
2. Explain cost: ~$0.18/slide, so a full 8-slide carousel ≈ **$1.50–2** per run. Billing is pay-as-you-go on their fal account.
3. Write the key to `config/.env` as `FAL_KEY=...` (never into config.json, never echo it back in full).

## 5. Blotato (OPTIONAL — auto-publish)

Ask: "Do you want carousels published to Instagram automatically, or will you post manually?"

- **Manual** → set `"publish": "manual"`. Done — the skill hands them hosted slide URLs + caption at the end of each run.
- **Auto** → they need a Blotato account (https://blotato.com) with their Instagram connected. Write `BLOTATO_API_KEY=...` to `config/.env`, then run `node scripts/publish-blotato.mjs --list-accounts` and record their Instagram account id as `blotato.instagramAccountId`. Set `"publish": "blotato"`.

## 6. CTA / DM automation

- "When someone comments your trigger word, what sends them the link — ManyChat, GoHighLevel, something else, or nothing yet?" → record `dmTool` + `defaultCtaKeyword`.
- If `dmTool` is `none`: warn that a comment-word CTA with no auto-DM loses every lead — default their CTA to "Follow @handle" until they set one up.
- Before ANY publish with a comment CTA, the checklist requires the user to confirm the keyword is live in their DM tool. There is no automated check — it is their tool.

## config.json schema (write to `config/config.json`)

```json
{
  "version": 1,
  "name": "Sam Client",
  "handle": "samclient",
  "niche": "fitness coaching",
  "audience": "busy professionals over 35",
  "photos": {
    "cover": "photos/cover.jpg",
    "cta": "photos/cta.jpg",
    "avatar": "photos/avatar.png"
  },
  "loraUrl": null,
  "loraTrigger": null,
  "brand": {
    "accentColor": "#ED0D51",
    "highlightColor": "#FFE033",
    "backgroundStyle": "warm off-white #F8F6F1 with subtle dot grid, like premium notebook paper",
    "displayFont": "Big Shoulders Black",
    "bodyFont": "Manrope",
    "bannedWords": []
  },
  "publish": "manual",
  "blotato": { "instagramAccountId": null },
  "dmTool": "none",
  "defaultCtaKeyword": null
}
```

Photo paths are relative to `config/`. Secrets live ONLY in `config/.env`:

```
FAL_KEY=...
BLOTATO_API_KEY=...
```

`config/` is not part of the published skill files, so marketplace re-installs and updates never overwrite it.

## Closing the interview

1. Write `config/config.json` + `config/.env`.
2. Verify: photos exist at the recorded paths; if FAL_KEY present, confirm it looks like a key (non-empty, no spaces).
3. Read back a 5-line summary (name, handle, colors, publish mode, CTA tool) and ask for a "looks right?" confirmation.
4. Offer to generate their first carousel.
