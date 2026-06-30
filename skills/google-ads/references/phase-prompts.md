# Google Ads Pro System — phase gate prompts

Exact user-facing copy for each gate. Reference as `§P{n}.{tag}`. Keep the voice plain, confident,
results-focused. No emoji, no em-dashes.

---

## §P0.new
> Let's build your Google Ads system from scratch. First, a name for this account/build (a slug like
> `acme-coaching`) and the offer you're advertising (what someone buys, and the price).

## §P0.resume
> You have an in-progress Google Ads build. Want to resume it, or start a new one? Resuming picks up at
> the first unfinished phase.

---

## §P1.intro
> Phase 1 of 6 — Tracking. Before we spend a dollar, we install the signal Google's bidding optimizes
> against: your conversion actions, Enhanced Conversions (so Google matches more of the conversions
> privacy would otherwise erase), and the offline import that credits the click even when the browser
> tag never fires. You do NOT need Hyros or any other tool. I'll hand you to the tracking setup now;
> it'll ask for your Customer ID, a developer token, and OAuth credentials.

## §P2.intro
> Phase 2 of 6 — Strategy. Now we decide who to target, what to say, and the single biggest structural
> call: Search vs Performance Max. Tell me the offer, your ideal customer, any keywords or competitors
> you have in mind, and a rough daily budget. Search wins when there's clear search intent; Performance
> Max wins when you need broad scale and intent keywords are thin. I'll recommend one and write the
> brief your campaigns inherit.

## §P3.intro
> Phase 3 of 6 — Audiences. With tracking live, we build your targeting inventory: Customer Match lists
> from your buyers and opt-ins (for retargeting and exclusions), and for Performance Max the one
> audience signal that steers Google's modeling. Buyers always get excluded from cold prospecting. Heads
> up: Customer Match list sizes read as 0 through the API even when they're populated, so we confirm
> eligibility in the UI, not the number.

## §P4.intro
> Phase 4 of 6 — Build. I'll create the campaign, ad groups (or asset groups for PMax), and ads in your
> account, optimized toward the conversion action we set up in Phase 1, and I'll write the copy:
> responsive search ad headlines and descriptions, or Performance Max asset-group text. Winners are
> specific (a number + a concrete outcome + proof), never vague. Everything is built PAUSED and previewed
> with a validate-only check first. Nothing spends yet.

## §P5.intro
> Phase 5 of 6 — Launch. Here's the full plan and the total daily spend:
> {plan_summary}
> Total: ${total_per_day}/day.
> I've run the pre-launch checklist (URL reachable, tracking wired, conversion action attached, budget
> and bid coherent, geo set, negatives in place, copy clean). Reply "launch" to take it live. Anything
> else and we keep it paused.

## §P6.intro
> Phase 6 of 6 — Optimize. Your ads are live. Give it 48-72 hours to gather data before we cut anything.
> From here I review on a cadence (weekly is a good default): pull the report, kill what loses, scale
> what wins, add negative keywords for wasted search terms, judged on your real conversions, never raw
> clicks. Want me to set a weekly optimize + report rhythm?

## §final
> Your Google Ads Pro System is live and set to improve over time. From here:
> - Re-run optimization weekly (sooner if you're spending aggressively).
> - Keep Enhanced Conversions healthy and re-verify the offline import after any funnel change.
> - Scale proven winners; for Performance Max, strengthen the audience signal and cut the consistently
>   weak assets (specific-number lines beat vague ones).
