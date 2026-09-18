# Banned words and phrases

One list, built 2026-09-18 as the union of the two literal lists the merged skills carried. Each
entry is tagged with where it came from. The third source was a pointer, not a list, and is kept
as a pointer below.

## Shared list (every pathway, every domain)

Any match is a fail. Case-insensitive, whole word.

Source `polish` = the old output-polish skill's Universal check 1. Source `learn` = the old
eval-loop skill's copywriting adapter. The two lists were identical except for one annotation,
so every word below is tagged `polish, learn`.

| Word | Source |
|---|---|
| delve | polish, learn |
| tapestry | polish, learn |
| realm | polish, learn |
| landscape | polish, learn |
| ever-evolving | polish, learn |
| cutting-edge | polish, learn |
| robust | polish, learn |
| transformative | polish, learn |
| pivotal | polish, learn |
| vibrant | polish, learn |
| crucial | polish, learn |
| compelling | polish, learn |
| seamless | polish, learn |
| groundbreaking | polish, learn |
| leverage | polish, learn |
| harness | polish, learn |
| embark | polish, learn |
| navigate (metaphorical use; `polish` carried the qualifier, `learn` did not) | polish, learn |
| unveil | polish, learn |
| facilitate | polish, learn |
| synergy | polish, learn |
| game-changer | polish, learn |
| unlock | polish, learn |
| unleash | polish, learn |
| elevate | polish, learn |
| utilize | polish, learn |
| endeavour | polish, learn |
| multifaceted | polish, learn |

## Banned phrases (every pathway, every domain)

Source: `polish` Universal check 2.

- "In today's ever-evolving..."
- "Unlock the power of"
- "Master the art of"
- "Let's delve into"
- "Harness the power of"
- "Push the boundaries of"

## Dashes (every pathway, every domain)

U+2014 (em dash) and U+2013 (en dash). Any match is a fail; regular hyphens only. Source:
`polish` Universal check 3 (both code points), `learn` copywriting adapter (U+2014 only), heal's
T9 (both). The union is both.

## Copywriting overlay

Nothing beyond the shared list today. `learn`'s copywriting adapter applied the same words; it
is recorded here as the place a copywriting-only entry goes if one is ever added, so the shared
list stays the intersection.

## Pointer (recorded, not inlined)

`pointer` — heal's T1 read "Regex scan against banned word list from CLAUDE.md". That file
differs per machine and per project, so its contents are deliberately not copied here. When an
agent instruction file (CLAUDE.md for Claude, AGENTS.md for Codex) is loaded and carries a banned
list, T1 scans against it **in addition to** this file.
