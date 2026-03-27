# Defect-to-Skill Mapping

When a blatant defect is found in output, use this table to locate the likely gap in the producing skill's SKILL.md. Each row maps a defect category to where to look and what's commonly missing.

---

## Visual Defects

| Defect | Skill Section to Check | Common Gap Patterns | Typical Fix |
|--------|----------------------|---------------------|-------------|
| V1: Misspelling / garbled text | Prompt template, spelling rules, text content section | No explicit spelling reinforcement for high-risk words; headline text buried deep in prompt where model deprioritizes it | L1: Add "Spell every word in the headline exactly: [WORD1] [WORD2]..." near top of prompt template. L2: Add "CORRECT: INSTANTLY, WRONG: INRICIGA, INSTANLY" example |
| V2: Element overlap | Layout rules, composition section, element positioning | No z-order or spacing rules; elements positioned by percentage without accounting for variable text length | L1: Add explicit spacing minimums between elements. L3: Add layout verification checklist |
| V3: Text too small for mobile | Typography section, font size rules | Minimum font size not specified, or specified for desktop only | L1: Add "Minimum body text: 24px. Minimum headline: 48px. All sizes assume 1080px canvas width" |
| V4: Wrong colors / off-brand | Design specs, color rules, brand section | Background color not specified or specified only as positive ("use #0D0D0D") without negative constraints | L1: Add exact hex code. L1+: Add negative: "Do NOT use purple, blue, gradient, or any color not listed here" |
| V5: Missing required element | Template structure, output checklist, pre-delivery section | Element listed as optional or mentioned in passing; no checklist gate before output | L1: Add explicit requirement. L3: Add pre-delivery checklist with all required elements |
| V6: Partially rendered / merged letters | Font specification, typography rules | Font not explicitly specified, or specified font unavailable to the model causing fallback rendering | L1: Specify exact font name. L2: Add example of correct vs incorrect rendering |
| V7: Layout broken | Layout template, dimensions, padding rules | No explicit canvas dimensions; padding not specified; no safe zone defined | L1: Add canvas dimensions + padding. L3: Add layout verification checklist |
| V8: Wrong aspect ratio | Dimensions section, output format | Aspect ratio mentioned in passing but not as a hard constraint; no pixel dimensions stated | L1: Add "Output dimensions: WxH pixels. Aspect ratio: X:Y. This is non-negotiable." |
| V9: Prompt leakage | Prompt construction rules, negative constraints | No negative constraint telling the model not to render meta-instructions as text | L1: Add "Do NOT render the words CRITICAL, IMPORTANT, DO NOT, NOTE, EXACTLY, or MUST as visible text in the image. These are instructions, not content." |
| V10: Compositing failure | Compositing rules, layer instructions, photo placement | No explicit instructions for how layers combine; missing size/position specs for composited elements | L1: Add explicit layer sizing rules. L3: Add compositing verification checklist |

---

## Text Defects

| Defect | Skill Section to Check | Common Gap Patterns | Typical Fix |
|--------|----------------------|---------------------|-------------|
| T1: Banned AI words | Quality rules, banned words section, voice guidelines | Banned word list missing entirely; or present but incomplete; or present but not positioned prominently | L1: Add complete banned word list. If already present, L4: Move to prominent position (early in file, bold heading) |
| T2: Missing required section | Output format, template structure, section requirements | Section described in prose but not in a structured template; or template exists but section is optional | L1: Mark section as required. L3: Add output template with all required sections as checklist |
| T3: Wrong format | Output format section, template | Format described vaguely ("produce a carousel"); no structural template showing exact format | L1: Add explicit format template. L2: Add good/bad format example |
| T4: Placeholder text remaining | Template section, variable handling | Template uses placeholder syntax but no instruction to replace ALL placeholders before output | L1: Add "Replace every placeholder [BRACKET] and {{VARIABLE}} with real content. No placeholders in final output." |
| T5: Gross word count violation | Word count rules, length constraints | Word limit exists but applies to wrong unit (per-section vs per-slide); or limit is stated as suggestion not constraint | L1: Add explicit word count with unit: "Maximum 15 words per slide. Count every word." |
| T6: Duplicate content | Uniqueness rules, content variation | No instruction requiring unique content per section/slide | L1: Add "Every slide/section must contain unique content. No repeated paragraphs or bullet points." |
| T7: Wrong tone | Voice guidelines, brand voice section | Tone described abstractly ("professional") without concrete examples of what that sounds like | L2: Add good/bad tone examples. L4: Rewrite voice section with specific do/don't patterns |
| T8: Missing personalization | Voice guidelines, audience targeting | No instruction to address the reader directly | L1: Add "Address the reader as 'you'. Write as if speaking to one person." |
| T9: Em dashes present | Formatting rules, punctuation rules | Em dash ban missing entirely; or present but not prominent | L1: Add "Never use em dashes (---) or en dashes (--). Use regular hyphens (-) or rewrite the sentence." |
| T10: Gross structural error | Output template, structure rules | No explicit ordering requirement; template doesn't enforce sequence | L1: Add explicit ordering. L3: Add structural verification checklist |

---

## Diagnosis Workflow

When you find a defect, follow this decision tree:

```
1. Is the defect's topic mentioned ANYWHERE in SKILL.md?
   |
   +-- NO --> Gap type: MISSING RULE --> L1 fix (add the rule)
   |
   +-- YES --> Is the rule specific enough?
               |
               +-- NO (vague) --> Gap type: VAGUE RULE --> L1 fix (make it specific)
               |
               +-- YES --> Is it positioned prominently?
                           |
                           +-- NO (buried) --> Gap type: BURIED PRIORITY --> L4 (move/restructure)
                           |
                           +-- YES --> Does it have a negative constraint?
                                       |
                                       +-- NO --> Gap type: MISSING NEGATIVE --> L1 (add negative)
                                       |
                                       +-- YES --> Does it have an example?
                                                   |
                                                   +-- NO --> L2 (add example)
                                                   |
                                                   +-- YES --> Rule is well-written but model ignores it
                                                               --> Likely model-stochastic (B)
                                                               --> Retry 2x, then L3 (add checklist)
```

---

## Cross-Reference: Defect Clusters

Some defects frequently appear together. When you see one, check for the others:

| Primary Defect | Often Appears With | Shared Root Cause |
|---------------|-------------------|-------------------|
| V1 (misspelling) | V6 (merged letters) | Font rendering / text instruction positioning in prompt |
| V4 (wrong color) | V9 (prompt leakage) | Weak constraint section — model doesn't distinguish instructions from content |
| V5 (missing element) | V7 (layout broken) | Incomplete template — missing sections cascade to layout failures |
| T1 (banned words) | T7 (wrong tone) | Weak or missing voice guidelines section |
| T2 (missing section) | T3 (wrong format) | Incomplete output template |
| T4 (placeholders) | T10 (structural error) | Template handling instructions missing or unclear |

When fixing a cluster, identify the shared root cause and fix that instead of patching each defect individually. This is the one exception to the "one change per iteration" rule — if defects share the exact same root cause section, a single targeted fix can address them all.
