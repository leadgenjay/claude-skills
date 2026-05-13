---
description: "Higgsfield router. Cinematic AI ad hooks of Jay by default (Soul Character, 9s vertical, visual-metaphor). Also routes to product-photoshoot, marketplace-cards, soul-id."
argument-hint: "<hook idea OR detailed visual brief> [--talking-head] [--cinema] [--image <path>] [--ratio 16:9] [--duration 12] [--vary 3] [--no-jay]"
---

# /higs — Higgsfield Router + Jay Ad Hook Mode

Single entry point for everything Higgsfield. The most common use, a cinematic ad hook of Jay, is the default path. Other Higgsfield jobs (product photos, marketplace listings, Soul training) still route through this command via the Skill tool.

**Config-driven.** Every default lives in `.claude/skills/higs/higs-config.json` (model routing, durations, tokens, ceilings, fallback photo map). Read it once at start; do not hardcode any of those values in this file.

## Step 0 — Auth check

```bash
higgsfield auth token >/dev/null 2>&1 || echo "NEEDS_AUTH"
```

If `NEEDS_AUTH`, tell the user to run `! higgsfield auth login` in this session (browser flow) and stop. Do not try to bypass it.

## Step 1 — Classify intent

Match `$ARGUMENTS` against this table top-to-bottom. First match wins.

| Signal in $ARGUMENTS | Route to |
|---|---|
| "train my face", "create my Soul", "digital twin", "build me an avatar", "learn my appearance", "Soul character", `--soul-train` | `higgsfield-soul-id` |
| "marketplace", "Amazon listing", "product detail card", "secondary product image", "A+ content", "listing infographic" | `higgsfield-marketplace-cards` |
| "product photo", "studio shot", "lifestyle image", "Pinterest pin", "hero banner", "virtual try-on", "model wearing", "person holding product", "levitating/floating/splash product", "CGI product", anything with a real product (not Jay) as hero | `higgsfield-product-photoshoot` |
| "analyze this video", "score this ad", "evaluate hook", "virality", "hook strength", "retention analysis" | `higgsfield-generate` Virality Predictor (`brain_activity`) |
| `--no-jay` flag present | `higgsfield-generate` (generic, no Jay defaults) |
| Anything else that wants video/image generation | Jay Ad Hook Mode (Step 2) |

Tiebreakers:
- Product image with marketplace context: marketplace-cards.
- Brand product image without marketplace context: product-photoshoot.
- One person's face uploaded + intent to reuse identity later: soul-id first.

For non-Jay routes, invoke via the **Skill tool**:

```
Skill(skill="higgsfield-product-photoshoot", args="$ARGUMENTS")
Skill(skill="higgsfield-marketplace-cards", args="$ARGUMENTS")
Skill(skill="higgsfield-soul-id", args="$ARGUMENTS")
Skill(skill="higgsfield-generate", args="$ARGUMENTS")
```

## Step 2 — Jay Ad Hook Mode

Default branch for any image/video generation request that did not route elsewhere.

### 2a. Load config

Read `.claude/skills/higs/higs-config.json`. Use every value from there. Do not restate values in this file.

If `jay_soul_id` is `null`, tell the user once:
> Soul Character not trained yet. Falling back to keyword-matched reference photo from `fallback_photo_by_keyword` in config. For best identity fidelity on video, run: `Skill(skill="higgsfield-soul-id", args="train using all photos in output/photos/jay-database/")` and write the returned `reference_id` into `.claude/skills/higs/higs-config.json`.

### 2b. Concept gate

Count user words in `$ARGUMENTS` using regex `\S+` after stripping any token starting with `--` and its single following value. Examples:
- `cold email pain` → 3 words → brainstorm.
- `Jay walks through a graveyard of dead cold-email accounts, headstones glow red, he taps his phone, all flip white reading REPLIED, 9s` → 22 words → direct.

If word count < 15 OR matches `/\b(idea|topic|about|hook|concept|something|some kind of|what should|what would)\b/i` → run **Brainstorm sub-routine** (Step 3). Wait for user pick (`1`, `2`, `3`, or `all`). Else use the input as the direct visual brief.

### 2c. Pick model

Read the `model_routing` map from config. Choose the key by intent:

- `--talking-head` flag OR input contains "speaks", "says", "tells the camera", "looks at camera", "to camera" → `talking_head` key.
- `--cinema` flag OR input contains "hero spot", "brand film", "highest fidelity" → `cinema_hero` key.
- Else → `visual_metaphor` key.

The looked-up value is the `<jst>` (job set type) to pass to `higgsfield generate create`.

### 2d. Identity source

Resolution order:
1. `--image <path>` flag in `$ARGUMENTS` → use `--image <path>`.
2. Else if `jay_soul_id` is set in config → use `--soul-id <jay_soul_id>`.
3. Else → look up `fallback_photo_by_keyword` in config. Match keys against `$ARGUMENTS` (case-insensitive); use the first match's value, or `default` if no key matches. Pass via `--image`.

### 2e. Build prompt

**CRITICAL — Character reference rule (positioned first; identity miss is the #1 failure mode):**

When `--image` is a Jay photo (i.e., identity source = photo), the prompt MUST NOT describe the character's face, age, ethnicity, hair, or build in text. Use third-person referential phrases instead: "the man pictured", "the man in the photo", or just "Jay". Wardrobe and expression CAN be specified since they're scene-dependent.

**BANNED phrases when `--image` is a Jay photo** (these prime Seedance/Kling to generate a generic face instead of Jay's, overriding the reference):

- "a clean-cut man in his early 30s"
- "a young man with dark hair"
- "a guy in his 20s/30s/40s"
- "a man with [any physical description]"
- "a model wearing..."
- Any phrase that opens with "A <demographic descriptor> man/woman..."

**Pattern:** Start the prompt with the action or scene, then refer to Jay by name or "the man pictured" once. Example:

- ❌ Bad: "A clean-cut man in his early 30s with short dark hair stands on a porch..."
- ✅ Good: "The man pictured stands on a suburban front porch in fitted black tee..."
- ✅ Better: "Jay rings a doorbell on a suburban front porch, fitted black tee..."

When `--soul-id` is in use (no `--image`), the Soul reference handles identity — prompt can be slightly more descriptive but still avoid demographic openers.

**Then compose the final prompt string as:**

```
<visual_brief — using "the man pictured" / "Jay" instead of demographic openers>. <default_outfit_token>. <default_expression_token>. Cinematic 85mm shallow depth of field, photoreal, color-graded. Visual metaphor scene, not talking to camera unless explicitly described.
```

Pull `default_outfit_token` and `default_expression_token` from config. If model supports a separate `--negative_prompt`, pass `anti_slop_negative` there; else append to the prompt as `Avoid: <anti_slop_negative>.`.

When `--talking-head` is active: drop the "not talking to camera" sentence; keep outfit + expression tokens.

**Shell safety.** `$ARGUMENTS` may contain quotes, backticks, dollar signs. Wrap the built prompt in a Bash here-string with the `$'...'` escape form, or pipe via stdin. Never interpolate `$ARGUMENTS` directly into a double-quoted string. Pattern:

```bash
PROMPT="$(printf '%s' "<built_prompt>")"
higgsfield generate create "$JST" --prompt "$PROMPT" ...
```

### 2f. Cost estimate + gate

`higgsfield generate cost` returns `credits` (integer) + `credits_exact` (float). It also requires `--prompt`. Pass a placeholder prompt for estimation purposes (the cost depends on duration/aspect/resolution, not prompt content):

```bash
higgsfield generate cost "$JST" \
  --prompt "cost-estimate" \
  --duration "$DURATION" \
  --aspect_ratio "$ASPECT" \
  --resolution "$RESOLUTION" \
  --json | jq -r '.credits_exact'
```

Convert credits to USD using the rate at the bottom of this file (Plus plan: ~$0.02/credit, ~$0.025/credit on Pro). If the rate is unknown, surface the credit cost directly to the user.

If `(usd_estimate × variations) > cost_ceiling_usd`:

> Estimated cost: $X.XX / Y credits (over $2.00 ceiling). Proceed? (y/N)

Stop and wait for explicit `y`. Else proceed silently.

### 2g. Submit job

```bash
higgsfield generate create "$JST" \
  --prompt "$PROMPT" \
  [ --soul-id "$SOUL_ID" | --image "$IMAGE" ] \
  --aspect_ratio "$ASPECT" \
  --duration "$DURATION" \
  --wait \
  --wait-timeout "$WAIT_TIMEOUT_INITIAL"
```

Use `--wait` so the call blocks. If `variations > 1`, fan out N parallel submissions in a single Bash batch.

**Timeout handling.** If the CLI exits non-zero with a timeout error AND a job ID was emitted to stdout, retry once with `--wait-timeout "$WAIT_TIMEOUT_RETRY"` via `higgsfield generate wait <id> --wait-timeout 20m`. If still timing out, print the job ID and tell the user:

> Job is still running. Check later with: `higgsfield generate get <id>`. Once complete, re-run `/higs --attach <id>` to download and mirror.

### 2h. Post-render

For each returned MP4 URL:

1. **Slug** = first 6 words of the prompt, lowercased, kebab-cased, punctuation stripped. Example: `cold email pain Jay graveyard headstones` → `cold-email-pain-jay-graveyard-headstones`.
2. **Date folder** = `$(date +%Y-%m-%d)`.
3. `mkdir -p "${output_local_root}/${date}"` then `curl -L "$URL" -o "${output_local_root}/${date}/${slug}.mp4"`.
4. `mkdir -p "${output_nextcloud_root}/${date}"` (expand `~` first) then `cp` the file in.
5. Print one block per output:
   ```
   ✓ <slug>.mp4 — model: <model> — <duration>s <aspect>
     Local:     output/higgsfield/<date>/<slug>.mp4
     Nextcloud: ~/Nextcloud/Visual Assets/AI Ad Hooks/<date>/<slug>.mp4
     Higgsfield: <url>
     Cost:      $X.XX
   ```
6. After all outputs printed, offer one follow-up: "Pipe into /kinetic-text-ad to layer VO + bold text + SFX? (y/N)"

## Step 3 — Brainstorm sub-routine

Triggered from 2b on short/vague input. Goal: return 3 cinematic visual-metaphor concepts. NO generation runs here.

1. **Pain-points (best effort).** Call `/kb-get` with the topic keyword from `$ARGUMENTS`. Take top 3 pain-point quotes if available.
2. **Seeds.** Read `.claude/skills/higs/references/concept-prompts.md`. Match the topic keyword against the index at the bottom of that file. Take 2-3 matching seeds.
3. **Competitor scaffolds (best effort).** Query the `scraped_ads` Supabase table for top video ads in the niche (filter by `niche_tier` or competitor name). Take top 2 angle structures from `angle` / `format` columns.

**Fallback when KB returns nothing.** If `/kb-get` errors or returns zero hits for the topic, fall back to (in order): (a) the seed pool in concept-prompts.md, filtered only by ABCD beat, (b) generic outbound-sales pain framing from CLAUDE.md (cold-call burnout, inbox burial, manual list-build, AI replacing SDRs). Still compose 3 concepts. Note in the output: `(no KB hits for "<topic>"; concepts drawn from seed library only)`.

**Fallback when scraped_ads is unreachable.** Skip silently and proceed with KB + seeds only.

4. **Compose 3 concepts.** Each must:
   - Be a visual scene, not a script (no spoken dialogue).
   - Place Jay inside the frame doing or observing an action.
   - Map to one ABCD beat (Attention / Branding / Connection / Direction).
   - Cite a pain-point quote OR a competitor scaffold (one-line attribution).
   - Default to 9s and 9:16 unless the user specified otherwise.
5. **Print as numbered list:**

```
## 3 Cinematic Concepts for "<topic>"

**1. <Concept name>** | Beat: Attention | Model: Seedance 2.0 | Est. $0.7X
<2-sentence visual scene.>
Pain mapped: "<KB pain quote or competitor scaffold>"

**2. <Concept name>** | Beat: ...
...

**3. <Concept name>** | Beat: ...
...

Reply: `1`, `2`, `3`, or `all`.
```

6. Wait for the user pick. `all` fans out 3 parallel jobs, subject to the cost gate in 2f.

## Worked example (end-to-end)

User: `/higs cold email pain`

1. Auth check passes.
2. Classify: no marketplace/product/soul-train signals. Word count = 3, under 15 → Jay Ad Hook Mode + Brainstorm.
3. Load config: `jay_soul_id = null`, fallback map applies.
4. Brainstorm:
   - `/kb-get cold email pain points` returns 3 pain quotes.
   - Concept-prompts.md seeds 1, 2, 6, 11 match "cold email".
   - `scraped_ads` query returns Lemlist + Smartlead top angles.
   - Print 3 numbered concepts. Wait for pick.
5. User replies: `1`.
6. Pick model: no talking-head signal → `visual_metaphor` → `seedance_2_0`.
7. Identity: `jay_soul_id` null, fallback map matches no key in "cold email pain" → use `default` photo `output/photos/jay-database/jay-black-tee-moody-serious.png`.
8. Build prompt:
   ```
   Wide dusk shot. Jay walks slowly through a graveyard, headstones glow faint red, each etched with a phone number. He stops mid-frame and his phone screen flares pink. Every headstone simultaneously flips to clean white marble reading "REPLIED" in serif font. Cold blue fog dissipates into golden light. 9s. Fitted black crew neck t-shirt. Serious, calm intensity, no smile, direct presence. Cinematic 85mm shallow depth of field, photoreal, color-graded. Visual metaphor scene, not talking to camera unless explicitly described. Avoid: no smiling, no standing and speaking to camera, no corporate framing, no specific hand gestures unless requested, no exaggerated expressions, no AI-slop perfect symmetry, no melted faces, no extra fingers.
   ```
9. Cost: `higgsfield generate cost seedance_2_0 --duration 9 --aspect_ratio 9:16 --json` → ~$0.78. Under $2 ceiling. Proceed silently.
10. Submit: `higgsfield generate create seedance_2_0 --prompt "$PROMPT" --image output/photos/jay-database/jay-black-tee-moody-serious.png --aspect_ratio 9:16 --duration 9 --wait --wait-timeout 10m`
11. Wait completes. MP4 URL returned.
12. Slug = `wide-dusk-shot-jay-walks-slowly`. Download to `output/higgsfield/2026-05-13/wide-dusk-shot-jay-walks-slowly.mp4` and mirror to `~/Nextcloud/Visual Assets/AI Ad Hooks/2026-05-13/...`.
13. Print result block. Offer `/kinetic-text-ad` chain.

## Known constraints (learned 2026-05-13)

These are real Higgsfield behaviors discovered the hard way. Don't rediscover them.

### CLI `--wait` and `generate get` return 500 while jobs actually complete

**This is the #1 trap.** As of 2026-05-13 PM, `higgsfield generate get <id>` returns `HTTP 500 Internal Server Error` for jobs that are running successfully and will complete normally. `higgsfield generate create ... --wait` uses the same broken endpoint internally, so `--wait` also returns 500 even though the underlying job is fine.

**Symptoms (looks like a failure, is not):**

```
$ higgsfield generate create seedance_2_0 --prompt "..." --image ... --wait
Error: Higgsfield API error (HTTP 500). Internal Server Error
```

The job is still running. Credits still debit. The output WILL appear at `generate list` 1–5 minutes later.

**Workaround — never use `--wait`. Poll via `generate list` instead:**

```bash
# Submit without --wait, capture the job ID
JOB_ID=$(higgsfield generate create <model> ... --json 2>&1 | jq -r '.[0]')

# Poll list until completed
for i in {1..60}; do
  STATUS=$(higgsfield generate list --size 10 --json | jq -r ".[] | select(.id == \"$JOB_ID\") | .status")
  URL=$(higgsfield generate list --size 10 --json | jq -r ".[] | select(.id == \"$JOB_ID\") | .result_url")
  [ "$STATUS" = "completed" ] && echo "$URL" && break
  sleep 10
done
```

Empty `STATUS` means the job hasn't surfaced in the list yet — keep polling. Once `status=completed`, the `result_url` field is the public CloudFront URL of the output.

**Skill-wide implication.** Section 2g of this command (which prescribes `--wait`) is wrong while this bug exists. The fix above replaces it. Do not use `higgsfield generate wait` either — same broken endpoint.

### Counter-finding: most "failed" submissions actually succeeded

After discovering the `get`/`--wait` 500 bug, re-audit the `generate list`:

- All 2 `text2image_soul_v2` "500s" today → completed, output PNG URLs available.
- 1 `soul_cast` "500" today → completed.
- 3 `cinematic_studio_video_v2` jobs assumed lost → completed.

Only **`marketing_studio_video` truly fails** — those job IDs never appear as completed in the list and never produce a `result_url`. So the "credit-debit-on-failure" pattern is real **for MS Video only**. Other models work, you just need to use `generate list` to retrieve them.

### Seedance 2.0 `--image` does NOT lock identity — it's a style hint

**Verified 2026-05-13 PM via autoheal cycle.** When you pass `--image <jay-photo.png>` to `seedance_2_0`, the reference is treated as a **style/composition hint**, NOT a strict character identity lock. Seedance will generate a generic dark-haired man matching the prompt's demographic description and ignore facial-identity features in the reference image.

Evidence from autoheal cycle:
- v2 prompt: "A clean-cut man in his early 30s with short dark hair…" → generic AI face, plus mustache drift mid-clip.
- heal-1 prompt: "Jay stands on a suburban front porch…" (no demographic opener, per character-reference rule above) → still generic AI face, but character drift improved (face stayed consistent across frames).

**Implication:** Naming Jay in the prompt + dropping the demographic opener helps with WITHIN-CLIP consistency (less drift), but does NOT make Seedance render Jay. The model fundamentally treats `--image` as a tone reference.

**To actually preserve Jay's identity on video, the options are (in order of feasibility today):**

1. **Post-process face-swap.** Render the video with Seedance, then face-swap Jay's identity onto each frame (Higgsfield has a Face Swap model — see transactions 2026-05-03; or use fal.ai face-swap). One pass, one cost.
2. **`soul_cast`** (Higgsfield's native Soul video model). Untested end-to-end as of 2026-05-13 — the structured `prompt` object schema isn't exposed via `model get`, only via error messages. The minimal probe in this session produced a still PNG, not a video; deeper probing required.
3. **`marketing_studio_video`** — would handle avatar identity, but the service is broken (see Issue 1 above).
4. **`cinematic_studio_video_v2` with `medias` array.** Earlier today's CSV2 jobs (`0850d398`, etc.) used `medias` with `role: start_image` and produced better identity continuity than Seedance — worth testing for Jay-identity work even though those particular jobs used the suit-wardrobe AI photo.

**Do NOT chase Seedance identity fidelity via prompt-only tweaks.** That's where credits get burned. Either escalate to a face-swap pass or switch models.

### Soul-trained portrait quality is NOT guaranteed by Soul type matching

Trained `jay-cinematic` (type=`soul_cinematic`, 20 photos: 15 real + 5 AI, mostly left-3q/left-profile) on 2026-05-13. Used it via `text2image_soul_v2` with a porch-scene prompt. **Output portrait did NOT capture Jay's identity well.** Whether that's because:
- Soul type=`soul_cinematic` Souls don't fully transfer to `text2image_soul_v2` inference, OR
- The training set was skewed (no right-side, no front-on-bright-light, mostly chin-down/left-3q), OR
- text2image_soul_v2 is just inconsistent shot-to-shot

…is unresolved. **Pragmatic rule:** always preview the Soul output before piping into a higher-cost video model. If the portrait misses, fall back to an existing AI Jay photo (`output/photos/jay-database/*.png`) for the video reference. The fallback path is the known-working v1 method.



### Soul ID compatibility — VERIFY VIA SCHEMA, not docs

The CLI flag `--soul-id <id>` maps to the API field `custom_reference_id`. A model only accepts Soul ID if its schema (`higgsfield model get <name> --json`) lists `custom_reference_id` as a param. Run `higgsfield model get <model> --json | grep custom_reference_id` to confirm before submitting.

**Verified 2026-05-13 PM (schemas can change without notice):**

| Model | Type | `custom_reference_id` in schema? | Notes |
|---|---|---|---|
| `text2image_soul_v2` | image | ✅ | Stills. The canonical Soul image path. |
| `soul_cinematic` | image | ❌ | Schema has only `aspect_ratio`, `medias`, `prompt`, `quality`. `--soul-id` returns: `Error: Unknown params: custom_reference_id`. |
| `soul_location` | image | ❌ | Schema has only `aspect_ratio`, `prompt`. No identity param. |
| `soul_cast` | video | ❌ | Schema has only `aspect_ratio`, `budget`, `prompt (object)`. Identity must go inside the structured `prompt` object — schema not exposed by `model get`. Discovery only via error messages. |
| `seedance_2_0`, `cinematic_studio_video_v2`, `kling3_0` | video | ❌ | Use `medias` upload UUIDs or `--image`. No Soul ID. |

For Jay-faithful VIDEO with the trained Soul, the verified workable paths are:
1. **`text2image_soul_v2` → Seedance 2.0** (recommended): generate a Jay still via Soul V2, save URL, then pass to Seedance as `--image`. Seedance reads it as character reference, not first frame. Stage-1 cost is ~$0.003 (0.12 credits), stage-2 cost ~$0.85 (40.5 credits). Total ~$0.85.
2. `soul_cast` for native single-stage video (untested — needs structured-prompt discovery).

**Soul type vs model type:** Souls have a `type` field (e.g. `soul_2`, `soul_cinematic`) shown in `higgsfield soul-id list`. The type indicates which training was used. As of 2026-05-13, both `soul_2`- and `soul_cinematic`-typed Souls accept the `--soul-id` flag against `text2image_soul_v2` when the service is healthy. **Sky-check the model is up first** — see "Higgsfield Soul service health" below.

### Higgsfield Soul service health — pre-flight check

Both `text2image_soul_v2` and `marketing_studio_video` were returning HTTP 500 for sustained windows on 2026-05-13. Before submitting:

```bash
# Cheap health probe (~0.12 credits / $0.003):
higgsfield generate create text2image_soul_v2 \
  --prompt "test portrait, photoreal" \
  --soul-id <known-good-soul-id> \
  --aspect_ratio 1:1 --quality 2k --wait --wait-timeout 2m --json
```

If this 500s, **all Soul-based generation is likely down** — pause and re-check later. Do NOT escalate to higher-cost models (Seedance, MS Video) until the soul check passes.

### Higgsfield refund pattern is INCONSISTENT

Higgsfield auto-refunds *some* failed jobs (~1 in 5 observed). MS Video refunds came back ~5 minutes after submit for 1 of 5 failures on 2026-05-13. The other 4 stayed debited. Do NOT rely on auto-refund — if you suspect a model is broken, escalate via the support ticket template at `output/higgsfield/support-tickets/2026-05-13-ms-video-500-and-credit-debit-bug.md`.

### Seedance 2.0 face moderation rejects REAL Jay photos

Seedance 2.0 has an "IP detected" guard that flags real photos of real people as identity-protected content. Submitting one of the trained real screenshots (`38e8d37c-...` etc.) as `--image` returns `Error: IP detected` even with a benign prompt.

What passes Seedance moderation:
- AI-generated photos of Jay (Flux LoRA output like `jay-suit-studio-serious.png`, upload `fbe5c4b9-...`) — reads as synthetic.
- Other model outputs (e.g. `soul_cinematic` results).

What fails:
- Real screenshots / phone photos of Jay.

**Practical rule:** for Seedance, use AI-generated Jay references only. For real-photo input, switch model.

### Marketing Studio Video avatar API

The `avatars` param on `marketing_studio_video` is NOT a string array. It is an array of objects with this shape:

```json
[{"id": "<avatar_uuid>", "type": "custom"}]
```

CLI invocation:

```bash
higgsfield generate create marketing_studio_video \
  --prompt "..." \
  --avatars '[{"id":"7fc2318f-62c5-41c5-9247-37621e46b3d9","type":"custom"}]' \
  --aspect_ratio 9:16 --duration 9 --resolution 720p --wait
```

Avatar creation requires both `--image <upload_id>` AND `--image-url <cloudfront_url>` (the first call with just `--image` produces a broken empty avatar). Capture the URL from `higgsfield upload create ... --json` (`.url` field) and pass to both flags.

The trained Marketing Studio avatar `jay-real` lives at `jay_marketing_avatar_id` in config (`7fc2318f-62c5-41c5-9247-37621e46b3d9`).

As of 2026-05-13 Marketing Studio Video was returning HTTP 500 even with valid schema — possibly Higgsfield-side flakiness. Retry on a new session before assuming the model is broken.

**UPDATE 2026-05-13 (PM):** MS Video confirmed broken in second session. Both `create` (with `--mode tv_spot`) and `get` return HTTP 500 across all modes (`ugc`, `wild_card`, no-mode). **CRITICAL: MS Video debits credits on submit even when retrieval 500s.** 4 failed attempts cost 180 credits (~$3.78) with no output. Until Higgsfield confirms a fix:
- Do NOT submit to `marketing_studio_video` without first running `higgsfield generate get <recent_job_id>` on someone else's completed MS Video job to confirm the service is back.
- If you must probe, run ONE call only, not parallel probes — each failed call still debits.
- Consider opening a Higgsfield support ticket for credit refund on jobs that 500 on retrieval.

### `higgsfield generate cost` requires `--prompt`

Even though prompt content doesn't affect cost, the API rejects requests without it. Pass `--prompt "cost-estimate"` for pure cost queries.

### Cost API returns credits, not USD

Convert with the rate at the bottom of this file. Plus plan ≈ $0.021/credit. The cost API field is `credits_exact` (float).

## Notes

- All 4 sub-skills live at `.agents/skills/higgsfield-*` (symlinked into `.claude/skills/`). Do not fork; `npx skills update` would clobber.
- CLI: `higgsfield` (aliases: `higgs`, `hf`).
- Config-edit-to-tune: any default (model, duration, ceiling, tokens, fallback photo, timeouts) lives in `.claude/skills/higs/higs-config.json`. Edit there, not in this file.
- Concept seeds: `.claude/skills/higs/references/concept-prompts.md` (15 seeds with topic index).
- Anti-slop comes from `anti_slop_negative` in config. To relax it (e.g. a deliberately smiling testimonial hook), echo the override to the user before submitting.
- Brand defaults are sticky: black tee + serious + cinematic. Override only via explicit flag in `$ARGUMENTS`.

### Credits-to-USD conversion (Plus plan)

| Plan | Rate (USD per credit) |
|---|---|
| Plus | ~$0.0210 |
| Pro | ~$0.0250 |

Observed real costs (from cost API on 9s 9:16 720p):

| Model | Credits | USD (Plus) |
|---|---|---|
| seedance_2_0 | 40.5 | $0.85 |
| marketing_studio_video | TBD | TBD |
| soul_cinema_studio_video_3_0 | TBD | TBD |

Real model IDs (from `higgsfield model list --video --json`):

| Skill alias | Real Higgsfield ID |
|---|---|
| seedance_2_0 | `seedance_2_0` |
| marketing_studio_video | `marketing_studio_video` |
| soul_cinema_studio_video_3_0 | `cinematic_studio_video_v2` (or `cinematic_studio_3_0`) — verify with `model list` |
| kling_3_0 | `kling3_0` |
| seedance_1_5 | `seedance1_5` |

Append a row to the Observed costs table whenever a new model is run. Resolution upgrade (720p → 1080p) typically ~2x credits.
