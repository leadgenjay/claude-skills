# Aimfox API v2, as observed

Recorded 2026-10-03 against a live workspace (one LinkedIn account, four campaigns) with read-only
calls. Base `https://api.aimfox.com/api/v2`, header `Authorization: Bearer <key>`. Every body is
wrapped as `{status: "ok", <name>: ...}`.

Write calls (adding to an audience, custom variables, blacklist, delete) were NOT exercised here.
Their shapes come from the official docs (see "Write endpoints" below) and are marked "Documented,
not yet exercised live" in `scripts/lib/aimfox.mjs`.

The API was slow on the day: 3 of about 25 calls hung past 30 to 120 seconds, including endpoints
that answered in under a second at other times. Treat a timeout as "try again later", never as an
answer.

## GET /accounts

`{status, accounts: [...]}`. Account fields: `id` (numeric string), `full_name`, `first_name`,
`last_name`, `public_identifier`, `urn`, `state` (`LoggedIn` | `LoggedOut`), `premium`,
`sales_navigator`, `disabled`, `license`, `subscription_id`, `type`, `workspace_id`, `picture_url`,
`occupation`.

`LoggedOut` means the LinkedIn session dropped. Nothing sends until the account is reconnected in
the Aimfox app, and any `ACTIVE` campaign resumes sending the moment it is.

## GET /campaigns and GET /campaigns/:id

List: `{status, campaigns: [...]}` with `id`, `name`, `state`, `type` (`list` | `navigator`),
`outreach_type` (`connect`), `target_count`, `start_date`, `labels`, `owners`,
`uses_connection_note`, `created_at` (ms epoch).

One: `{status, campaign: {...}}`, the list fields plus `schedule`, `audience_size`, `completion`,
`custom_variable_keys`, `inmail_optimization`, `exclude_active_targets`,
`exclude_previous_targets`, `no_pfp`, `crm_type`, `autolabel_ids`, `flows`.

- **`state`** seen: `CREATED` (built, never started), `ACTIVE` (running), `DONE` (finished). There
  is no `updated_at` field, so a change to the campaign is detected by hashing `flows`.
  `PAUSED` and `STARTED` were NOT observed; the client maps them (to paused and running) defensively.
- **`flows`** carry the step text. Each flow: `{id, type, name, template, flow_message_templates,
  withdraw_delay, endorse_enabled, like_enabled, ...}`.
  - `type: "PRIMARY_CONNECT"` is the connection request. `template` is `null` for a blank
    invite, or `{type: "NOTE_TEMPLATE", message: "<note text>"}` when a note is set.
    `flow_message_templates` are the messages sent after acceptance, in order:
    `{type: "MESSAGE_TEMPLATE", message, delay, attachments}`.
  - `type: "INMAIL_OPTIMIZATION"` and `"CONNECT_OPTIMIZATION"` are always present. The InMail
    one can hold its own note and is used only when `campaign.inmail_optimization` is true.
- **Variables** render as `{{FIRST_NAME}}`, `{{FIRST_NAME?fallback}}`, and custom ones as
  `{{CUSTOM.NAME}}`. `custom_variable_keys` lists them as `[{name: "AUTHOR", value:
  "{{CUSTOM.AUTHOR}}"}]`. Spintax is `{SPIN}a|b{ENDSPIN}`.
- No stop-on-reply setting appears in the object. In practice a lead who replied shows audience
  state `done` (6 of 6 replies and 4 of 4 InMail replies checked).

## GET /campaigns/:id/audience

`{status, audience: [...]}`, the WHOLE audience in one response (4,346 entries, about 8 seconds).
`offset`, `limit` and `page` are ignored. Entry: `id` (numeric lead id), `urn` (`ACoAA...`),
`public_identifier`, `full_name`, `occupation`, `company`, `location {name, urn}`, `picture_url`,
`state`, sometimes `owner`.

Entry `state` is the lead's current step: `init` (not started), `view`, `like`, `endorse`
(warm-up steps), `message` (accepted, in the message sequence), `inmail`, `withdraw` (invite
withdrawn), `cancelled`, `done` (sequence over, including every lead who replied). Of 8 accepts
checked, 6 sat in `message` and 2 in `endorse`, so `endorse` does not mean "not yet accepted".
Whether a lead who never accepted can reach `done` is unknown; sync marks a `done` lead's welcome
as sent on the assumption that it cannot.

## GET /campaigns/:id/metrics

`{status, metrics: {sent_connections, accepted_connections, sent_messages, replies,
inmail_replies, sent_inmails, message_requests, sent_endorsements, views, sent_likes}}`. Totals
only.

## GET /analytics/interactions

`{status, buckets: [{timestamp (ms), sent_connections, accepted_connections, sent_messages,
replies, ...}], count}`. Hourly totals across the workspace. **Not per lead**, so it cannot drive
sync.

## GET /analytics/recent-leads

`{status, leads: [{timestamp, campaign_id, campaign_name, target_urn, target_id, transition
(accepted | reply | inmail_reply), target {urn, full_name}}]}`. Returned 18 events, all from
June 2026, and ignored `limit`, `count`, `campaign_id`, `from`, `days` and `page`. Not usable for
sync.

## POST /leads:search, GET /leads/:id

Search returns `{status, leads: [...]}`, 10 at a time, and ignored `limit`, `count`, `page`,
`offset` and `campaign_ids` in the body (the real paging names are not known). Lead fields:
`id`, `urn`, `public_identifier`, `full_name`, `labels`, `is_lead`, `lead_of`, `origins`.
`POST /leads:search/total` returns `{total_leads, sync, accounts_sync}`; GET on it is a 404.

`GET /leads/:id` (the audience entry's `id`) returns `{status, lead: {...}}` with the full profile
and `labels`.

## GET /blacklist, GET /webhooks

`{status, profiles: []}` and `{status, webhooks: []}` on this workspace.

## Write endpoints (from the official docs)

Extracted from docs.aimfox.com on 2026-10-03. Audience writes below were not exercised by the read-only probe. Campaign creation and private-flow shapes are supplied by the 2026-10-03 brief; the new command is not live verified by its offline tests.

- **POST /campaigns/:id/audience/multiple** (what push uses). Body `{type: "profile_url", profiles:
  [{profile_url, custom_variables: {name: value}}]}`. Answer `{status, profiles: [{id, urn,
  public_identifier, state, ...}], failed: [{profile_url, custom_variables}], failedReason:
  {<public id>: code}}`. Allowed while the campaign is `ACTIVE`, `PAUSED`, `DONE` or `CREATED`.
- **POST /campaigns/:id/audience** (single add, not used). Body `{profile_url}`. A refusal is HTTP
  400 `{status: "fail", error: {message, data: <code>}}`. Codes: `blocked` (target is blocked),
  `locked` (in another campaign), `miningFailed` (not found), `noPFP` (no profile picture),
  `alreadyConnected` (already a lead), `notLead`, `closed` (cannot receive free InMails). Push
  reads the same codes from `failedReason`: `alreadyConnected` → rejected, `locked` → left
  approved to retry, `blocked` → do-not-contact, anything else → push_failed.
- **POST /campaigns/:id/custom-variables**. Body `{custom_variables: [{target_urn, variables:
  {NAME: value}}]}`. Not used: the variables ride along on the audience add.
- **GET /campaigns/:id/custom-variables/:urn**. `{status, custom_variable_keys: [...],
  custom_variables: {target_urn, variables: {NAME: value}}}`. Push reads `variables` back and
  matches the welcome's name case-insensitively (the docs show `CUSTOM_MESSAGE` and `first name`).
- **DELETE /campaigns/:id/audience/:urn**. The last part is the urn OR the public identifier.
- **POST /blacklist/:urn** (no body), or **POST /blacklist** `{urls: [profile url]}`.
- **POST /campaigns** creates the shell. The supplied live observation requires `name`,
  `type: "list"`, `outreach_type: "connect"`, `account_ids: [account.id]`, and numeric
  `audience_size` (the command uses 1000), plus `uses_connection_note: false`,
  `inmail_optimization: false`, `exclude_active_targets: true`, and
  `exclude_previous_targets: true`. Response: `{status, campaign: {id, state: "INIT", ...}}`.
  Its PRIMARY_CONNECT note is initially null and message list empty. Public v2 does not
  configure those steps; the command uses the private endpoints below.
- **PATCH /campaigns/:id** takes `state: ACTIVE | PAUSED`. This skill never calls it: the user
  presses Start in Aimfox by hand, deliberately.


## Private v1 endpoints (undocumented)

Base: `https://api.aimfox.com/api/v1/workspaces/<workspace_id>`. The workspace comes from the
selected account in `GET /v2/accounts`, and existing campaigns must belong to that account.
The supplied brief records these routes from Aimfox's web app code on 2026-10-03. That is
protocol provenance, not live verification of this command. Private endpoints can change.

| Operation | Method and path after the workspace base | Request shape | Evidence and effects |
|---|---|---|---|
| Read flow | `GET campaigns/<cid>/flows/<flowId>` | No body | Supplied observation: API key accepted for reads. No mutation. |
| Clear note | `PATCH campaigns/<cid>/flows/<flowId>` | `{template: null}` | Web app source; removes the connection note. |
| Append message | `POST campaigns/<cid>/flows/<flowId>/messages` | `{type: "MESSAGE_TEMPLATE", message, delay}` | Web app source; appends one step. API-key write returned 401 in the supplied observation. |
| Replace message | `PATCH campaigns/<cid>/flows/<flowId>/messages/<n>` | `{type: "MESSAGE_TEMPLATE", message, delay}` | Web app source; edits the indexed step. |
| Remove final message | `DELETE campaigns/<cid>/flows/<flowId>/messages` | No body | Web app source; deletes the last step, one call at a time. |

Writes require `Authorization: Bearer <session token>`. First the command calls public
`POST /v2/token` with the API key and exactly `{}`. It never sends `account_id`: that optional
field can re-login a LinkedIn account. The documented login token response is `{token}`.
Observed live 2026-10-03: the route answers HTTP 200 `{status: "OK", token}` (capital `OK`,
unlike the rest of v2), but the private read-only flow probe rejects that token with 401, so
in practice the session token must come from `AIMFOX_SESSION`. If generation fails
or its token receives 401/403 from a read-only private-flow authentication probe, the command can use `AIMFOX_SESSION`. The user supplies that fallback from the Aimfox web
app's localStorage `auth` value through their private environment, never through chat. The
CLI itself never opens a browser. Generated tokens stay in memory and are never printed or
written to disk. A timed-out probe or an unexpected response refuses without flow writes;
a rejected flow write stops immediately instead of trying another token. A new shell may
already exist when its flow probe fails, so inspect the reported campaign id before retrying.
The implemented repair avoids the unconfirmed message-index convention: if the first message
is wrong, it removes messages from the end and appends the exact replacement.

The configured primary flow has `template: null` and exactly one message whose complete text
is `{{CUSTOM.welcome_message}}`, type `MESSAGE_TEMPLATE`, delay `1`. Delay units are unconfirmed;
`1` is the value requested in the brief, not a verified number of hours or days. Extra messages
are removed from the end. An existing campaign with InMail optimization or other incompatible
flows must be fixed manually if the final checks refuse it: no campaign-state/settings PATCH
is used to bypass those checks.

The final public `GET /v2/campaigns/<cid>` must pass `campaignFacts()` before success. A 2xx
write or saved shell alone is insufficient. No audience, sending, campaign activation,
billing, invitation, account creation, or permanent campaign deletion is part of this CLI.
No per-call price or balance has been measured; authoring must not be described as a measured
zero-cost live operation.
