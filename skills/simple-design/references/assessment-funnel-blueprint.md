# Assessment / Quiz Funnel Blueprint

A 15-question quiz funnel for high-quality lead generation. Visitors self-qualify through a scored assessment, provide contact info to see results, and receive a personalized recommendation with a CTA to the appropriate offer.

---

## Landing Page (3 sections max)

### Section 1: Hero
- Headline: "How Strong Is Your [Topic]? Take the Free Assessment"
- Sub-headline: "3 minutes. 15 questions. Immediate personalized recommendations."
- Single CTA: "Start the Quiz" (brand pink, full-width on mobile)
- One trust element: "Taken by [X]+ [audience type]"

### Section 2: What You'll Learn (optional)
- 3 bullet points max: what the score reveals, what the recommendations include
- Keep it under 50 words total

### Section 3: Social Proof (optional)
- Single stat bar or testimonial. No more.

---

## Hook Types

Choose one hook style for the landing page headline:

### Frustration Hook
"Feeling frustrated that [specific pain point]? Find out exactly where you're falling short."
- Best when audience knows they have a problem but not what's causing it

### Results Hook
"Ready to [specific outcome]? See how close you are with a free [topic] assessment."
- Best when audience is aspirational and outcome-focused

---

## Quiz Structure (15 Questions)

### Part 1: Contact Info (Q1-2)
- Q1: First name
- Q2: Email address
- Show progress bar: "Question 1 of 15"
- These come FIRST — they're low-friction and establish commitment

### Part 2: Best Practice Questions (Q3-12)
- 10 questions grading current performance
- Each question: multiple choice (3-5 options) with implicit scoring
- Questions should cover the key areas of the topic being assessed
- Example formats:
  - "How often do you [best practice]?" → Never / Rarely / Sometimes / Consistently
  - "Which best describes your current [area]?" → [Description A] / [Description B] / [Description C]
- Each answer maps to a score (0-3 points)

### Part 3: Big 5 Sales Qualifiers (Q13-15)
These questions qualify the lead for sales follow-up:

- **Q13: Current situation** — "Which best describes your current [topic] setup?"
  - Multiple choice revealing their starting point
- **Q14: Desired outcome** — "What's your #1 [topic] goal in the next 90 days?"
  - Multiple choice revealing ambition level and urgency
- **Q15: Biggest obstacle** — "What's the biggest thing holding you back from [outcome]?"
  - Multiple choice revealing pain points and potential objections
  - Include one option that reveals budget/investment willingness

---

## Results Gate

After Q15, before showing results:
- "Your personalized score and recommendations are ready!"
- If email wasn't collected in Q1-2, collect it here
- Single CTA: "See My Results"
- No additional friction — one click to results

---

## Results Page

### Score Display
- Large score: "Your [Topic] Score: 73/100"
- Visual indicator (progress bar or gauge)
- Score category: "Above Average — Room for Improvement"

### Score Categories
| Range | Label | Recommendation Tone |
|-------|-------|-------------------|
| 0-40 | Needs Attention | Urgent — here's what to fix first |
| 41-60 | Below Average | Gaps exist — here's how to close them |
| 61-80 | Above Average | Good foundation — optimize these areas |
| 81-100 | Excellent | Fine-tune for maximum results |

### Personalized Recommendations
- 3-5 specific recommendations based on weakest scoring areas
- Each recommendation: one sentence problem + one sentence action

### CTA to Offer
- Based on score category, route to appropriate offer:
  - Low scores → higher-touch offer (consultation, done-for-you)
  - Mid scores → course or program
  - High scores → tools or community
- Single CTA button (brand pink): "Get Your Personalized [Solution]"

---

## Component Structure

```
src/app/[quiz-name]/
├── page.tsx              # Server component with metadata
└── content.tsx           # Client component with quiz state

src/components/[quiz-name]/
├── quiz-landing.tsx      # Landing page hero + CTA
├── quiz-stepper.tsx      # Progress bar + navigation
├── quiz-question.tsx     # Individual question renderer
├── results-gate.tsx      # Email collection before results
└── results-page.tsx      # Score + recommendations + CTA
```

---

## Technical Notes

- **State management:** React `useState` for quiz progress, answers array, and current step
- **Progress persistence:** Save answers to `localStorage` on each step (resume if tab closes)
- **Results calculation:** Client-side scoring from answer weights — no API call needed for score
- **Data storage:** POST completed quiz to Supabase `quiz_completions` table on results gate submit
- **Webhook:** Fire n8n webhook with full quiz data + score + email for CRM/email sequence
- **Analytics:** Track completion rate per step, drop-off points, score distribution

---

## Simplicity Rules (from Simple Design)

- Landing page: 3 sections max (hero + optional what-you-learn + optional proof)
- Quiz UI: one question per screen, large tap targets, clear progress indicator
- Results: score + 3-5 recommendations + single CTA. No value stacks or long-form copy.
- Motion: FadeIn on landing hero only. Quiz transitions use simple slide-left animation.
- No testimonial sections, no instructor bio, no FAQ on quiz pages.
