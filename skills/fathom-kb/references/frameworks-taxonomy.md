# Frameworks Taxonomy

Decision tree for categorizing extracted coaching knowledge into the correct note type.

---

## Classification Decision Tree

```
Is this a piece of reusable knowledge?
├── NO → Skip (scheduling, small talk, personal details, one-off troubleshooting)
└── YES → What type of knowledge is it?
    │
    ├── Does it have 3+ steps or components in a structured system?
    │   ├── YES → Is it a general thinking tool or mental model?
    │   │   ├── YES → FRAMEWORK (mental model subtype)
    │   │   └── NO → Is it a repeatable process with clear inputs/outputs?
    │   │       ├── YES → FRAMEWORK (process subtype)
    │   │       └── NO → STRATEGY (structured but situational)
    │   └── NO → Continue below
    │
    ├── Does it solve a specific, concrete problem with actionable steps?
    │   ├── YES → STRATEGY
    │   └── NO → Continue below
    │
    ├── Is it a concern/resistance + a response/reframe pair?
    │   ├── YES → OBJECTION
    │   └── NO → Continue below
    │
    ├── Is it about coaching technique (how to coach) rather than content (what was coached)?
    │   ├── YES → LESSON
    │   └── NO → Continue below
    │
    └── Does it fit any type above if reframed?
        ├── YES → Reframe and classify
        └── NO → Skip or add as a bullet point in the call archive note
```

---

## Type Definitions

### Framework

A structured system with 3+ components that can be taught and reapplied.

**Subtypes:**
- **Process framework** — Step-by-step procedure (e.g., "The 5-Step Cold Email Audit")
- **Mental model** — Thinking tool for making decisions (e.g., "The Traffic Temperature Model")
- **Classification system** — Way to categorize or segment (e.g., "3 Types of Lead Magnets")

**Signals in transcript:**
- "Here's how I think about it..."
- "There are [N] steps/phases/layers..."
- "The framework is..."
- "First you... then you... finally you..."
- Whiteboard or visual explanation moments
- Coach explicitly names it

**Minimum bar:** Must have 3+ distinct steps or components. Two steps is a strategy, not a framework.

### Strategy

A specific, actionable approach to solve a concrete problem.

**Signals in transcript:**
- "What I'd do is..."
- "Try this..."
- "The play here is..."
- Specific tool or platform recommendations
- Concrete metrics or benchmarks mentioned
- Tactical advice for a specific situation

**Boundary with Framework:** A strategy is situational (applies to a specific problem). A framework is general (applies across situations). If you could teach it in a workshop as a standalone system, it's a framework.

### Objection

A concern or resistance point paired with a proven reframe.

**Signals in transcript:**
- "But what about..."
- "I'm worried that..."
- "Isn't that just..."
- "I don't think that works because..."
- Coach responds with a reframe, analogy, or counter-example
- Coachee says "oh, I never thought of it that way"

**Minimum bar:** Must have both the objection AND a response. An unresolved concern is not an objection note — it's a topic for the next call.

### Lesson

An insight about coaching practice itself.

**Signals in transcript:**
- A question that unlocked a breakthrough
- A technique that shifted the coachee's energy
- A mistake the coach caught and corrected in real-time
- A pattern the coach noticed across clients
- A moment where slowing down / asking more / saying less was effective

**Boundary with Strategy:** A lesson is about HOW to coach. A strategy is about WHAT to coach. "Ask before prescribing" is a lesson. "Use a 3-email warm-up sequence" is a strategy.

---

## Edge Cases

| Scenario | Classification | Reasoning |
|----------|---------------|-----------|
| Coach shares a 5-step system but only covers 2 steps due to time | **Framework** (partial) | Note it's incomplete, add what's known, flag for completion in next call |
| Coachee describes their own process that works well | **Strategy** | It's actionable but not yet structured enough to be a framework |
| Coach tells a story to illustrate a point | **Skip** (or include as an example in a related note) | Stories support knowledge but aren't knowledge themselves |
| Discussion about a specific tool's features | **Strategy** (if actionable) or **Skip** (if just exploration) | Only capture if there's a clear "do X with tool Y" takeaway |
| Coachee pushes back and coach agrees the concern is valid | **Skip** | Not an objection-reframe if the coach concedes. May be a lesson though |
| Coach asks a great question that leads to breakthrough | **Lesson** | The question itself is the coaching technique worth preserving |
| Same framework discussed in depth vs. mentioned briefly | **Framework** if discussed, **reference in archive** if just mentioned | Only create a full note if there's enough substance for 3+ steps |

---

## Tagging Conventions

Each note gets tags based on its type plus topic:

| Type | Required Tags | Common Topic Tags |
|------|--------------|-------------------|
| Framework | `coaching`, `framework` | `cold-email`, `outbound`, `sales`, `mindset`, `lead-gen`, `offer`, `positioning` |
| Strategy | `coaching`, `strategy` | Same as above + `linkedin`, `automation`, `deliverability`, `reply-rate` |
| Objection | `coaching`, `objection` | Same as above + `resistance`, `mindset-shift` |
| Lesson | `coaching`, `lesson`, `coaching-practice` | `questioning`, `pacing`, `rapport`, `breakthrough`, `technique` |

---

## Granularity Rules

- **One note per distinct framework/strategy** — not one giant dump per call
- **Target: 2-5 standalone notes per call** — if you're extracting 10+, you're being too granular
- **If two frameworks are tightly coupled**, consider one note with both (e.g., "The Outbound Stack" which contains "The Warm-Up Sequence" as step 2)
- **If a strategy is just one step of a framework**, include it as a step in the framework note rather than a separate strategy note
