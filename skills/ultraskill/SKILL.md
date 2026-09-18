---
name: ultraskill
version: 2.0.0
description: "One front door for making creative output and the skills that produce it better. Reads the session and picks a pathway: polish (critique one finished creative and regenerate it, skill untouched), heal (trace blatant defects in an output back to the producing skill, mutate it, regenerate until clean), learn (eval-driven loop that mutates a skill until its assertion pass rate stops rising), or create and improve a skill (skill-creator writes it, then learn and heal run on it). Asks once only when two pathways are equally supported. Triggers: 'ultraskill', 'autoskill', 'polish this', 'critique and redo', 'make this creative better', 'heal this', 'heal the skill', 'fix and prevent', 'output is broken', 'improve skill', 'skill eval', 'benchmark skill', 'optimize skill', 'skill loop', 'self-improve', 'create and improve a skill', 'skill pipeline', 'perfect skill'."
---

# Ultraskill

Four pathways, one router. The router reads the session and picks; the pathway file it loads
carries the full procedure. Nothing in this file mutates anything; the pathway files do, and
only after the undo in the shared blocks exists.

| Pathway | Grades | Changes | Loads |
|---|---|---|---|
| **polish** | one finished creative, up to 100 checks | the output only | `references/polish.md` |
| **heal** | one real output, 12-row blatant-defect scan | the producing skill, then regenerates | `references/heal.md` |
| **learn** | a skill's outputs across `evals/evals.json` | the skill | `references/learn.md` |
| **create** | a new skill from `skill-creator` | the new skill, via learn and heal | `references/create.md` |

Neighbours, so the description above does not claim their work: bare "create a skill" with no
improvement asked for is `skill-creator`'s; "improve this" with no creative and no skill in
context is `/improve`'s (session-driven repair of tooling).

## Step 0: Detect

Five probes, all from the session. Ask the user nothing yet.

0. **Verb.** The user named a pathway: polish / critique / make this better → polish; heal /
   fix and prevent / output is broken → heal; evals / benchmark / pass rate / optimize the skill
   → learn; create and improve / new skill → create.
1. **Output.** An explicit path argument that is not a skill directory (no `SKILL.md` at that
   path); else the most recent generated file in the conversation; else the most recent creative
   text (copy, script, prompt, page).
2. **Producing skill.** Named by the user ("heal the carousel skill") or given as a path; else a
   skill invocation earlier in the conversation that preceded the output; else this path table,
   the weakest evidence, and it counts only when `<root>/<skill>/SKILL.md` exists in a skill root
   (a hit on a skill that is not installed leaves probe 2 unresolved):

   | Output pattern | Likely skill |
   |---|---|
   | `output/ads/` or a nano-banana command | `ad-creative-graphic` |
   | carousel slides, or `carousel` in the path | `carousels` (or `carousel-post` where that is the installed one) |
   | `output/banners/` or banner dimensions | `social-media-banner` |
   | `output/thumbnails/` or a YouTube thumb | `youtube-thumbnail` |
   | beat sheet or kinetic text | `kinetic-text-ad` |
   | email copy or a nurture sequence | `lgj-email-marketing` |
   | script with timestamps | `short-form-script` or `youtube-script` |

   A skill root here is either home root or the current project's own `.claude/skills`.
   Remember which rung resolved it. This table is the only copy; `references/heal.md` points here.
3. **Evals.** `<skill>/evals/evals.json` exists for the skill probe 2 resolved, **and probe 1
   found no output**. An output in hand with a resolved producing skill is heal even when that
   skill ships evals; otherwise any skill with evals could never be healed.
4. **Create ask.** "new skill", "create a skill", "skill for X".

Also recover the original brief (the request that produced the output). Heal and polish need it
to regenerate. If it cannot be recovered: when the one question below fires, it is asked inside
that question; when it does not, the only question is "What was the original request?" Either
way the router asks at most once.

## Routing

First match wins:

| Order | Pathway | Fires when |
|---|---|---|
| 1 | the verb's pathway | probe 0, when the probes it needs are also resolved (heal needs 1 and 2; learn needs 2, and `learn.md` writes `evals.json` from a template when none exists; polish needs 1; create needs 4 and the user did not name `skill-creator`). If they are not, fall through to orders 2-5 and say in the announce line why the verb was not honoured |
| 2 | create | probe 4, and the user did not name `skill-creator` themselves |
| 3 | learn | probe 3 |
| 4 | heal | probes 1 and 2 both resolved |
| 5 | polish | probe 1 only |

Two preconditions and one fallback, checked before anything is announced:

- **Deny list, mutating pathways only (heal, learn).** Never target `skill-creator`, a skill
  directory that is a symlink, or a directory under a plugins, vendor or plugin-cache path of
  either skill root (`~/.claude/skills` for Claude and `~/.agents/skills` for Codex are the two
  roots; neither is a git repo). Resolve a name against the root this skill was loaded from
  first, the other root second; an explicit path outside both roots is allowed and the same
  tests apply to it. A target on the list stops the run: "Not touching `<skill>`: it is
  <on the deny list because ...>", naming every reason that applies. Every item on this list is a
  mechanical test; nothing here is a judgment call.
- **The one question.** When heal and polish are both supported and probe 2 resolved only by
  the path table, ask once, verbatim: "Heal `<skill>` (mutates the skill, then regenerates) or
  polish the output only (skill untouched)?" and, if the brief could not be recovered, append
  "And what was the original request?" Unattended (no answer), take polish: it mutates nothing.
- **Nothing resolves.** "Nothing to work on. Generate something, name a skill, or say what skill
  to create." Stop.

After the preconditions pass, announce the pathway in one line, then load its reference file and
follow it. Do not load the others.

## Shared blocks

Every pathway file points here instead of restating these.

### Undo, established before the first mutation

Two copies in the scratchpad, taken unconditionally, repo or not:

```bash
IT0="<scratchpad>/<skill>-SKILL.md.iter0"     # immutable: the pre-loop file, what "undo" means in any report
ROLL="<scratchpad>/<skill>-SKILL.md.revert"   # rolling: advances on every kept mutation
cp <path-to-SKILL.md> "$IT0"; cp <path-to-SKILL.md> "$ROLL"
test -s "$IT0" && test -s "$ROLL"
```

If either copy is missing or empty, **the loop does not start.** A missing undo is a stop, not a
warning.

Then decide the per-iteration revert. Git is the revert only when all three hold:
`git -C "$(dirname <path>)" rev-parse --git-dir` succeeds, `git ls-files --error-unmatch <path>`
succeeds, and `git status --porcelain -- <path>` prints nothing. Otherwise the rolling copy is
the revert (`cp "$ROLL" <path>`), and the report says "undo: file baseline" so the reader knows
`git revert` is not available. Never commit pre-existing changes in someone else's repo on the
loop's behalf.

### Mutation ladder (full catalogue in `references/mutation-strategies.md`)

| Level | Strategy | When |
|---|---|---|
| L1 | Precision fix: add one specific rule | First attempt at any failure |
| L2 | Add a good/bad example | Rule exists, output ignores it |
| L3 | Add a checklist | Several related failures |
| L4 | Rewrite the section | Section patched 2+ times, still failing |
| L5 | Strategic reversal | 3+ reverts on the same failure |

One targeted change per iteration. Place a new rule near the top of its section (primacy); put a
negative constraint right after the positive rule it reinforces. Escalate only when the previous
level was reverted for the same failure. **Bloat guard:** past 2x the original byte size with
under 10% score gain, the next iteration is a consolidation pass, not a mutation.

When a mutation targets a rule that already existed, do not restate the rule. Write down the
argument that beat it, verbatim, and the counter. A rule that has already lost once loses again
to the same sentence.

### Banned words

`references/banned-words.md`: one shared list plus a copywriting overlay, U+2014 and U+2013
both banned, and the recorded pointer to the agent instruction file's own list.

### Commits

Write the message to a file, then `git commit -F <path>`. Never `-m` (backticks are command
substitution and the term vanishes from the message), never a heredoc (dies on the first
apostrophe). Both fail with exit 0.

### Images

`sips --resampleHeightWidthMax 1000 "<image>"` before any Read of an image. Claude crashes at
2000px with several images in context.

### Cost

Keep a running estimate of generation cost. Past 2.00 USD, pause, report the breakdown, stop.
Never write a dollar sign followed by a digit in a skill file: it loads as an empty string or as
the skill's second argument, and a cost guard written that way read as "0.00" in one session on
2026-09-09. Write the currency after the number.

### Autonomy, once a loop begins

Never stop to ask whether to continue, whether to commit or revert, or whether this is a good
stopping point; the stop table below is the only stop. Never pause between iterations. On an
unexpected error (git, file read, generation), attempt recovery three times, then log it and
continue to the next iteration. The human may be away from the keyboard. The one question in
Routing is asked before the loop starts, never inside it.

## Stop conditions

| Pathway | Stops when |
|---|---|
| polish | 3 passes, or 100% |
| heal | 0 defects; 10 iterations; 5 consecutive iterations with no reduction; every remaining defect is model-stochastic after 3 tries or a tool limitation; cost past 2.00 USD |
| learn | pass rate 1.0; 10 consecutive iterations with no gain; 3 consecutive reverts at best score 0.95 or above; bloat guard fires (consolidate, then resume); cost past 2.00 USD; user interrupt |
| create | closing checklist in `references/create.md` passes, or learn's stops |

Status line after each iteration, one line, in the pathway's own shape (`[Heal N] ...`,
`[Learn N] ...`, `Pass N: ...`).

## Rules that survive any consolidation pass

Marked load-bearing in the pathway files. Do not trim them for length.

- heal V11: a flaw you already noticed and argued away is a defect you declined to file.
- heal V12: dead space in a frame that will be cropped.
- heal T11: an unsourced number is a defect on anything a stranger will read.
- heal T12: register that misses the stated audience.
- "Write down the argument that beat the rule" (Mutation ladder, above).
- The skill roots are not git repos; the file baseline is the undo there (Undo, above).

## Files

```
SKILL.md                              this router
references/polish.md                  output-only critique and regenerate
references/heal.md                    output to skill-gap to mutation loop
references/learn.md                   eval-driven mutation loop
references/create.md                  skill-creator handoff, then learn and heal
references/mutation-strategies.md     L1-L5 in full, selection algorithm, anti-patterns
references/assertion-patterns.md      assertion library per domain (learn)
references/blatant-defect-catalog.md  expanded V/T checklists with false positives (heal)
references/defect-to-skill-mapping.md defect category to SKILL.md gap (heal)
references/banned-words.md            the one list
references/graphic-ad-references.json reference ads per type (polish, graphic ads)
evals/templates/*.evals.json          general, copywriting, graphic-design (learn, create)
scripts/score_report.py               prints a learn workspace summary
```
