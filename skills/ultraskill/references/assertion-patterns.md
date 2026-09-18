# Assertion Pattern Catalog

Domain-specific assertion templates for writing effective evals. Each pattern includes:
- **Text**: The assertion statement
- **Type**: structural, content, quality, or visual
- **Deterministic**: Whether it can be checked programmatically (regex/code) vs requiring LLM judgment

---

## General Skill Assertions

### Structural (format and architecture)

| # | Assertion Pattern | Deterministic |
|---|---|---|
| G-S1 | Output follows the workflow steps defined in the skill in correct order | No |
| G-S2 | All required sections specified by the skill are present | No |
| G-S3 | Output format matches the skill's specification (markdown, JSON, code, etc.) | Yes — check for format markers |
| G-S4 | Output contains exactly N sections/components (replace N with spec) | Yes — count headers or delimiters |
| G-S5 | Each section has a heading and at least one content paragraph | Yes — regex for `## ` followed by text |
| G-S6 | Output includes a summary or conclusion section | Yes — search for "summary"/"conclusion" header |
| G-S7 | Numbered lists are sequential and complete (no gaps, no duplicates) | Yes — parse numbers |
| G-S8 | Code blocks use the correct language tag | Yes — regex for triple backticks + language |
| G-S9 | Output length is between X and Y words | Yes — word count |
| G-S10 | No placeholder text remains (TODO, REPLACE, TBD, placeholder, lorem ipsum) | Yes — string search |

### Content (what must be included)

| # | Assertion Pattern | Deterministic |
|---|---|---|
| G-C1 | Output directly addresses the specific request in the prompt | No |
| G-C2 | All key terms from the prompt are reflected in the output | Partial — check term presence |
| G-C3 | Output includes concrete examples, not just abstract descriptions | No |
| G-C4 | Referenced files or paths actually exist in the project | Yes — filesystem check |
| G-C5 | Technical terms are used correctly in context | No |
| G-C6 | Output includes actionable next steps or recommendations | No |
| G-C7 | All items from a provided list are addressed | Yes — check each item |
| G-C8 | Output references the correct versions/APIs/tools specified in the prompt | Yes — string search |

### Quality (execution standards)

| # | Assertion Pattern | Deterministic |
|---|---|---|
| G-Q1 | No banned AI words used (see banned list below) | Yes — string search |
| G-Q2 | Output is specific and concrete — contains at least 3 proper nouns or specific details | Partial |
| G-Q3 | No unnecessary hedging language (might, perhaps, it depends, arguably) | Yes — string search |
| G-Q4 | Consistent formatting throughout (heading levels, list styles, code conventions) | Partial |
| G-Q5 | No contradictions between different sections | No |
| G-Q6 | Appropriate level of detail for the audience (not too basic, not too advanced) | No |

---

## Copywriting Assertions

### Structural

| # | Assertion Pattern | Deterministic |
|---|---|---|
| C-S1 | Copy uses PAS framework (Problem → Agitation → Solution sections identifiable) | Partial — search for transition patterns |
| C-S2 | Copy uses AIDA framework (Attention → Interest → Desire → Action flow) | No |
| C-S3 | Copy uses Proof Stack framework (claim → proof → claim → proof → CTA) | No |
| C-S4 | Headline is under N words (replace N: 12 for ads, 8 for email subjects, 15 for landing pages) | Yes — word count |
| C-S5 | CTA is present in the final paragraph or section | Yes — search last section for action verbs |
| C-S6 | Body copy is between X and Y words | Yes — word count |
| C-S7 | Subheadlines break up body copy every 2-4 paragraphs | Yes — count paragraphs between headers |
| C-S8 | Bullet points are used for lists of 3+ items | Partial |
| C-S9 | Email subject line is under 50 characters | Yes — character count |
| C-S10 | P.S. line is present (for emails and sales letters) | Yes — search for "P.S." |
| C-S11 | Copy has distinct open, body, and close sections | Partial |
| C-S12 | Each carousel slide has a standalone headline | Yes — count per-slide headers |

### Content

| # | Assertion Pattern | Deterministic |
|---|---|---|
| C-C1 | Specific number/stat appears in the first 50 words | Yes — regex for digits in first 50 words |
| C-C2 | Risk reversal or guarantee is mentioned | Yes — search for guarantee/risk-free/money-back |
| C-C3 | Social proof element is present (testimonial, case study, user count) | Partial |
| C-C4 | The specific offer/product from the brief is named | Yes — string search |
| C-C5 | Pain point from the brief is addressed in the opening | No |
| C-C6 | At least 2 benefits (not features) are stated | No |
| C-C7 | Objection handling is present (addresses "but what if..." concerns) | No |
| C-C8 | Target audience is implicitly or explicitly identified | No |
| C-C9 | Transformation narrative (before → after) is present | Partial |
| C-C10 | Price anchoring or value comparison is used | No |

### Quality

| # | Assertion Pattern | Deterministic |
|---|---|---|
| C-Q1 | No banned AI words (full list: delve, tapestry, realm, landscape, ever-evolving, cutting-edge, robust, transformative, pivotal, vibrant, crucial, compelling, seamless, groundbreaking, leverage, harness, embark, navigate, unveil, facilitate, synergy, game-changer, unlock, unleash, elevate, utilize, endeavour, multifaceted) | Yes |
| C-Q2 | No em dashes (U+2014 '—') anywhere | Yes — character search |
| C-Q3 | Copy addresses reader as "you"/"your", not "we"/"our" in body | Yes — regex |
| C-Q4 | Urgency is genuine and specific (real deadline, limited quantity, seasonal) | No |
| C-Q5 | No passive voice in CTA (uses active: "Get" not "can be obtained") | Partial |
| C-Q6 | Headline leads with benefit, curiosity, or pain — not a bland statement | No |
| C-Q7 | Sentences average under 20 words (readability) | Yes — split and count |
| C-Q8 | No jargon without explanation (or jargon matches target audience knowledge level) | No |
| C-Q9 | Opening line hooks within first 10 words | No |
| C-Q10 | No filler sentences removable without losing meaning | No |
| C-Q11 | Contractions are used (reads conversational, not formal) | Yes — search for common contractions |
| C-Q12 | Power words present (free, new, proven, secret, instant, guaranteed, exclusive) | Yes — string search |

---

## Graphic Design Assertions

### Structural

| # | Assertion Pattern | Deterministic |
|---|---|---|
| D-S1 | Output dimensions match spec: width={W}px, height={H}px | Yes — regex for width/height values |
| D-S2 | Max N words per slide/card/section | Yes — parse text nodes, count words |
| D-S3 | All required sections/slides present (cover, body slides, CTA slide) | Partial |
| D-S4 | Code is syntactically valid (no unclosed tags, brackets, or broken references) | Yes — parse/lint |
| D-S5 | Image/asset references point to existing files | Yes — filesystem check |
| D-S6 | Component exports are valid (default export or named export) | Yes — regex |
| D-S7 | Responsive breakpoints are defined if target is web | Yes — search for @media or responsive classes |
| D-S8 | SVG viewBox attribute matches expected dimensions | Yes — parse viewBox |
| D-S9 | All interactive elements have hover/focus states | Partial — search for :hover, :focus |
| D-S10 | Animation keyframes are defined for all animated properties | Yes — search for @keyframes |

### Visual

| # | Assertion Pattern | Deterministic |
|---|---|---|
| D-V1 | Brand accent color #ED0D51 present in code | Yes — hex search |
| D-V2 | Background color matches spec (#0D0D0D for dark, #FFFFFF for light) | Yes — hex search |
| D-V3 | Headline font-family includes Big Shoulders (or specified brand font) | Yes — string search |
| D-V4 | Body font-family includes Manrope (or specified brand font) | Yes — string search |
| D-V5 | Headline font-size >= 48px (or Tailwind text-5xl / text-6xl) | Yes — regex for size values |
| D-V6 | Body font-size between 16-30px (or Tailwind text-base to text-2xl) | Yes — regex |
| D-V7 | Padding on content container is 40-80px (or Tailwind p-10 to p-20) | Yes — regex |
| D-V8 | Accent color used sparingly (not as background fill, only for emphasis) | Partial — count occurrences |
| D-V9 | Color contrast ratio >= 4.5:1 for text on background (WCAG AA) | Partial — compute from hex values |
| D-V10 | No more than 3 distinct font sizes used (visual hierarchy) | Yes — count unique font-size values |
| D-V11 | Visual elements aligned to a consistent grid | No — requires render |
| D-V12 | White space between sections is consistent (same gap value) | Yes — check gap/margin values |

### Quality

| # | Assertion Pattern | Deterministic |
|---|---|---|
| D-Q1 | No AI-slop patterns: blob people, generic stock references, purple/blue gradients | No |
| D-Q2 | No default placeholder images (placeholder.com, via.placeholder, unsplash random) | Yes — URL search |
| D-Q3 | Consistent border-radius across similar elements | Yes — count unique border-radius values |
| D-Q4 | Shadow values are subtle (no heavy drop shadows > 20px blur) | Yes — regex for shadow values |
| D-Q5 | Icon style is consistent (all outline OR all filled, not mixed) | No |
| D-Q6 | Text is legible at target viewing size (no text < 12px) | Yes — check min font-size |
| D-Q7 | Layout reads top-to-bottom with clear visual hierarchy | No — requires render or LLM |
| D-Q8 | Design communicates its message without additional explanation | No |
| D-Q9 | No orphaned elements (elements with no visual relationship to others) | No — requires render |
| D-Q10 | Tailwind classes are valid (no made-up utility classes) | Yes — validate against Tailwind catalog |

---

## Deterministic Checking Reference

For assertions marked deterministic, use these checking methods:

### Word Count
```
Split output on whitespace. Count tokens. Compare to limit.
```

### Banned Word Detection
```
For each word in BANNED_LIST:
  If word.lower() found in output.lower():
    FAIL with evidence: "Found '{word}' at position X"
```

### Em Dash Detection
```
Search for U+2014 (—) character.
If found: FAIL with evidence showing the sentence containing it.
```

### Hex Color Matching
```
Regex: /#[0-9A-Fa-f]{6}/g
Extract all hex codes. Check if required colors are present.
Check if forbidden colors are absent.
```

### Font Size Extraction
```
Regex: /font-size:\s*(\d+)px/ or /text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)/
Map Tailwind sizes: xs=12, sm=14, base=16, lg=18, xl=20, 2xl=24, 3xl=30, 4xl=36, 5xl=48, 6xl=60
Compare extracted values to spec.
```

### Padding/Margin Extraction
```
Regex: /padding:\s*(\d+)px/ or /p-(\d+)/ or /px-(\d+)/
Map Tailwind spacing: p-10=40px, p-12=48px, p-16=64px, p-20=80px
Compare to required range.
```

### Sentence Length
```
Split on sentence-ending punctuation (.!?).
Count words in each sentence.
Flag sentences over the word limit.
Average = total_words / total_sentences.
```

---

## Writing Effective Assertions

### The Goldilocks Zone

An assertion is effective when:
- It **passes** when the skill is loaded and working correctly
- It **fails** when the skill is NOT loaded (bare Claude output)

If an assertion passes in both conditions, it is too easy and does not differentiate skill quality. If it fails in both, it may be unrealistic.

### Tips

1. **Be specific.** "Uses PAS framework" is better than "Well-structured copy."
2. **Be measurable.** "Under 150 words" is better than "Concise."
3. **Include numbers.** "At least 2 benefits mentioned" is better than "Mentions benefits."
4. **Test both directions.** After writing assertions, mentally check: would bare Claude (no skill) fail this? If not, make it more specific.
5. **Prefer deterministic.** When possible, write assertions that can be checked with code. They are faster, cheaper, and more reliable.
6. **10 assertions per eval** is the sweet spot. Fewer misses nuances; more becomes expensive to grade.
7. **Mix types.** Include structural (2-3), content (3-4), and quality (3-4) assertions per eval.
8. **Anchor to the brief.** Reference specific details from the eval prompt in your assertions to prevent generic outputs from passing.
