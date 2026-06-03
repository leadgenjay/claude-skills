# Sequence Templates

Email-by-email templates for each sequence type. Each template provides the purpose, timing, tone, and structural guidance for every email in the sequence.

---

## Nurture Sequence (Welcome/General)

**Length:** 7 emails over 14 days
**Trigger:** New subscriber joins list (website signup, lead magnet, or migrated from GHL)
**Goal:** Build trust, demonstrate value, introduce relevant offer
**Segment:** General (route to AIA or Insiders based on engagement)

| # | Day | Purpose | Tone | Value:Sales |
|---|-----|---------|------|-------------|
| 1 | 0 | Welcome + set expectations | Warm, personal | 100:0 |
| 2 | 1 | Quick win (actionable tip) | Teaching | 100:0 |
| 3 | 3 | Personal story + lesson | Storytelling | 90:10 |
| 4 | 5 | Deep dive on key topic | Expert teaching | 100:0 |
| 5 | 7 | Social proof + results | Proof-heavy | 80:20 |
| 6 | 10 | Overcome #1 objection | Empathetic, direct | 70:30 |
| 7 | 14 | Soft offer introduction | Confident, helpful | 60:40 |

### Email 1: Welcome + Set Expectations
**Purpose:** Make a strong first impression. Tell them who you are, what to expect, and deliver immediate value.

Structure:
- Open with direct acknowledgment: "You're in."
- 1-2 sentences on who you are (authority without bragging)
- What they'll get from these emails (specific value, not vague promises)
- One immediately useful tip or insight
- Set frequency expectations
- Sign off casually

**Length:** 150-200 words
**CTA:** None (or soft: "Hit reply and tell me your biggest challenge with [topic]")

### Email 2: Quick Win
**Purpose:** Deliver one actionable thing they can do today. Establish you as someone who gives real, usable advice.

Structure:
- Hook: Problem they're likely facing right now
- The quick fix (3-5 steps max)
- Why this works (brief explanation)
- What to do after they implement

**Length:** 200-300 words
**CTA:** "Try this today and hit reply with your results"

### Email 3: Personal Story
**Purpose:** Build relatability and trust through a real experience.

Structure:
- Open with a vivid scene (no "let me tell you a story")
- 2-3 paragraphs of story (specific details: ages, names, dollar amounts)
- The lesson/turning point
- Bridge to how this applies to them
- Tie to the topic of the sequence

**Length:** 300-500 words
**Story Bank:** Choose from references/story-bank.md based on sequence topic
**CTA:** Soft — link to relevant content or "More on this tomorrow"

### Email 4: Deep Dive
**Purpose:** Provide substantial value on the core topic. Position yourself as the expert.

Structure:
- Hook: Counterintuitive insight or common mistake
- The problem with the conventional approach
- Your framework/method (3-5 steps)
- Specific example with numbers
- What most people miss

**Length:** 300-400 words
**CTA:** "Want the full breakdown? [link to YouTube video or resource]"

### Email 5: Social Proof
**Purpose:** Show that this works for real people, not just you.

Structure:
- Open with a specific result: "Daniel went from 2 clients to 18 in 6 months."
- Brief context on who they are (relatable to subscriber)
- What they did (high level)
- The result (specific numbers)
- 1-2 more quick proof points
- Bridge: "This isn't luck. It's a system."

**Length:** 200-300 words
**CTA:** "Want to see more results? [link to case studies page]"

### Email 6: Overcome Objection
**Purpose:** Address the biggest reason people don't take action.

Structure:
- Name the objection directly: "I know what you're thinking..."
- Validate it: "I get it. I thought the same thing."
- Dismantle it with logic/proof
- Reframe the risk of NOT acting
- Brief mention of safety nets (guarantee, support)

**Length:** 250-350 words
**CTA:** Subtle mention of offer without hard sell

### Email 7: Soft Offer
**Purpose:** Introduce the paid offer as a natural next step, not a pitch.

Structure:
- Recap what they've learned in the sequence
- Frame the gap: "You now know X, but doing it yourself takes Y months"
- Introduce the offer as the shortcut
- Key benefits (3 max)
- Social proof (1 testimonial)
- Clear CTA with risk reversal
- P.S. with urgency or bonus

**Length:** 300-400 words
**CTA:** Primary offer CTA with guarantee mention

---

## Welcome / Intro Sequence (LGI 5-email model)

**Length:** 5 emails (daily or daily+1 cadence)
**Trigger:** New subscriber enters the LGI list (lead magnet opt-in, website signup, list migration)
**Goal:** Establish credibility + voice → seed the "3 secrets" arc → make first offer (Insiders) in E5
**Segment:** Lead Gen Insiders (general top-of-funnel — not post-purchase, not post-call)
**Live reference:** Kit `LG Nurture` sequence id `2764181` (locked 2026-05-24)

This is the **default Jay welcome architecture** for any new top-of-funnel intro sequence. See [[feedback_jay_welcome_email_pattern]] for the full pattern lock and [[feedback_kit_greeting_merge_tag_pattern]] for the greeting Liquid wrap.

### Beat-by-beat

| # | Hook type | Body purpose | CTA | Sign-off | Sales slope |
|---|---|---|---|---|---|
| E1 (WHO AM I) | Warm greeting + immediate positioning | Credibility intro, HUGE NERD personality flex, what to expect from these emails | Hit-reply ("tell me what you're working on") | `Your friend, -Jay` | 1/10 |
| E2 (WHY OTHERS ARE WRONG) | Quoted bad-actor cold-open ("Hey bro we did $2M last month") | Anti-guru disarm, humility flex, tease "3 secrets", signal multi-email drip | PS: Skool community free join | `Stay tuned friend, -Jay` + inline tease | 2/10 |
| E3 (SECRET 1 — Tech Stack) | False-binary identity callback ("Vegas or new software... I'm at the battle station") | Categorical tool list (3 sections × 3-4 items), exclusivity hook ("deals not public") | PS: software vault link | `Until next time my friend, -Jay` + inline tease ("LEAD GEN!") | 4/10 |
| E4 (SECRET 1.5 — Lead Gen Recipe) | Step-by-step setup | 5-step cold-email recipe (Action Recipe list format) + Otter PR case study + cost flex (<$300/mo) | PS: free video lead magnet — **no inline tease** | `Your friend in scaling, -Jay` | 3/10 |
| E5 (SECRET 2 — Offers Framework) | Question-form callback ("Do you remember when I said there were 3 secrets?") | 3 conceptual frameworks (Loss Leaders / Trojan Horse / Reverse Lead Magnets) with brand examples + Insiders value-prop (1-1 coaching, group coaching) | **Body hard CTA** to Insiders + PS: free Reverse Lead Magnet generator | `Your friend, -Jay` (no inline tease) | 7/10 |

### Cross-cutting rules (locked across all 5 emails)

- **Length:** 180-250 words per email
- **Greeting slot:** Kit Liquid conditional wrap (`{% if subscriber.first_name != blank %}<GREETING> {{ subscriber.first_name }},{% else %}<GREETING>,{% endif %}`)
- **Anti-guru beat:** present in every email (intensity varies)
- **Specific-number receipts:** every email carries at least one (credibility, cost, or tactical outcome)
- **CAPS for emphasis:** 1-3 key words per email, never full sentences
- **Closer phrase:** always contains "friend" — name line always `-Jay`
- **PS escalation:** community → soft perk → free lead magnet → free tool. Hard CTA moves to body in E5, not PS.
- **Tease arc:** E2-E3 have inline next-email teases; E4-E5 drop them. The drop = sales climax signal.
- **Callbacks:** implicit identity reuse mid-sequence (E3 "battle station" callback to E1); explicit position markers at climax (E5 "remember when I said there were 3 secrets?")
- **Profanity:** raw OK (`shit`, `FULL OF SHIT`) — Kit plain-text welcome mode overrides asterisking
- **Char encoding:** ASCII straight `'` `"` only (per [[feedback_write_tool_curly_char_normalization]])

### Three list formats (pick per email)

- **Categorical** (E3 tech stack): bare category header × 3-4 items with 1-line descriptions
- **Action Recipe** (E4 cold email): action-verb-start steps with tool name + outcome (5 steps typical)
- **Conceptual Frameworks** (E5 offers): numbered 1-3 items, title → theory → concrete example

### Key rules

- Daily or daily+1 cadence (matches "Over the next few days" framing)
- E1 NEVER includes hard sell — hit-reply only
- E5 carries the first explicit Insiders body CTA; nothing earlier
- If extending to 6+ emails, continue the "secrets" arc (SECRET 3, etc.) and maintain the friend-anchored sign-offs throughout

---

## AIA Welcome / Intro Sequence (5-email AI-side model, locked 2026-05-25)

Anchor product: AI Automation Insiders. Live in Kit sequence id `2764214` at positions 0-4. Source: Jay-authored `~/Downloads/LGJ Email Sequences v2 (2).md`. Differs from the LGI Welcome model (lead-gen-focused, 5-secrets arc) by being **tool-stack + identity-anchored**: each email pegs Jay's positioning to a specific tool/stack era.

### Beat-by-beat

| # | Subject lock | Hook beat | Core lesson | CTA | Closer (peer-energy variant) |
|---|---|---|---|---|---|
| E1 | `Welcome to the AI Insiders (Jay here)` | "Whats up NAME / It's your friend Jay here - Welcome to the AI Insiders" | Build progression (Otter PR/Zapier 2020 → LGJ/n8n+Instantly → Consulti/Claude Code 6mo). "I LOVE BUILDING but I love helping my friends build cool shit MORE." | PS: free Claude Code for Non-Coders YT + `/value/ai-resources` (UTM `aia-nurture-welcome`) | `Your friend in AI, -Jay` |
| E2 | `The 2 tools you actually need (Claude Code + n8n)` | "The AI-winners are in, and there are two tools..." | Claude Code (workhorse) + n8n (automator). "Claude Code is SO GOOD at n8n it will do the heavy lifting." | Free `/skills` + n8n templates link + YT explainer. NO sales CTA (this is the value email) | `You are welcome my friend, -Jay` |
| E3 | `Do you HAVE to learn Claude Code?` | "NAME, let me tell you a story." | Zapier (2016) → Make.com (2021, 4X) → n8n (2025, 2X) → Claude Code (late 2025) personal evolution. "Do the work others are TOO LAZY to do, you will win this AI race." | `/aia` (UTM `aia-nurture-learning-curve`) | `Telling you this because I care about you. -Jay` (personal-care flex) |
| E4 | `Meet Bob (the AI that runs my business)` | "Hello NAME, I'd like to introduce you to Bob." | OpenClaw teardown ("kind of sucked") → Mac mini + Claude Code Channels = the winner. Skills + context windows + Claude Max subscription advantage. | `/channels` (UTM `aia-nurture-meet-bob`). PS: Viktor for teams (affiliate, NO UTM per [[project_viktor_brand]]) | `Your friend in AI, -Jay` |
| E5 | `I built my own supercomputer (I named him Zeus)` | "NAME, how deep are you in the AI rabbithole? / If you're like me and AI keeps you awake at night..." | $8500 → $20K self-built Supercomputer. OSS replacements (Active Campaign→Listmonk, Vercel→Coolify, Notion→AppFlowy, Dropbox→NextCloud). 24/7 workflows for $0. **WARNING - advanced, overkill for 95%.** | `/aia` (UTM `aia-nurture-zeus`) + Zeus YT video link | `Later fellow nerd, -Jay` (nerd-bonding flex) |

### Cadence

`0d → 1d → 2d → 2d → 3d` (total 8 days, mirrors the LGI Welcome rhythm). Slower than typical welcome arcs — each lesson needs a day to breathe because the concepts compound (E2's tool-stack is the prerequisite for E3's learning curve, which is the prerequisite for E4's Bob payoff, which is the prerequisite for E5's Zeus advanced flex).

### Cross-cutting rules (locked across all 5 emails)

1. **Greeting Liquid wrap (every email):** `{% if subscriber.first_name != blank %}<GREETING> {{ subscriber.first_name }},{% else %}<GREETING>,{% endif %}` — per [[feedback_kit_greeting_merge_tag_pattern]]. Greeting wording rotates: "Whats up", "Howdy", "Hello", "let me tell you a story", "how deep are you in the AI rabbithole".
2. **ASCII straight chars only** — no curly quotes, no `…` ellipsis (use `...`), no em/en dashes. Per [[feedback_write_tool_curly_char_normalization]].
3. **Tool-stack identity anchoring** — every email name-checks specific tools by era (Zapier 2020, n8n+Instantly 2024-25, Claude Code 2025+). The tool names ARE the credibility. Don't abstract.
4. **Self-flex via failure** — E1 mentions Otter PR (Inc 5000) but also Consulti AI's 6-month build. E4 opens by admitting Jay was wrong about OpenClaw. Vulnerability+specificity beats abstract authority.
5. **One product PS** in 3 of 5 emails (E1 owned-domain free resources, E4 Viktor affiliate, E5 Zeus YT) — never empty PS, never sales PS that competes with the body CTA.
6. **Peer-energy closer (lock relaxed 2026-05-25):** Any of three classes — friend / fellow nerd / personal-care. Name line `-Jay` always.

### Distinguish from LGI Welcome and LG Nurture

| Dimension | LGI Welcome (locked May 2026) | LG Nurture | AIA Welcome (this template) |
|---|---|---|---|
| Primary anchor | Lead-gen tactics + 5-secrets arc | Storytelling (diarrhea, From 2 clients to 18, etc.) | Tool-stack + Jay's identity by era |
| Cadence | 0d → 1d → 2d → 2d → 3d (locked) | Mixed | 0d → 1d → 2d → 2d → 3d (mirrors LGI) |
| Closer class | Friend (locked, single class) | Friend or `- Jay` for non-welcome | Friend / fellow nerd / personal-care (relaxed) |
| Sales slope | 1 → 2 → 4 → 3 → 7 | Soft throughout | Soft → Free (E2) → Soft AIA (E3) → Soft (E4) → Soft AIA (E5) |
| Word count | 180-250 / email | 200-500 | 180-300 / email |
| Free resources | E2 (lead-magnet-style) | Rare | E1 PS + E2 body + E5 YT (heavier) |

### Key rules

- E1 ends with a domain-flex closer (`Your friend in AI`) + PS to free training — establishes peer rapport before any sales
- E2 is the only email with NO sales CTA — all-value to earn permission for E3
- E3 is the first hard /aia pitch — uses personal evolution story, not stats, as proof
- E4 is the deepest tech email — Bob = use case, not product. Real product (Claude Code) sells itself
- E5 is the most polarizing — explicitly says "overkill for 95% of you" to filter for the buyer Jay actually wants (high-nerd advanced)

---

## Blast Email Templates (3/week)

**Frequency:** Monday, Wednesday, Friday (or Tuesday, Thursday, Saturday)
**Goal:** Mix of value and sales — 80/20 ratio means ~4 value blasts per 1 sales blast
**Segment:** Entire active list (or segment-specific)

### Value Blast Types

#### Type A: The Tip
One tactical tip they can implement immediately.

Structure:
- Hook subject line with specific outcome
- 1-2 sentence context
- The tip (3-5 bullet points or short paragraphs)
- Why it works
- CTA: link to related content

**Length:** 150-250 words

#### Type B: The Story Blast
Short personal story with a business lesson.

Structure:
- Open mid-scene (no preamble)
- 2-3 paragraphs of story
- The lesson
- How it applies to them
- CTA: "Reply with your take" or link to content

**Length:** 200-350 words

#### Type C: The Contrarian Take
Challenge a popular belief in the industry.

Structure:
- Bold opening: "Everyone says X. They're wrong."
- Why the conventional wisdom is flawed
- What actually works (backed by your experience/data)
- The shift they need to make
- CTA: link to deeper content

**Length:** 200-300 words

#### Type D: The Proof Drop
Share a recent result or case study.

Structure:
- Lead with the number: "$635,000 in pipeline from cold email."
- Brief context (who, industry, timeline)
- What made it work (2-3 key factors)
- The takeaway for them
- CTA: "Want this for your business?"

**Length:** 150-250 words

### Sales Blast (1 in 5)

Structure:
- Problem hook (PAS framework)
- Agitate: cost of staying stuck
- Solution: the offer
- 3 key benefits
- Proof: 1 testimonial or stat
- CTA: clear action
- P.S.: urgency or bonus

**Length:** 250-400 words

---

## Onboarding Sequence

**Length:** 5 emails over 7 days
**Trigger:** New customer purchase (any product)
**Goal:** Reduce buyer's remorse, drive product usage, set up for upsell
**Tone:** Warm, supportive, action-oriented

| # | Day | Purpose | Focus |
|---|-----|---------|-------|
| 1 | 0 | Welcome + access | Get them started immediately |
| 2 | 1 | Quick start guide | First action to take |
| 3 | 3 | Check-in + common question | Remove friction |
| 4 | 5 | Success story + advanced tip | Inspire continued usage |
| 5 | 7 | Community invite + next steps | Deepen engagement |

### Key Rules
- Never sell in onboarding — focus entirely on activation
- Assume they have buyer's remorse on day 1 — reassure them
- Each email should drive one specific action
- Keep emails short (100-250 words)
- Use "you made a great decision" language early

---

## Win-Back Sequence

**Length:** 4 emails over 14 days
**Trigger:** 30+ days of no email opens
**Goal:** Re-engage or clean list
**Tone:** Casual, genuine, no guilt-tripping

| # | Day | Purpose | Tone |
|---|-----|---------|------|
| 1 | 0 | Casual check-in | Friendly, light |
| 2 | 3 | Value reminder | Generous, helpful |
| 3 | 7 | Exclusive offer | Direct, valuable |
| 4 | 14 | Last chance / list cleanup | Honest, no hard feelings |

### Email 1: Check-In
"Hey — noticed you've been quiet. Just checking in."
- No guilt, no pressure
- Ask if they're still interested in [topic]
- One-click "Yes, keep me on the list" link

### Email 2: Value Reminder
- Share the best-performing content from the past month
- "In case you missed this..." format
- Make them feel like they're missing out on value, not sales

### Email 3: Exclusive Offer
- Something only for email subscribers
- Could be: early access, discount, free resource
- Create genuine exclusivity

### Email 4: List Cleanup
- "I'm cleaning up my list."
- "Click here to stay, or I'll remove you in 48 hours."
- "No hard feelings either way."
- Actually remove non-responders after 48 hours

---

## Launch Sequence

**Length:** 7 emails over 10 days
**Trigger:** New product or offer launch
**Goal:** Build anticipation, drive sales
**Tone:** Builds from curiosity to excitement to urgency

| # | Day | Purpose | Tone |
|---|-----|---------|------|
| 1 | 1 | Tease | Curiosity, subtle |
| 2 | 3 | Problem amplification | Empathetic, urgent |
| 3 | 5 | Solution reveal | Excited, authoritative |
| 4 | 6 | Social proof | Confident, proof-heavy |
| 5 | 7 | Objection handling | Understanding, direct |
| 6 | 8 | Cart open | Energetic, clear |
| 7 | 10 | Last chance | Urgent, final |

### Tone Progression
- Days 1-3: Educational, building awareness of the problem
- Days 5-6: Shifting to your solution, building excitement
- Days 7-8: Direct sales mode with proof
- Day 10: Urgency and scarcity (must be real)

### Key Rules
- Never fake scarcity or urgency
- Each email should stand alone (people miss emails)
- Cart open email gets the most sales — make it the strongest
- Last chance email gets second most — make urgency real
- Include an "unsubscribe from this launch" option

---

## Abandoned Cart / Cart-Recovery Sequence

**Length:** 3 emails over 3 days
**Trigger:** Opt-in without checkout completion (tag added on opt-in, e.g. the GHL `ltf interest` tag). Exit the subscriber on purchase. Build on whatever platform owns the funnel - for the $97 cold email offer that is **GHL** (opt-in tag + purchase exit are both GHL-native, sibling to the onboarding workflow), not Kit. Reference build: `agent-harness/builders/cold-email-setup-abandoned-cart-builder.py`.
**Goal:** Recover the sale back to the original checkout; route holdouts to a downsell at the end.
**Tone:** Warm, friendly, self-deprecating honesty. Never desperate. Reference impl: `$97 Cold Email Setup` abandoned cart (Jay-authored, locked 2026-06-01) — `docs/email-sequences/cold-email-setup-abandonment/`.

| # | Day | Close psychology | Tone |
|---|-----|------------------|------|
| 1 | 1 hr | Permission / blame-the-tech hook | Playful, warm |
| 2 | Day 1 | "Too good to be true" reveal | Honest, conspiratorial |
| 3 | Day 3 | Takeaway close + downsell ladder | Casual, no-pressure |

### Email 1: Permission Hook (1 hr)
- Open with a face-saving, humorous reason they didn't finish ("Is your computer ok? You must be having issues, or you'd have finished"). Removes buyer shame.
- Honest scarcity: frame the offer as a test you're not sure will last ("worried it devalues my other products").
- Value-stack flex: rattle off everything included, then undercut it ("it's madness").
- CTA back to the original checkout, with the first name inline ("finish what you started, NAME").
- PS = eligibility / qualifier (e.g. geo: US, CA, UK, AU).

### Email 2: Too-Good-To-Be-True Reveal (Day 1)
- Agree with their skepticism, then name the catch yourself before they can.
- "Selling the shovels" honesty: the cheap front-end is a loss leader; they'll also need the recurring tools (mailboxes, sending platform, lead data) that you provide. Reframe as win-win (they get the buildout cheap, you earn a long-term customer).
- Credibility anchor ("systems perfected over 10 years").
- Micro-close: "Sound fair, NAME?" then the checkout link.
- PS = the guarantee (e.g. 30 leads in 30 days or you don't pay). Hold the guarantee until here.

### Email 3: Takeaway + Downsell Ladder (Day 3)
- Takeaway close: the front-end offer is going away ("bad news, we're ending it"). Scarcity must be plausible.
- Downsell ladder, cheapest-commitment first: infrastructure (mailboxes) -> lead data -> full done-for-you ("see if you qualify"). For LGJ that is inboxinsiders.io -> consulti.ai -> leadgenjay.com/machine.
- Graceful exit + set up the next sequence ("next email is pure value") + offer the unsub.

### Key Rules
- **Sign-off `Your friend, -Jay`** (warm welcome-class) on every email — NOT the formal `Jay Feldman, Lead Gen Jay`. Cart recovery is the exception to the sales sign-off rule.
- Use the first name inline as direct address 2-3x per email (greeting + mid-body + close), not just the greeting. Merge-tag by platform: Kit = `{{ subscriber.first_name | default: "friend" }}`; GHL = bare `{{contact.first_name}}` (GHL has NO fallback - these contacts opt in via a form so a name is expected, but keep vocatives from breaking if blank).
- Keep each email under ~220 words.
- Guarantee appears in E2 PS; the hard downsell appears only in E3.
- Every CTA links back to the original checkout (E1, E2); E3 links to the downsell rungs.
- Takeaway scarcity in E3 must be believable, not a fake countdown.

---

## Re-Engagement Sequence

**Length:** 3 emails over 10 days
**Trigger:** Subscribers who haven't clicked in 60+ days (but still opening)
**Goal:** Drive clicks and deeper engagement
**Tone:** Value-forward, direct

| # | Day | Purpose |
|---|-----|---------|
| 1 | 0 | Best content roundup |
| 2 | 4 | Interactive ask (reply/poll) |
| 3 | 10 | Personalized recommendation |

### Email 1: Best Content Roundup
- "Here's what you missed this month"
- 3 links to best content pieces
- Brief description of each (1 sentence)

### Email 2: Interactive Ask
- "Quick question — what's your biggest challenge with [topic]?"
- Give 3 options matching content pillars
- Or: "Hit reply and tell me"
- Drives engagement signals

### Email 3: Personalized Recommendation
- Based on their original entry point/segment
- "Based on [how they joined], I think you'd love this..."
- Direct to most relevant offer or content

---

## Sequence Transition Logic

After any sequence ends, route subscribers based on behavior:

| Behavior | Next Action |
|----------|-------------|
| Clicked offer link | Move to sales follow-up (3 emails) |
| Opened but didn't click | Continue nurture with more value |
| Purchased | Move to onboarding sequence |
| No opens (30+ days) | Move to win-back sequence |
| Unsubscribed from launch | Keep on regular blast list (not launch) |
| Clicked "stay on list" in win-back | Reset engagement, back to regular blasts |
| No response to win-back | Remove from list |
