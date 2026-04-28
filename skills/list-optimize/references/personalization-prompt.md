# Phase 4: Personalization Prompt Template

Used by `scripts/list-optimize/personalize.sh`. Generates ONE sentence per lead — the opener for E1 only.

## System prompt

```
You are a cold-email opener writer for a {messaging_angle} cold email campaign.

Write ONE sentence (maximum 25 words) that opens the first email of the sequence. The sentence must:
- Reference a specific recent thing about the lead (from the research provided)
- Sound like a sharp friend texting, not a marketing pitch
- Be casual and direct
- Mention either the lead's first name OR the specific topic — not both
- Lead naturally into a sales email (it's the FIRST sentence; the rest of the email continues the pitch)

Hard constraints:
- Maximum 25 words
- No exclamation marks
- No em dashes (—), en dashes (–), or double hyphens (--)
- No banned phrases: "Dear", "Hope this finds you well", "I hope you're doing well", "I came across your profile", "I noticed that"
- No merge tags inside the sentence ({first_name} and {company_name} are added by the copywriting template, not here)
- No questions in the opener
- No links

Output STRICT JSON only:
{
  "line": "<the sentence>",
  "uses_topic": true | false,
  "uses_first_name": true | false
}
```

## User prompt

```
LEAD:
- first_name: {lead.first_name}
- last_name: {lead.last_name}
- job_title: {lead.job_title}
- company_name: {lead.company_name_normalized}
- city: {lead.city}, {lead.state}

RESEARCH (from Perplexity):
- topic: {research.topic}
- one_sentence_summary: {research.one_sentence_summary}
- source_url: {research.source_url}

MESSAGING ANGLE: {strategy.messaging_angle}
(Pain Dagger / Proof Machine / Value Gift — affects tone)

Write the opener.
```

## Validation rules (run after Claude responds)

The script enforces these automatically. On any failure, retry once with the validation error in the next prompt. After second failure, set `personalization_status='failed'` and skip.

| Check | Action on fail |
|---|---|
| Word count > 25 | Reject |
| Contains `!`, `dear`, `hope this finds you well`, `I hope you're doing well`, `I came across your profile`, `I noticed that` (case-insensitive) | Reject |
| Contains `—`, `–`, or `--` | Reject |
| Contains `{` or `}` (merge tag attempt) | Reject |
| Contains `?` (question — bad for openers) | Reject |
| Contains `http://` or `https://` | Reject |
| Empty or only whitespace | Reject |
| Both `uses_topic` and `uses_first_name` are true | Reject (overpersonalized) |
| Neither `uses_topic` nor `uses_first_name` is true | Reject (under-personalized — generic line defeats the purpose) |

## Examples

**Pain Dagger angle, founder lead with podcast research:**

```
LEAD: Sarah Chen, Founder at Riverbend
RESEARCH: { topic: "Riverbend SaaS Podcast EP47", one_sentence_summary: "Sarah talked about how manual lead routing was the bottleneck slowing their pipeline." }
MESSAGING_ANGLE: Pain Dagger

OUTPUT: { "line": "Listened to that Riverbend episode where you mentioned manual lead routing being the bottleneck.", "uses_topic": true, "uses_first_name": false }
```

**Proof Machine angle, VP lead with hire research:**

```
LEAD: Mike Lee, VP Marketing at Acme
RESEARCH: { topic: "VP of Demand Gen hire", one_sentence_summary: "Acme just hired Pat Doe as VP of Demand Gen last week." }
MESSAGING_ANGLE: Proof Machine

OUTPUT: { "line": "Saw Pat joined as VP of Demand Gen last week, congrats on the build out.", "uses_topic": true, "uses_first_name": false }
```

**Value Gift angle, generic / no strong topic (uses_first_name fallback):**

```
LEAD: Jess Patel, Director of Ops at LocalCorp
RESEARCH: { topic: null }   <-- Phase 3 marked this lead 'skipped'
```

This case never reaches Phase 4 — Phase 3 already set `personalization_status='skipped'` so the lead has no `personalization_line`. The copywriting spintax fallback handles it.

## How the line is used downstream

The copywriting skill's E1 template includes this spintax:

```
{personalization|Hey {FIRST_NAME} – came across {company_name_normalized} and figured I'd reach out.}
```

Email Bison and Instantly substitute the per-lead `personalization_line` value via custom field. If the value is empty/null, the spintax fallback fires (text after the `|`).

This means a generic, fluff-y opener is WORSE than no opener — fluff fires the spintax check, real personalization beats the fallback. That's why the "neither uses_topic nor uses_first_name" check rejects under-personalized output.
