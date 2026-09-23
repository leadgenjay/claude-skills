#!/usr/bin/env python3
"""Stdin-to-stdout filter that masks secrets and payment data in text excerpts.
Fail-closed on any exception (writes a suppression marker and exits 1, never the
raw input)."""

import re
import sys

MASK = "[masked]"
SUPPRESS = "[excerpt suppressed: masker error]\n"

_PEM = re.compile(
    r"-----BEGIN ([A-Z ]*PRIVATE KEY)-----.*?-----END \1-----",
    re.DOTALL,
)
_GH = re.compile(r"\b(?:github_pat_|ghp_|gho_|ghs_)[A-Za-z0-9_]{8,}")
_AKIA = re.compile(r"\bAKIA[0-9A-Z]{16}")
_SK = re.compile(r"(?<![A-Za-z0-9])sk-[A-Za-z0-9_-]{8,}")
_XOX = re.compile(r"(?<![A-Za-z0-9])xox[abprs]-[A-Za-z0-9-]{8,}")
_BEARER = re.compile(r"\b(Bearer\s+)\S+")
_CVV = re.compile(
    r"(?i)(security code|CVV2|CVV|CVC)(\s*[:\=]?\s*)(\d{3,4})\b"
)
_CARD = re.compile(r"(?<!\d)\d(?:[ -]?\d){12,18}(?!\d)")
_B64 = re.compile(
    r"(?<![A-Za-z0-9+/=_-])[A-Za-z0-9+/=_-]{40,}(?![A-Za-z0-9+/=_-])"
)
_HEX = re.compile(r"(?<![0-9a-fA-F])[0-9a-fA-F]{32,}(?![0-9a-fA-F])")


def _mask_if_mixed(match):
    text = match.group(0)
    has_digit = False
    has_letter = False
    for ch in text:
        if ch.isdigit():
            has_digit = True
        elif ch.isalpha():
            has_letter = True
        if has_digit and has_letter:
            return MASK
    return text


def mask(text):
    text = _PEM.sub(MASK, text)
    text = _GH.sub(MASK, text)
    text = _AKIA.sub(MASK, text)
    text = _SK.sub(MASK, text)
    text = _XOX.sub(MASK, text)
    text = _BEARER.sub(r"\1" + MASK, text)
    text = _CVV.sub(r"\1\2" + MASK, text)
    text = _CARD.sub(MASK, text)
    text = _B64.sub(_mask_if_mixed, text)
    text = _HEX.sub(MASK, text)
    return text


def run_self_test():
    ghp = "ghp_" + ("A1b2" * 9)
    # Fixtures are built at runtime so no fake secret ships as one literal.
    hex40 = "0123456789abcdef" * 2 + "01234567"
    pem = (
        "-----BEGIN PRIVATE KEY-----\n"
        "abc\n"
        "-----END PRIVATE KEY-----"
    )
    cases = (
        ("spaced-card", "4242 4242 4242 4242", MASK),
        ("plain-card", "4242424242424242", MASK),
        ("cvv", "CVV: 123", "CVV: " + MASK),
        ("sk", "sk-abc123DEF456ghi", MASK),
        ("xoxb", "xoxb-1234-5678-abcdEFGH", MASK),
        ("ghp", ghp, MASK),
        ("hex40", hex40, MASK),
        ("hex-letters-only", "deadbeef" * 5, MASK),
        ("digits-32", "1234567890" * 3 + "12", MASK),
        ("pem", pem, MASK),
        (
            "bearer",
            "Authorization: Bearer abc.def.ghi123",
            "Authorization: Bearer " + MASK,
        ),
        (
            "benign",
            "The morning briefing ran at 7:30 and sent 3 messages.",
            "The morning briefing ran at 7:30 and sent 3 messages.",
        ),
        (
            "timestamp",
            "2026-09-12 07:30:01 INFO cron tick ok",
            "2026-09-12 07:30:01 INFO cron tick ok",
        ),
    )
    failed = 0
    for name, src, expected in cases:
        got = mask(src)
        if got == expected:
            sys.stdout.write("PASS %s\n" % name)
        else:
            sys.stdout.write("FAIL %s: %s\n" % (name, got))
            failed += 1
    return 1 if failed else 0


def _run(argv):
    if "--force-error" in argv:
        raise RuntimeError("force-error")
    if "--self-test" in argv:
        return run_self_test()
    masked = mask(sys.stdin.read())
    sys.stdout.write(masked)
    return 0


def main(argv):
    try:
        return _run(argv)
    except Exception:
        sys.stdout.write(SUPPRESS)
        return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
