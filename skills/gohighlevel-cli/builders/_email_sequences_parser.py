"""Parser + GHL-HTML formatter for the v2 email-sequence markdown files.

Source files live in the social-media-tool repo at
`docs/email-sequences/*.md` and share one format:

    ## E1 - D0 - Welcome + the outcome (immediate, ~5 min ...)

    **Subject A:** ...
    **Subject B:** ...
    **Awareness Level:** ...
    **Word Count:** ~245

    ---

    BODY markdown (paragraphs, `- ` bullets, **bold**, `**[>> anchor](url)**`
    CTA links, `> [TESTIMONIAL ...]` blockquote placeholders)

    ---

Headers also appear as `## A1 - D0 - ...` / `## B1 - ...` / `## C1 - ...`
(WF6 branches) and `## SMS - D0 + 5min after E1 - ...` (WF5 SMS step).

This module does NOT touch GHL. It is imported by the per-workflow builders
(`wf1-course-interest-builder.py`, etc.). The GHL HTML conventions mirror
`docs/email-sequences/_modules/_voice-rules.md`:
  - every <p> gets `line-height: 1.5`, 16px arial, body color rgb(13,13,13)
  - blank source lines become <br/> spacers
  - zero whitespace between adjacent tags
  - standard CTA blue rgb(0,87,255); final-email CTA red rgb(255,0,35) bold
"""
from __future__ import annotations

import re
import uuid
from dataclasses import dataclass, field
from pathlib import Path

# ── Section header ────────────────────────────────────────────────────────
# "## E1 - D0 - title"  /  "## A3 - D3 - title"  /  "## SMS - D0 + 5min - title"
# "## T2 - 24 hours before appointment - title"  (reminder touchpoints, no D#)
# "## T4 - Optional: post-no-show recovery (...)"  (no separate timing segment)
# Separators are literal " - " (space-hyphen-space) so within-word hyphens
# like "post-no-show" / "Show-up" never split the header. The middle timing
# segment is optional.
_HEADER_RE = re.compile(
    r"^##\s+(?P<code>SMS|[EABCT]\d+)\s+-\s+(?:(?P<timing>.+?)\s+-\s+)?(?P<title>.+?)\s*$"
)
_DAY_RE = re.compile(r"D(\d+)")
_META_RE = re.compile(r"^\*\*(?P<key>[A-Za-z][A-Za-z ]+?):\*\*\s*(?P<val>.*)$")
_RULE_RE = re.compile(r"^-{3,}\s*$")

# ── Inline markdown ───────────────────────────────────────────────────────
_CTA_RE = re.compile(r"^\*\*\[([^\]]+)\]\(([^)]+)\)\*\*$")          # whole-line CTA
_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")                    # inline link
_BOLD_RE = re.compile(r"\*\*([^*]+)\*\*")                            # **bold**
_BLOCKQUOTE_RE = re.compile(r"^>\s*")
_TESTIMONIAL_RE = re.compile(r"^\[TESTIMONIAL[^\]]*\]:\s*", re.IGNORECASE)

# ── GHL HTML fragments ────────────────────────────────────────────────────
_P_OPEN = '<p style="margin:0px; line-height: 1.5; padding-left: 0px!important;">'
_BODY_SPAN_OPEN = '<span style="font-size: 16px; font-family: arial; color: rgb(13, 13, 13)">'
_LINK_SPAN = '<span style="font-size: 16px; font-family: arial; color: rgb(0, 87, 255)">'
_RED_SPAN = '<span style="font-size: 16px; font-family: arial; color: rgb(255, 0, 35)">'
_ANCHOR = '<a target="_blank" rel="noopener noreferrer nofollow" href="{url}">'

FOOTER_HTML = (
    "<br/>"
    '<p style="margin:0px; line-height: 1.5; text-align: center; padding-left: 0px!important;">'
    '<span style="font-size: 16px; font-family: Arial, sans-serif; color: rgb(0, 0, 0)">'
    "==================================================</span></p><br/>"
    '<p style="margin:0px; line-height: 1.5; text-align: left; padding-left: 0px!important;">'
    '<span style="font-size: 14px; color: rgb(114, 114, 115)">'
    "846 NW 24th Ave | Boca Raton | FL 33496 | United States.</span></p>"
    '<p style="margin:0px; line-height: 1.5; text-align: left; padding-left: 0px!important;">'
    '<span style="font-size: 14px; color: rgb(114, 114, 115)">'
    '<a href="{{unsubscribe_link}}" style="color: rgb(114, 114, 115); text-decoration: underline;">'
    "Unsubscribe</a></span></p>"
)


def _uid() -> str:
    return str(uuid.uuid4())


# ── GHL workflow_goal step ────────────────────────────────────────────────
# Schema mirrored verbatim from a live LGJ workflow_goal step (probed
# 2026-05-22 off legacy WF1 `9de2fd79`). `workflow_goal` is in the CLI's
# VERIFIED_ACTIONS but CampaignBuilder ships no helper -- this is it.

def goal_step(name: str, tags: list[str], action: str = "exit") -> dict:
    """Build a workflow_goal step: contact exits when ANY listed tag is added."""
    return {
        "id": _uid(),
        "type": "workflow_goal",
        "name": name,
        "attributes": {
            "op": "or",
            "segments": [
                {
                    "op": "or",
                    "conditions": [
                        {
                            "goal_condition": "add_contact_tag",
                            "extras": {"tags": list(tags)},
                            "id": _uid(),
                        }
                    ],
                }
            ],
            "type": "workflow_goal",
            "action": action,
        },
    }


# ── Data model ────────────────────────────────────────────────────────────

@dataclass
class EmailRecord:
    code: str                       # "E1", "A3", "SMS", "T2"
    kind: str                       # "email" | "sms"
    day: int | None                 # cumulative day from trigger, or None
                                    # (reminder touchpoints time off the
                                    # appointment, not a fixed day)
    title: str
    timing: str = ""                # raw header timing text ("D0",
                                    # "24 hours before appointment", ...)
    subject_a: str = ""
    subject_b: str = ""
    body_md: str = ""
    meta: dict = field(default_factory=dict)

    @property
    def index(self) -> int:
        m = re.search(r"\d+", self.code)
        return int(m.group()) if m else 0


# ── Inline formatter ──────────────────────────────────────────────────────

def _render_inline(text: str) -> str:
    """Convert inline links and **bold** inside a body paragraph."""
    text = _LINK_RE.sub(
        lambda m: f'{_ANCHOR.format(url=m.group(2))}{_LINK_SPAN}{m.group(1)}</span></a>',
        text,
    )
    text = _BOLD_RE.sub(
        r'<strong><span style="font-size: 16px; font-family: arial">\1</span></strong>',
        text,
    )
    return text


def _cta_paragraph(anchor: str, url: str, red: bool) -> str:
    if red:
        inner = f"<strong>{_RED_SPAN}{anchor}</span></strong>"
    else:
        inner = f"{_LINK_SPAN}{anchor}</span>"
    return f"{_P_OPEN}{_ANCHOR.format(url=url)}{inner}</a></p>"


def to_ghl_html(body_md: str, cta_color: str = "blue", footer: bool = True) -> str:
    """Render an email body markdown block to inline-styled GHL HTML.

    - whole-line `**[anchor](url)**` becomes a styled CTA paragraph
    - when `cta_color == "red"` only the FIRST CTA in the email is rendered
      red+bold (the primary urgency CTA); any later CTA stays standard blue
      (e.g. WF5 E5's secondary `/dfy-deposit` link)
    - blockquote `> ` prefixes and `[TESTIMONIAL ...]:` markers are stripped
    - blank source lines become <br/> spacers
    - footer (address + unsubscribe) appended unless `footer=False`
    """
    red_first = cta_color == "red"
    cta_seen = False
    parts: list[str] = []
    for raw in body_md.strip().split("\n"):
        line = raw.strip()
        if not line:
            parts.append("<br/>")
            continue
        line = _BLOCKQUOTE_RE.sub("", line)
        line = _TESTIMONIAL_RE.sub("", line)
        if not line:
            parts.append("<br/>")
            continue
        cta = _CTA_RE.match(line)
        if cta:
            parts.append(_cta_paragraph(cta.group(1), cta.group(2),
                                        red=red_first and not cta_seen))
            cta_seen = True
            continue
        parts.append(f"{_P_OPEN}{_BODY_SPAN_OPEN}{_render_inline(line)}</span></p>")

    html = "".join(parts)
    if footer:
        html += FOOTER_HTML
    # collapse any whitespace between adjacent tags (GHL renders it literally)
    return re.sub(r">\s+<", "><", html)


# ── File parser ───────────────────────────────────────────────────────────

def parse_sequence_file(path: str | Path) -> list[EmailRecord]:
    """Parse a docs/email-sequences/*.md file into ordered EmailRecords.

    Everything from the first top-level `# Build notes` heading onward is
    ignored -- that is build documentation, not email copy.
    """
    text = Path(path).read_text(encoding="utf-8")

    # Drop trailing build-notes / template / verification sections.
    cut = re.search(r"^#\s+Build notes", text, re.MULTILINE)
    if cut:
        text = text[: cut.start()]

    lines = text.split("\n")
    records: list[EmailRecord] = []
    i = 0
    n = len(lines)
    while i < n:
        m = _HEADER_RE.match(lines[i])
        if not m:
            i += 1
            continue
        code = m.group("code")
        timing = (m.group("timing") or "").strip()
        day_m = _DAY_RE.match(timing)
        rec = EmailRecord(
            code=code,
            kind="sms" if code == "SMS" else "email",
            day=int(day_m.group(1)) if day_m else None,
            title=m.group("title").strip(),
            timing=timing,
        )
        i += 1
        # Collect this section's lines up to the next header / top-level heading.
        section: list[str] = []
        while i < n and not _HEADER_RE.match(lines[i]) and not lines[i].startswith("# "):
            section.append(lines[i])
            i += 1

        # Metadata lines come before the first horizontal rule; body sits
        # between the first and the last horizontal rule.
        rule_idxs = [j for j, ln in enumerate(section) if _RULE_RE.match(ln)]
        meta_lines = section[: rule_idxs[0]] if rule_idxs else section
        for ln in meta_lines:
            mm = _META_RE.match(ln.strip())
            if not mm:
                continue
            key, val = mm.group("key").strip().lower(), mm.group("val").strip()
            rec.meta[key] = val
            if key == "subject a":
                rec.subject_a = val
            elif key == "subject b":
                rec.subject_b = val

        if len(rule_idxs) >= 2:
            body = section[rule_idxs[0] + 1 : rule_idxs[-1]]
        elif rule_idxs:
            body = section[rule_idxs[0] + 1 :]
        else:
            body = section
        rec.body_md = "\n".join(body).strip()
        records.append(rec)

    return records
