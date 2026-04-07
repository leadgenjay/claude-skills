---
name: cold-email-strategy
description: "Cold email strategy development: discovery interview, ICP profiling, offer positioning, and messaging angles. Explicitly ingests transcripts (Fathom/Otter), Google Docs, sales recordings, slide decks, competitor research, and existing copy to build strategy. Use when creating a new campaign, building an ICP, analyzing an offer for cold email, developing an outreach strategy, or when someone says 'create campaign', 'new campaign', 'ICP for [business]', 'cold email strategy for', 'outreach strategy for', or 'analyze offer'. This is Step 1 of the 4-skill chain: strategy -> copywriting -> ab-testing -> campaign-deploy."
---

# Cold Email Strategy

Build the strategic foundation for a cold email campaign through a 4-phase process. This skill produces the ICP, offer positioning, and messaging angles that feed the copywriting skill downstream.

**Skill chain:** `cold-email-strategy` (you are here) -> `cold-email-copywriting` -> `cold-email-ab-testing` -> `cold-email-campaign-deploy`

---

## Before You Start

**Read the knowledge base.** Before generating any ICP or strategy, read the relevant files from `/Users/jayfeldman/Documents/Tech & Dev/knowledge-base/Cold Email/`:

| Working on... | Read first |
|---------------|-----------|
| ICP filters & signals | `Strategy/icp-framework.md` |
| Analyzing an offer | `Strategy/offer-analysis.md` |
| Targeting research | `Strategy/targeting-research.md` |

**Query NotebookLM.** The "Cold Email Strategy & Copywriting" notebook (ID: `cold-email-strategy-copywritin`) contains expert source material. Query it for deeper insight on offer positioning, ICP development, and advanced strategies like reverse lead magnets or signal-based outreach.

---

## Phase 1: Context Intake & Discovery

The goal is to understand the business well enough to write emails that sound like they came from someone who works there. Two paths based on what the user provides:

### Path A: Materials provided

When the user shares materials upfront, process them BEFORE asking interview questions. Read `references/context-intake-guide.md` for the full extraction protocol. Supported material types:

| Material Type | What to Extract |
|---------------|----------------|
| **Call transcripts** (Fathom, Otter, manual notes) | Founder's own words for the offer, objections prospects raise, specific results/metrics, language patterns, pain points in prospect's words |
| **Google Docs / strategy notes** | Positioning decisions, ICP hypotheses, case studies, messaging already tested, constraints |
| **Sales call recordings / summaries** | Tone of voice, closing patterns, discovery questions they ask, objection handling |
| **Slide decks / pitch materials** | Polished value prop, social proof (logos/testimonials/metrics), pricing structure, competitive positioning |
| **Competitor research** | Competitor cold emails (if available), positioning gaps, pricing benchmarks, feature comparison |
| **Existing email copy** | Tone baseline, what got replies, what flopped, personalization approach, CTA patterns |

After processing materials, **summarize what you learned** and **list what's still missing.** Only ask interview questions about the gaps.

### Path B: No materials (or bare request)

Run through the full discovery interview. Never fabricate company details, case studies, or metrics. If you don't have enough information to build the ICP or positioning, ask for it. A strategy built on made-up details is worse than no strategy.

### Discovery Interview

Adapt to what the user gives you. If they front-load info, extract what you can and only ask about gaps. Don't dump all questions at once — group them into 2-3 rounds (company basics first, then customer/offer details, then CTA/sequencer/personas).

**What you need to know:**

| Info needed | Why it matters |
|-------------|----------------|
| Company name + website | Research the site for positioning clues, tech stack, case studies |
| What they sell/provide | The offer is the foundation |
| Target customer profile | Who actually buys this? What industries are THEY in? (not the product's industry) |
| Pricing model | Shapes objection handling. $500/mo SaaS sells differently than $10K/mo retainer |
| Case studies with numbers | "We helped X achieve Y" is the most powerful line in cold email. Without specifics, social proof falls flat |
| Competitors / alternatives | What prospects currently use instead |
| CTA strategy | **Book a call** or **lead magnet**? Each creates a completely different sequence flow |
| Lead magnets / loss leaders / front-end offers | Always ask: "Do you have any lead magnets, loss leaders, or front-end offers you want to test?" (reverse lead magnet, audit, video walkthrough, report, checklist, calculator) |
| Sequencer | **Email Bison** or **Instantly** (determines spintax syntax, API format, personalization tokens) |
| Sender personas | Names, titles, signatures. Multiple senders enable rotation |

After gathering answers, **summarize back** in a clean format and confirm before moving on. If the user doesn't have case studies yet, note it for the copy phase.

### Additional context prompt

Before moving to ICP, always ask:

> "Do you have any additional materials I should review? I can process:
> - **Call transcripts** (Fathom, Otter, or manual notes)
> - **Google Docs** with strategy notes or briefs
> - **Sales call recordings** or summaries
> - **Slide decks** or pitch materials
> - **Competitor research** or analysis
> - **Existing email copy** from past campaigns
>
> The more context I have, the better the strategy. Even a 10-minute sales call recording can reveal better angles than an hour-long interview."

---

## Phase 2: ICP Development

A bad ICP poisons everything downstream. The goal is to produce filters you can paste directly into Apollo, LinkedIn Sales Navigator, or an Apify scraper and get a qualified list.

Use the template in `references/icp-template.md` for the output format.

### Building the filters

**Job Titles** -- Target people with buying authority and implementation power. Founders, CEOs, CMOs, COOs, VPs, Directors. Avoid mid-level employees and technical roles.

**Industries** -- Broad categories alone cause massive overlap. Stack a broad filter with specific company keywords. Also consider "blue ocean" industries that get few cold emails (manufacturing, farming, restaurants, trades).

**Product vs. Customer trap:** When building an ICP for a tool, platform, or SaaS, never target the product's own industry. A cold email platform's customers are staffing agencies, cybersecurity firms, and IT services companies, not "SaaS" or "Computer Software" companies. Always ask: "What industry is my CUSTOMER in?"

**Company keywords describe the CUSTOMER, not the product.** If you're selling a cold email tool, don't use "cold email" or "lead generation" as company keywords. Use keywords that describe your customer's business: "staffing", "cybersecurity", "managed services."

**Company Size** -- 3-100 employees is the sweet spot. Below 3 is solopreneurs (no budget). Above 500 is enterprises (rigid, established vendors).

**Geography** -- Country/state/city or zip+radius. Scrape one location at a time for deduplication.

**Pain Points** -- Write 3-5 acute "poke the bear" questions. Not generic ("Need help with marketing?") but surgical ("How do you keep track of varying commission rates for each role when a rep hits 120% quota mid-quarter?").

**Buying Triggers** -- Signals that create urgency:
- Job postings = budget + active pain
- New executives = brought in to drive change, 10x more receptive
- LinkedIn engagement = real-time interest + rapport
- Recent funding = money to spend
- Technographics = target by installed software
- Skip Apollo's "Buying Intent" filters (data is unreliable)

**Negative Filters** -- Exclude competitors, current clients, past clients, and irrelevant keywords. Set up AI block list triggers for hostile respondents.

**AI Qualification Prompt** -- Generate a yes/no prompt with the specific offer baked in. This eliminates 30-50% of leads that pass filters but are poor fits. Include it in the ICP document ready to copy-paste.

### ICP Self-Check (REQUIRED before presenting)

Before presenting the ICP, run this validation:
- Are the target industries describing the CUSTOMER's business or the PRODUCT's category?
- Do the company keywords match what the customer DOES or what the product DOES?
- Would these filters return companies that NEED the product, or companies that COMPETE with it?

If any check fails, redo the industries and keywords from the customer's perspective.

**Present the full ICP to the user for review.** Don't proceed until they approve it.

---

## Phase 3: Offer Positioning

Cold email lives or dies on the offer. A perfect ICP with a weak offer produces silence.

**B2B Value Test:** The offer must clearly save time, save money, or make money. If it doesn't obviously do one of these, work with the user to reframe it until it does.

**Offer Killers:** Flag if the offer is too complex to explain in one sentence, is a generic commodity competing on price alone, or makes unsubstantiated guarantees.

**"So What?" Messaging (REQUIRED):** For every feature of the offer, build a feature→outcome table. Take each feature and ask "so what?" until you reach the human outcome. Include this table in the output. Example:

| Feature | So What? | Human Outcome |
|---------|----------|---------------|
| "We do bookkeeping" | Why care? | "You always know exactly what you can pay yourself" |

The human outcome column becomes your value prop language. Never skip this step — the copywriting skill downstream depends on these outcome statements.

**Implicit Objections:** Map the top 3 reasons a prospect will silently say "no" and write preemptive counters. If you're pitching a new CRM, address switching pain before they think it: "We handle the full data migration in under 72 hours with zero downtime."

**Mechanism Decision:** For unique processes, show the mechanism (it differentiates). For commodities (SEO, PR, bookkeeping), leave it out entirely. Focus on the result and niche positioning.

**Front-End Offer Design:** If the core offer is boring or hyper-competitive, design a creative wedge:
- **Reverse Lead Magnet** -- Build a custom micro-app for their vertical. Pre-fill with their data. "I built this for you, want the link?"
- **Loss Leader** -- Sell a front-end deliverable at cost, upsell to retainer
- **Information Arbitrage** -- Offer insights they don't have
- **Front-End Offer** -- Isolate the single most desirable outcome as a standalone pitch

---

## Phase 4: Messaging Strategy

### Tone Profile

Match the tone to who you're emailing. A 25-year-old Miami agency founder gets casual, punchy copy. A 60-year-old auto dealership owner gets direct, no-nonsense language.

Define:
- **Formality** (1-5 scale)
- **Personality traits** (e.g., confident, direct, helpful)
- **Sample sentence** in the ideal voice
- **Banned words:** synergy, leverage, ROI, incentivize, game-changer, "Hope this email finds you well", "I wanted to reach out"
- **Banned punctuation:** Em dashes, en dashes, and long dashes of any kind. These are a dead giveaway of AI-generated copy. Use commas, periods, or start a new sentence instead.

### 3 Messaging Angles

Each angle is a different entry point into the same offer:

**Angle A: Pain Dagger ("Poke the Bear")**
Open with an acute pain question that makes the prospect feel understood. Best for prospects who are actively struggling.

**Angle B: Proof Machine (Case Study)**
Lead with your most impressive result. Best for skeptical prospects who need evidence before they'll engage.

**Angle C: Value Gift (Curiosity / RLM)**
Lead with insight, creative ideas, or a reverse lead magnet. Best for prospects who are browsing, not buying. You earn their attention with generosity.

For each angle, define: framework (4-Sentence, Case Study Overwhelm, Lookalike, Creative Ideas, or RLM Pitch), hook, value prop, social proof reference, CTA, and which ICP segment it targets best.

---

## Example: What Good Output Looks Like

Here's a condensed example of each section from a real campaign (commercial roofing):

**Discovery summary:**
| Field | Value |
|-------|-------|
| Company | Dezigns Construction Inc |
| Offer | Commercial roofing services (emergency repair, replacement, maintenance) for commercial property owners across FL, NJ, PA, DE, MD |
| Pricing Model | Project-based |
| CTA Strategy | Book a call |
| Sender Personas | Michael Hartley |

**ICP pain point (good vs bad):**
- GOOD: "When was the last time someone actually walked your roofs and gave you a straight answer on what needs fixing now vs. what can wait?"
- BAD: "Are you looking for a better roofing solution?" (generic, could apply to anyone)

**Offer positioning (good vs bad):**
- GOOD: "You stop guessing about your roofs and start budgeting based on real data. And when something goes wrong at 2 AM, someone picks up."
- BAD: "We provide high-quality commercial roofing services with competitive pricing." (feature dump, no human outcome)

**Messaging angle differentiation:** Each angle must be a genuinely different entry point — not the same pitch reworded. Pain Dagger hits an acute question ("How do you handle an emergency leak on a Saturday night?"), Proof Machine leads with credentials (GAF Presidential Award), Value Gift offers something free (complimentary roof walkthrough).

---

## Output & Handoff

### Workspace output

Write the complete strategy to `scripts/campaigns/{campaign-name}/strategy.md` containing:
1. Discovery summary (company, offer, pricing, CTA strategy, sender personas)
2. Full ICP (using the template format)
3. Offer positioning (value lever, value prop, front-end offer, implicit objections)
4. Messaging strategy (tone profile, 3 angles with frameworks)

### Metadata update

Create or update `scripts/campaigns/{campaign-name}/.metadata.json`:
```json
{
  "campaign_name": "{name}",
  "sequencer": "{email_bison|instantly}",
  "created_at": "{ISO timestamp}",
  "phases": {
    "strategy": { "status": "complete", "completed_at": "{ISO}", "output": "strategy.md" },
    "copywriting": { "status": "pending", "output": null },
    "ab_testing": { "status": "pending", "output": null },
    "deployment": { "status": "pending", "output": null }
  }
}
```

### Next step

Tell the user: "Strategy complete. Run `/cold-email-copywriting` to write the email sequence based on this strategy."
