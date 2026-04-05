---
name: autoimprove
version: 1.1.0
description: "Review any finished creative (text, graphic, video, audio, presentation, AI prompt, writing) and autonomously regenerate an improved version. Use after generating any creative output. Also use when the user mentions 'autoimprove,' 'improve this,' 'critique and redo,' 'make it better,' 'review and regenerate,' 'polish this creative,' 'improve this prompt,' 'better prompt,' 'rewrite this,' or 'tighten this up.'"
---

# Autoimprove

Autonomous critique-and-regenerate loop for any creative output. Finds the most recent creative in the conversation, grades it against domain-specific quality criteria, and regenerates an improved version. Supports text, graphics, video, presentation, audio, AI prompts, and general writing domains.

---

## Before Starting

1. **Find the creative.** Scan the conversation for the most recent creative output (copy, image, code, script, prompt).
2. **Detect the type.** Use the `{{type}}` argument if provided. Otherwise, auto-detect from the table below.
3. **Extract the original brief.** Find the user's request that triggered the creative. You need this for regeneration.
4. **If no creative found:** Say "No recent creative found. Generate something first, then run /autoimprove." and stop.

---

## Creative Type Detection

| Type | Detection Signals |
|------|-------------------|
| `carousel` | Numbered slides, "Slide 1/2/3", carousel copy, slide-by-slide breakdown |
| `email` | Subject line, email body, "Hi {{name}}", nurture sequence, drip campaign |
| `ad-copy` | Primary text + headline + description, Meta ad format, ad variations |
| `graphic-ad` | `nano-banana` command output, image file path (.png/.jpg), fal.ai prompt, ad image |
| `video-script` | Beat sheet, timing marks `[0:00]`, kinetic text beats, Remotion composition |
| `caption` | Social media caption, hashtags, platform-specific formatting |
| `script` | YouTube script, retention hooks, timestamps, video outline |
| `presentation` | Reveal.js HTML, slide deck, speaker notes, `<section>` tags |
| `audio-script` | Voiceover script, ElevenLabs directions, podcast outline, spoken delivery notes |
| `ai-prompt` | System prompt, user prompt, SKILL.md, agent instructions, prompt template, few-shot examples |
| `writing` | Blog post, article, thread, long-form copy, documentation, guide, tutorial, newsletter |
| `landing-page` | Hero section, feature blocks, testimonial section, HTML/JSX page code |

---

## Step 1: Run the Critique Pass

Evaluate the creative against **every applicable criterion** below. For each check, record: **pass** or **fail**, plus specific **evidence** (quote the exact text, describe the visual issue, or cite the missing element).

### Universal Checks (ALL creative types)

Apply these to every creative regardless of type.

**Deterministic (scan the text):**

1. **Banned AI words** — Scan for ALL of these. Any match = fail:
   delve, tapestry, realm, landscape, ever-evolving, cutting-edge, robust, transformative, pivotal, vibrant, crucial, compelling, seamless, groundbreaking, leverage, harness, embark, navigate (metaphorical use), unveil, facilitate, synergy, game-changer, unlock, unleash, elevate, utilize, endeavour, multifaceted

2. **Banned AI phrases** — Any match = fail:
   "In today's ever-evolving...", "Unlock the power of", "Master the art of", "Let's delve into", "Harness the power of", "Push the boundaries of"

3. **Em dash / en dash** — Scan for U+2014 (`---`) and U+2013 (`--`). Any match = fail. Use regular hyphens only.

**LLM judgment:**

4. **Brand voice** — Professional yet approachable, educational and value-driven. Sounds like a knowledgeable peer, not a textbook or corporate memo.

5. **Specificity** — Concrete numbers, examples, timeframes, or results. Vague claims ("grow your business", "get more leads") = fail.

6. **CTA strength** — Clear call-to-action with an action verb and obvious benefit. Missing or weak CTA = fail.

---

### Carousel Checks

7. **Slide count** — 8-10 slides optimal. Under 6 or over 12 = fail.
8. **Words per slide** — Maximum 15 words per slide. Any slide over 15 = fail.
9. **Hook (slide 1)** — Bold claim, provocative question, or surprising stat. Generic opening = fail.
10. **CTA (final slide)** — Clear call-to-action (follow, DM, link, save, share).
11. **Flow** — Each slide builds on the previous. Logical progression, not a random list.

---

### Email Checks

12. **Subject line** — Creates curiosity, states a benefit, or drives urgency. Generic = fail.
13. **No em dashes** — Emails must NEVER contain em dashes or en dashes. Regular hyphens only.
14. **Opening hook** — First sentence grabs attention. Filler openings ("I hope this finds you well") = fail.
15. **Single CTA** — One primary call-to-action per email, not 3 competing links.
16. **Conversational tone** — Reads like a message from a knowledgeable friend, not a marketing blast.
17. **P.S. line** — Bonus points if present with a secondary hook or urgency element.

---

### Ad Copy Checks

18. **Hook (first line)** — Stops the scroll with a stat, question, bold claim, or pattern interrupt.
19. **Framework** — PAS (Problem-Agitation-Solution) or AIDA structure present. Unstructured rambling = fail.
20. **Social proof** — Testimonials, stats, case studies, or credibility markers included.
21. **Urgency** — If used, must be genuine and specific ("5 spots left this month"), not fake ("Act now!!!").
22. **Benefit over features** — Leads with what the reader gets, not what the product does.

---

### Script Checks (YouTube, long-form video)

23. **Retention hooks** — Present at 0s, 30s, 60s, and every 2-3 minutes.
24. **Pattern interrupts** — Varies pacing with story, stat, question, list, analogy.
25. **Open loops** — Teases upcoming content to keep viewers watching.
26. **Cold open** — Starts with the most compelling moment, not a slow intro.

---

### Graphic Ad Checks

For outputs from `nano-banana`, `fal.ai`, or any generated image.

**If an image file was generated (PNG/JPG):**

Use the `Read` tool to view the image, then grade visually:

27. **Brand colors** — #ED0D51 (hot pink) accent visible? Background appropriate (#0D0D0D dark or #FFFFFF white)?
28. **Text legibility** — All text readable at mobile size? Nothing cut off at edges?
29. **CTA button** — Visible CTA button present? Hot pink pill shape with white text?
30. **Layout balance** — Content well-distributed? No awkward empty space or crowding? If a photo/headshot is placed inside a shape (circle, frame, card), it must fill at least 80% of that shape. A tiny image floating inside a giant placeholder = fail.
31. **Brand mark** — "Lead Gen Jay" or "@leadgenjay" visible somewhere?
32. **Aspect ratio** — Appears to match the target format (4:5 portrait, 1:1 square, 9:16 story)?
33. **No visual artifacts** — No garbled text, distorted faces, or AI generation artifacts? No compositing artifacts — visible placeholder shapes (gray circles, empty frames), size mismatches between composited elements and their containers, or layering errors where background placeholders show through.

34. **Headline dominance (1/3 rule)** — Headline text fills at least 1/3 of the image height AND spans at least 80% of the horizontal width. Squeezed narrow or small headline = fail.

35. **60-30-10 color ratio** — Hot pink (#ED0D51) used ONLY on 1-3 headline accent words and CTA button. Hot pink as a large background fill, banner (unless founder-proof type), or section background = fail. Any purple, blue, or gradient background anywhere = fail.

36. **Anti-equal-card rule** — Stats, metrics, or features displayed as 3 identical equal-width colored boxes in a row = fail. Should use varied sizing, dashboard screenshots, tables, or asymmetric layouts.

37. **Section purpose rule** — Every visual section serves a clear purpose (headline, proof, features, CTA). Decorative shapes, meaningless icons, or filler sections that don't convey information = fail.

38. **Proof realism** — Testimonials styled as generic quote cards with decorative quotation marks = fail (should look like Slack/iMessage screenshots). Dashboard metrics shown as colored metric boxes = fail (should look like real table UI or analytics screenshots).

39. **Prompt leakage** — Words like "CRITICAL", "EXACTLY", "DO NOT", "IMPORTANT", "NOTE", or other meta-instructions visible as part of the ad design = fail. These are prompt artifacts that Gemini sometimes renders.

40. **Font rendering quality** — Merged letters where two characters blend into one, overlapping characters, letter substitutions (e.g., 'R' rendered as 'P'), or inconsistent letter sizing within a word = fail. Stricter than check 33.

41. **Photo fill ratio** — If a photo or headshot is composited into a container (circle, frame, card), the photo must fill 80%+ of the container area with no visible placeholder background. Tiny photo in a large empty container = fail. Gray/colored placeholder shapes visible behind the photo = fail.

42. **Compositing layer quality** — If the image was assembled from multiple layers (Sharp, Canvas, ImageMagick), verify: all elements are properly scaled to their containers, no unintended gaps between layers, border rings align with photo edges, and the result looks like a single cohesive image — not a sticker placed on a background.

**If a nano-banana prompt was generated:**

41. **Background color** — Explicitly specified (#FFFFFF or #0D0D0D)?
42. **Typography fonts** — Big Shoulders Black and Manrope mentioned?
43. **Accent color** — #ED0D51 specified for highlight elements?
44. **CTA button described** — Hot pink pill-shaped button with white text?
45. **Anti-slop directive** — "No gradients, no stock photos, no decorative filler" present?
46. **Placeholders filled** — No leftover `[HEADLINE]`, `[CTA_TEXT]`, `[ITEM1]` placeholders?
47. **Prompt length** — Between 100-400 words? Too short = underspecified, too long = conflicting instructions.

48. **Ad type classification** — Prompt clearly matches a known template type (comparison, feature-grid, social-proof, minimal-text, founder-proof, screenshot-social-proof, device-mockup). Unclassifiable prompt = fail.

49. **Headline instruction priority** — Headline text and styling described in the first third of the prompt. If headline details come after layout/spacing/brand instructions, Gemini deprioritizes them = fail.

50. **Explicit negative constraints** — Prompt contains at least 2 explicit negative constraints (e.g., "no gradients", "NOT equal-width cards", "no purple or blue", "no decorative filler"). Fewer than 2 = fail.

51. **Reference image framing** — If `-r` reference images are used, the prompt explicitly explains HOW the reference should be used (as content element to paste, as style guide for layout, or as color/composition reference). Ambiguous reference usage = fail.

**Improvement method for graphics:**
1. Classify which ad type template the original prompt matches (comparison, feature-grid, social-proof, minimal-text, founder-proof, screenshot-social-proof, device-mockup)
2. Rewrite the nano-banana prompt using the correct SKILL.md template structure with all fixes applied
3. Ensure headline instruction appears in the first third of the prompt
4. Add at least 3 explicit negative constraints based on the specific failures found
5. Re-run the `nano-banana` CLI command to generate the improved image
6. Open both the original and improved images in Preview.app for comparison

---

### Visual Reference Comparison (Graphic Ads Only)

After running all graphic-ad checks above, perform a visual reference comparison against proven competitor ads. This step is additive — standard checks always run first.

**Prerequisites:**
- Reference file exists at `.claude/skills/autoimprove/references/graphic-ad-references.json`
- Reference images exist in `output/ads/research/`
- If either is missing, skip this section silently

**Workflow:**

1. **Classify ad type** — Determine which template type the generated ad matches (comparison, feature-grid, social-proof, minimal-text, founder-proof, screenshot-social-proof, device-mockup)
2. **Load references** — Read the reference JSON, get the 2 reference images for this ad type
3. **Resize images** — Use `sips --resampleHeightWidthMax 1000` on both the generated image and reference images before reading (Claude crashes at 2000px with multiple images in context)
4. **Vision comparison** — Load both the generated image and one reference image, then grade on 5 dimensions (1-5 scale):
   - **Visual hierarchy** — Headline dominance, eye flow, information layering
   - **Professional polish** — Looks like a real Meta ad a human would actually run, vs obvious AI-generation tells
   - **Typography quality** — Font rendering, spacing, text legibility, character integrity
   - **Layout sophistication** — Composition, spacing, element arrangement, visual rhythm
   - **Scroll-stopping power** — Would this stop a thumb scrolling through a feed at mobile size?

5. **Score and act:**
   | Overall Score (avg of 5 dimensions) | Action |
   |--------------------------------------|--------|
   | >= 4.0 | PASS — no reference-driven fixes needed |
   | 3.0-3.9 | IMPROVE — extract specific prompt fixes from dimensions scoring < 3, feed into regeneration |
   | < 3.0 | REDO — rewrite prompt from scratch using the SKILL.md template for this ad type |

6. **Extract fixes** — For any dimension scoring < 3, describe the specific gap between the generated ad and the reference, then translate that gap into a concrete prompt fix (e.g., "Reference has headline covering 40% of frame, generated ad headline is only 15% — add 'headline must fill top third of image'")
7. **Feed into regeneration** — Combine reference comparison fixes with standard check fixes during the regeneration step

**Safeguards:**
- Maximum 2 comparison passes per autoimprove run
- Images MUST be resized to max 1000px before using Read tool
- Skip silently if reference images not found for a given ad type
- Cost: ~$0.01-0.02 per comparison (negligible)

---

### Video Script / Kinetic Text Ad Checks

For beat sheets, kinetic typography scripts, and Remotion compositions.

52. **Beat count** — Matches target duration: 60s = 18-22 beats, 45s = 14-16 beats, 30s = 9-11 beats.
53. **Words per beat** — Maximum 8 words per beat. Any beat over 8 = fail.
54. **Hook beat** — First beat stops the scroll (stat, question, bold claim). Weak opener = fail.
55. **CTA beat** — Final beat has clear CTA with action verb and keyword/DM trigger.
56. **Pacing variation** — Mix of short punchy beats (2-3 words) and longer beats (6-8 words). All same length = fail.
57. **Accent words marked** — Each beat identifies which words display in hot pink (#ED0D51).
58. **Framework applied** — PAS (ToF), AIDA (MoF), or Proof Stack (BoF) structure matches funnel stage.
59. **Timing annotations** — Beats annotated with approximate timestamps `[0:00]`, `[0:03]`, etc.
60. **Sound-off friendly** — All key information conveyed in text. Script works without audio.
61. **Brand elements** — Background #0D0D0D, text #FFFFFF, accent #ED0D51, font Big Shoulders Black uppercase.

**Improvement method for video:**
- Rewrite the entire beat sheet with all fixes applied
- Recalculate timing annotations
- Present in the same table/format as the original

---

### Presentation Checks

For Reveal.js slide decks and presentation HTML.

62. **Slide count** — Appropriate for talk length (~1 content slide per 2 minutes + title/closing).
63. **Typography compliance** — h1/h2 use Big Shoulders Display (uppercase, 900/800 weight)? Body uses Manrope?
64. **Color palette** — Using brand tokens: accent #ED0D51, text #111111, body #555555, dark-bg #0D0D0D?
65. **Content density** — No wall-of-text slides? One key point per slide? Max ~30 words per slide.
66. **Speaker notes** — Present for every content slide?
67. **Visual variety** — Mix of text-only, screenshot, and dark/light background slides?
68. **Narrative arc** — Opening hook, building tension/value, payoff, closing CTA?
69. **Spacing** — Standard `padding: 40px 60px`? Content fills the slide without wasted whitespace?

**If HTML file exists on disk:** Render key slides with Playwright, capture screenshots, vision-grade for layout and readability.

**Improvement method for presentations:**
- Rewrite the HTML file with all fixes applied
- Re-render and verify visually if possible

---

### Audio / Voiceover Script Checks

For ElevenLabs voiceover scripts, podcast outlines, and spoken-word content.

70. **Sentence length** — Sentences under 20 words for natural spoken delivery. Long sentences = fail.
71. **Breath marks** — Natural pause points (commas, periods, ellipses) every 10-15 words.
72. **Tongue twisters** — No awkward consonant clusters or hard-to-pronounce sequences.
73. **Pace variation** — Mix of short punchy lines and flowing sentences. Monotone pacing = fail.
74. **Emphasis markers** — Key words/phrases marked for vocal emphasis (bold, CAPS, or explicit `[emphasis]` notes).
75. **Opening energy** — First line sets the right tone and energy level for the piece.
76. **Conversational flow** — Sounds like natural speech when read aloud, not written prose.
77. **Filler-free** — No "um", "uh", "you know", "like" unless intentionally placed for authenticity.
78. **Audio direction** — Includes pace/tone notes for the voice artist: `[pause]`, `[slower]`, `[excited]`.

**Improvement method for audio:**
- Rewrite the script with spoken-word optimizations
- Add missing audio direction markers
- Ensure every sentence reads naturally when spoken aloud

---

### AI Prompt Checks

For system prompts, SKILL.md files, agent instructions, prompt templates, and few-shot examples.

79. **Clear role definition** — Does the prompt establish WHO the AI is and WHAT it does in the first 2-3 sentences? Vague or missing role = fail.
80. **Specificity over vagueness** — Are instructions concrete and actionable? "Write good copy" = fail. "Write 3 headline variations under 8 words using PAS framework" = pass.
81. **Output format defined** — Does the prompt specify the exact output structure (JSON, markdown, table, numbered list)? Ambiguous output expectations = fail.
82. **Constraints explicit** — Are boundaries clearly stated? (word limits, banned patterns, required elements, tone). Constraints buried in paragraphs = fail -- should be in lists or tables.
83. **Examples included** — For complex tasks, are good/bad examples provided? Tasks with subjective quality standards need at least one example.
84. **No conflicting instructions** — Do any two rules contradict each other? ("Be concise" + "Be comprehensive" = fail). Scan for tension between directives.
85. **Escape hatches** — Does the prompt handle edge cases? What if input is missing, malformed, or out of scope? No guidance = fail for production prompts.
86. **Instruction hierarchy** — Are the most important rules positioned first or visually emphasized (bold, headers, lists)? Critical rules buried at the bottom = fail.
87. **No prompt injection vulnerability** — Does the prompt guard against user input overriding system instructions? Unprotected user input interpolation = fail.
88. **Testability** — Could you write binary pass/fail assertions against this prompt's output? If the success criteria are too vague to test, the prompt is too vague.

**Improvement method for AI prompts:**
- Rewrite the prompt with all fixes applied
- Add missing role definition, output format, constraints, or examples
- Restructure for clarity: role -> context -> instructions -> constraints -> output format -> examples

---

### Writing Checks

For blog posts, articles, threads, newsletters, guides, tutorials, and long-form content.

89. **Opening hook** — First paragraph grabs attention with a bold claim, surprising stat, story, or question. Slow warmup intros = fail.
90. **Clear thesis** — Is there a single, identifiable main argument or takeaway? Meandering without a point = fail.
91. **Structure** — Logical flow with clear sections/headers? Reader can skim and get the gist? Wall of text = fail.
92. **Sentence variety** — Mix of short punchy sentences and longer flowing ones. All same length = monotone = fail.
93. **Active voice** — Predominantly active voice. Excessive passive constructions ("was done by", "has been shown to") = fail.
94. **Show don't tell** — Concrete examples, stories, or data instead of abstract claims. "It's really important" = fail. "47% of cold emails never get opened" = pass.
95. **Reader value** — Does every section give the reader something useful (insight, tactic, framework)? Filler paragraphs = fail.
96. **Transitions** — Smooth flow between sections. Abrupt topic changes without connective tissue = fail.
97. **Closing strength** — Ends with a clear takeaway, CTA, or memorable line. Just stopping = fail.
98. **Appropriate length** — Content density matches the format. Blog posts: 800-2000 words. Threads: 5-15 posts. Newsletters: 500-1000 words. Severely over/under = fail.

**Improvement method for writing:**
- Rewrite the full piece with all fixes applied
- Tighten prose, sharpen the hook, add missing examples or data
- Maintain the original voice and argument

---

## Step 2: Score and Diagnose

Calculate results:

```typescript
passed = number of applicable checks that passed
total = number of applicable checks for this creative type
score = passed / total (as percentage)
```

For each failure, create a diagnosis:
- **What failed:** The specific check number and name
- **Evidence:** Quote the exact text, describe the visual issue, or cite the missing element
- **Fix:** The specific replacement text, rewritten prompt section, or structural change needed. Not vague advice -- write the actual fix.

---

## Step 3: Regenerate

Produce the improved creative with all fixes applied:

1. Start from the original user brief
2. Apply every fix from the diagnosis
3. Maintain the original intent, topic, and key messages
4. Use the correct output format for the domain:
   - **Text domains** (carousel, email, ad-copy, caption, script): Rewrite the copy
   - **Graphic-ad**: Rewrite the nano-banana prompt, then re-run the CLI command
   - **Video-script**: Rewrite the full beat sheet with timing
   - **Presentation**: Rewrite the HTML file
   - **Audio-script**: Rewrite the spoken script with audio directions
   - **AI-prompt**: Restructure and rewrite the prompt (role -> context -> instructions -> constraints -> output format -> examples)
   - **Writing**: Rewrite the full piece with tighter prose, stronger hook, and better structure
   - **Landing-page**: Rewrite the page code/copy
5. Do NOT mention the critique process in the output -- produce the improved creative as if it were the first draft

The regenerated output must be **complete and ready to use** -- not a diff or patch.

---

## Step 4: Present Results

Show the user:

### Improvements Made
- 3-5 bullet points summarizing key changes (e.g., "Replaced vague hook with specific stat", "Fixed 2 beats over 8-word limit", "Added missing CTA button to prompt")

### Quality Score
- Before: X% (N/M checks passed)
- After: Y% (should be higher)

### Improved Creative
- The full regenerated output, ready to use
- For graphics: show the improved image (and the original for comparison if both exist)

---

## Step 5: Loop Option

After presenting the improved version, ask:

**"Run another improvement pass? (y/n)"**

- If yes: repeat Steps 1-4 on the NEW version (not the original)
- Maximum **3 total passes**. After pass 3, present the final version regardless.
- If the score hits **100%**, stop early -- no further passes needed.
- Each pass should show the cumulative score progression: "Pass 1: 65% -> Pass 2: 88% -> Pass 3: 96%"

---

## Autonomy Rules

- Do NOT ask for permission between the critique and regeneration steps. Run the full pipeline automatically.
- Do NOT show the detailed critique table to the user. They want the improved result, not a grading report. The summary bullets are sufficient.
- Do NOT skip the regeneration step. The whole point is producing a better version, not just pointing out problems.
- For graphic regeneration: run the `nano-banana` command automatically. Do not ask "should I regenerate?"
- If a check is not applicable to the detected type, skip it silently. Do not report "N/A" checks.
- If you cannot find a recent creative in the conversation, say so and stop. Do not fabricate a creative to critique.
