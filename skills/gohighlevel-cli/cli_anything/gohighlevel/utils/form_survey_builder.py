"""Builders for GHL forms and surveys via the internal API.

EXPERIMENTAL: uses backend.leadconnectorhq.com (internal API) with the Firebase
session token. Own-account-only. Gated behind --experimental in the CLI.

Why this module exists
----------------------
The forms/surveys internal services require BOTH a `token-id` header AND a
`Version: 2021-07-28` header (the workflow endpoints don't need Version, so the
base client omits it — we pass it explicitly here).

The survey service is unforgiving: it returns 201 but SILENTLY DROPS the whole
formData if the envelope is incomplete or any field object is missing required
keys. So the builders below always emit the full formData envelope and complete
per-field objects. Forms are more tolerant, but we normalize them the same way
for consistency.

Input JSON shape (both forms and surveys)
-----------------------------------------
A simple spec authored by hand or by an agent; the builder expands it into the
full GHL schema.

Form spec:
    {
      "name": "Media Feature Application",
      "fields": [
        {"kind": "header", "text": "<strong>About You</strong>", "align": "center"},
        {"kind": "html",   "html": "<p>Intro copy.</p>"},
        {"type": "text",  "tag": "first_name", "label": "First Name", "width": 50},
        {"type": "text",  "tag": "last_name",  "label": "Last Name",  "width": 50},
        {"type": "email", "tag": "email", "label": "Email", "required": true}
      ]
    }

Survey spec (fields grouped into slides):
    {
      "name": "PR Fit Survey",
      "slides": [
        {"name": "Your Info", "button": "Next", "fields": [ ...same field specs... ]},
        {"name": "Your Goals", "button": "Submit", "fields": [ ... ]}
      ]
    }

Field spec keys: type (text|email|large_text|number|phone|single_options|
multiple_options|date|file_upload|signature|terms_and_conditions), tag, label,
placeholder, required (bool), width (form only: 25/33/50/100), options (list,
for *_options types). kind:"header" and kind:"html" are section/content blocks.
"""
from __future__ import annotations

from typing import Any

VERSION_HEADER = {"Version": "2021-07-28"}

# Field types that carry picklist options
_OPTION_TYPES = frozenset(["single_options", "multiple_options", "radio", "checkbox"])
# Non-input decorative blocks
_BLOCK_TYPES = frozenset(["h1", "header", "html", "customHtml"])

_DEFAULT_BUTTON = {
    "background": "18BD5BFF",
    "color": "FFFFFF",
    "fontFamily": "Roboto",
    "weight": 700,
    "border": {
        "border": 0,
        "radius": 6,
        "padding": {"top": 12, "bottom": 12, "left": 24, "right": 24},
    },
}


def _norm_field(spec: dict[str, Any], *, for_survey: bool) -> dict[str, Any]:
    """Expand a compact field spec into a full GHL field object."""
    kind = spec.get("kind")

    # --- Section header block ---
    if kind == "header" or spec.get("type") in ("h1", "header"):
        text = spec.get("text") or spec.get("label") or ""
        if not text.lstrip().startswith("<"):
            text = f"<p>{text}</p>"
        f = {
            "active": True,
            "type": "h1",
            "tag": "header",
            "label": text,
            "placeholder": "header",
            "standard": True,
        }
        if not for_survey:
            f.update({
                "align": spec.get("align", "left"),
                "color": spec.get("color", "#0d0d0d"),
                "fontFamily": spec.get("fontFamily", "Inter"),
                "weight": int(spec.get("weight", 700)),
                "typeLabel": "Header",
            })
        return f

    # --- Raw HTML content block (forms only; surveys ignore) ---
    if kind == "html" or spec.get("type") in ("html", "customHtml"):
        html = spec.get("html") or spec.get("label") or ""
        return {
            "active": True,
            "type": "html",
            "tag": "customHtml",
            "label": html,
            "placeholder": "Custom HTML",
            "standard": True,
        }

    # --- Input field ---
    ftype = spec.get("type", "text")
    tag = spec.get("tag")
    if not tag:
        raise ValueError(f"field of type {ftype!r} is missing required 'tag'")
    label = spec.get("label", tag.replace("_", " ").title())
    placeholder = spec.get("placeholder", label)
    required = bool(spec.get("required", False))

    # Submit buttons are native styled controls, not ordinary input fields.
    # Passing them through the generic field envelope makes GHL fall back to
    # its dark default button and drops the caller's CTA styling.
    if ftype == "submit":
        padding = spec.get(
            "padding", {"top": 14, "bottom": 14, "left": 24, "right": 24}
        )
        return {
            "active": True,
            "type": "submit",
            "tag": tag,
            "label": label,
            "placeholder": placeholder,
            "standard": True,
            "hiddenFieldQueryKey": tag,
            "fieldWidthPercentage": int(spec.get("width", 100)),
            "fullwidth": bool(spec.get("fullwidth", True)),
            "align": spec.get("align", "center"),
            "bgColor": spec.get("bgColor", "18BD5BFF"),
            "color": spec.get("color", "FFFFFFFF"),
            "fontFamily": spec.get("fontFamily", "Roboto"),
            "fontSize": int(spec.get("fontSize", 16)),
            "weight": int(spec.get("weight", 700)),
            "border": int(spec.get("border", 0)),
            "borderColor": spec.get("borderColor", "00000000"),
            "borderType": spec.get("borderType", "solid"),
            "borderRadius": int(spec.get("borderRadius", 8)),
            "padding": padding,
            "submitSubText": spec.get("submitSubText", ""),
        }

    f: dict[str, Any] = {
        "active": True,
        "type": ftype,
        "tag": tag,
        "label": label,
        "placeholder": placeholder,
        "required": required,
        "standard": True,
        "hidden": False,
        "hiddenFieldQueryKey": tag,
    }
    if ftype in _OPTION_TYPES:
        opts = spec.get("options") or spec.get("picklistOptions") or []
        f["picklistOptions"] = list(opts)
    if ftype == "text" and spec.get("countryPicker"):
        f["enableCountryPicker"] = True

    # Forms support per-field column width; surveys are single-column.
    if not for_survey:
        f["fieldWidthPercentage"] = int(spec.get("width", 100))
        f["preview"] = ""

    return f


def build_form_payload(spec: dict[str, Any]) -> dict[str, Any]:
    """Return the POST body for creating/updating a form's content."""
    fields = [_norm_field(fs, for_survey=False) for fs in spec.get("fields", [])]
    style = spec.get("style", {})
    form_action = spec.get("formAction") or {
        "type": "message",
        "message": spec.get("thankYouMessage", "Thanks — we'll be in touch shortly."),
    }
    return {
        "name": spec["name"],
        "formData": {
            "form": {
                "fields": fields,
                "layout": 1,
                "formAction": form_action,
                "formLabelVisible": True,
                "style": {
                    "background": style.get("background", "#ffffff"),
                    "fieldSpacing": style.get("fieldSpacing", 16),
                    "padding": style.get("padding", {"top": 20, "bottom": 20, "left": 20, "right": 20}),
                },
            },
            "emailNotifications": bool(spec.get("emailNotifications", False)),
            "autoResponder": bool(spec.get("autoResponder", False)),
            "language": spec.get("language", "en"),
        },
    }


def build_survey_payload(spec: dict[str, Any]) -> dict[str, Any]:
    """Return the POST body for creating/updating a survey's content.

    Emits the FULL formData envelope; the survey service silently drops content
    otherwise.
    """
    slides = []
    for i, slide_spec in enumerate(spec.get("slides", [])):
        button = dict(_DEFAULT_BUTTON)
        btn = slide_spec.get("button")
        if isinstance(btn, str):
            button["text"] = btn
        elif isinstance(btn, dict):
            button.update(btn)
        slides.append({
            "id": slide_spec.get("id", f"slide-{i + 1}"),
            "slideName": slide_spec.get("name", f"Slide {i + 1}"),
            "active": True,
            "button": button,
            "slideData": [_norm_field(fs, for_survey=True) for fs in slide_spec.get("fields", [])],
        })
    style = spec.get("style", {})
    return {
        "name": spec["name"],
        "formData": {
            "form": {
                "isProgressBarEnabled": bool(spec.get("progressBar", True)),
                "isBackButtonEnable": bool(spec.get("backButton", True)),
                "width": spec.get("width", 600),
                "formLabelVisible": True,
                "style": {"background": style.get("background", "#f7f7f7")},
            },
            "slides": slides,
            # Required sibling keys — omitting any of these makes the service no-op:
            "fieldCSS": "",
            "newFooter": True,
            "surveyLogicLinkById": {},
            "lastUpdatedAt": 0,
            "autoResponder": bool(spec.get("autoResponder", False)),
            "emailNotifications": bool(spec.get("emailNotifications", False)),
        },
    }


def count_summary(payload: dict, *, is_survey: bool) -> str:
    """Human-readable summary of what was built."""
    fd = payload["formData"]
    if is_survey:
        slides = fd.get("slides", [])
        parts = [f"{len(slides)} slide(s)"]
        total = sum(len(s.get("slideData", [])) for s in slides)
        parts.append(f"{total} field(s)")
        return ", ".join(parts)
    fields = fd["form"]["fields"]
    inputs = [f for f in fields if f.get("type") not in _BLOCK_TYPES]
    headers = [f for f in fields if f.get("type") in ("h1", "header")]
    return f"{len(fields)} block(s): {len(inputs)} input(s), {len(headers)} section header(s)"
