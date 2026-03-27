# Extraction Prompts

7 targeted queries to run against each coaching call transcript in NotebookLM. Run these using `notebook_query` with the specific source ID of the newly added transcript.

---

## Query 1: Frameworks & Mental Models

```
Identify all frameworks, mental models, systems, and step-by-step methodologies discussed in this coaching call. For each one:
- Name it (use the name given in the call, or create a descriptive name)
- List the steps or components (minimum 3)
- Explain when/why to use it
- Note who introduced it (coach or coachee)

Only include frameworks that are reusable beyond this specific conversation. Skip one-off troubleshooting.
```

## Query 2: Strategies & Tactics

```
Extract all specific, actionable strategies and tactics discussed in this coaching call. For each:
- Name the strategy
- Describe exactly what to do (step-by-step if possible)
- What problem does it solve?
- Any metrics or benchmarks mentioned (e.g., "aim for 30% reply rate")
- Any tools or platforms referenced

Focus on strategies that could help other clients, not just this coachee's unique situation.
```

## Query 3: Objections & Responses

```
Find all objections, concerns, or resistance points raised during the call, along with how they were addressed. For each:
- The objection (in the coachee's words)
- The reframe or response given
- Why the reframe works (the underlying principle)
- Whether the coachee accepted the reframe

Include both explicit objections ("I don't think cold email works") and implicit resistance ("I'm not sure about that approach").
```

## Query 4: Recurring Themes & Patterns

```
What themes or patterns appear repeatedly throughout this coaching call? Look for:
- Topics that came up more than once
- Underlying beliefs or assumptions the coachee holds
- Mindset patterns (abundance vs scarcity, action vs analysis paralysis, etc.)
- Skill gaps that surfaced multiple times
- Recurring blockers or challenges

For each theme, note approximately how many times it surfaced and in what context.
```

## Query 5: Key Insights & Breakthroughs

```
Identify the most impactful moments in this coaching call — the "aha moments" and breakthroughs. For each:
- What was the insight or realization?
- What triggered it? (a question, an example, a reframe?)
- How did the coachee react?
- What action or commitment followed?

Focus on moments where the coachee's thinking visibly shifted, not just information transfer.
```

## Query 6: Implementation Challenges & Solutions

```
Extract all implementation challenges, blockers, and problems discussed, along with the solutions or workarounds provided. For each:
- The challenge (what's not working or what's blocked)
- Root cause discussed
- Solution or next steps agreed upon
- Any resources, tools, or references recommended
- Timeline or priority assigned

Include technical challenges (tool/platform issues) and strategic challenges (market, positioning, process).
```

## Query 7: Powerful Coaching Questions

```
List the most effective questions asked during this coaching session — questions that led to deeper thinking, breakthroughs, or new commitments. For each:
- The exact question (or close paraphrase)
- What it was designed to surface
- How the coachee responded
- Why it was effective in context

Focus on questions worth reusing in future coaching sessions, not logistical questions.
```

---

## Usage Notes

- Run each query individually with `notebook_query`, passing the specific `source_ids` for the call transcript
- Queries are ordered from most structured (frameworks) to most nuanced (coaching questions)
- If a query returns thin results, that's fine — not every call has all 7 types of knowledge
- For very long calls (>60 min), consider running a pre-query: "Summarize the main topics covered in this call" to orient before the 7 extraction queries

### Query Selection by Call Type

Not all 7 queries are equally relevant for every call type. Use this matrix:

| Query | Group Coaching / AMA | Buildout Strategy | 1:1 Coaching |
|-------|---------------------|-------------------|--------------|
| 1. Frameworks | **Always** | **Always** | **Always** |
| 2. Strategies | **Always** | **Always** | **Always** |
| 3. Objections | **Always** | **Always** | **Always** |
| 4. Patterns | **Always** | **Always** | **Always** |
| 5. Breakthroughs | **Always** | Try — skip if thin | **Always** |
| 6. Implementation Challenges | Try — skip if thin | **Always** | **Always** |
| 7. Coaching Questions | **Always** | Try — skip if thin | **Always** |

**Minimum requirement:** Always run queries 1-4. For queries 5-7, run all three but accept thin results gracefully for call types where they're less applicable. Never skip a query without trying it first — buildout calls can surface unexpected coaching moments, and AMAs can reveal implementation blockers.
