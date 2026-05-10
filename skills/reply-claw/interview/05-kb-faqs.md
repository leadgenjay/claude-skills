# Phase 5 — Knowledge Base: FAQs

## Purpose
Collect the most-asked questions and canonical answers to populate KB/faq files. One markdown file per FAQ.

## Pre-checks
- None

## Questions

### Q1 — FAQ Count
**Header**: "FAQ count"
**Type**: AskUserQuestion (single-select)
**Question**: "How many FAQs do you want to document for the reply agent?"
**Options**:
- "3 FAQs"
- "4 FAQs"
- "5 FAQs"
- "6 FAQs"
- "7 FAQs"
**Persists to**: Used by wizard to loop through FAQs

### Q2 — FAQ Question (per FAQ, loop)
**Header**: "Question"
**Type**: free-text
**Question**: "FAQ {N}: What's the question? (Example: 'How much does it cost?')"
**Validation**: Non-empty, max 200 chars
**Persists to**: `config.kb.faqs[].question`

### Q3 — FAQ Answer (per FAQ)
**Header**: "Answer"
**Type**: free-text
**Question**: "Your canonical 1-2 sentence answer. (Example: 'We charge per result, starting at $X. Call to discuss your specific needs.')"
**Validation**: Non-empty, max 500 chars
**Persists to**: `config.kb.faqs[].answer`
**Render to**: `kb/{slug}/faqs/faq-{N}.md` (one file per FAQ)
