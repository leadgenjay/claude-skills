"""Opinionated design system, templates, linting, and previews for GHL pages.

The page builder intentionally remains a low-level schema adapter.  This module
adds the visual opinion: a restrained token set, funnel-specific compositions,
and checks that catch the common ways generated landing pages become ugly.
"""
from __future__ import annotations

import copy
import html
import json
from pathlib import Path
from typing import Any


THEMES: dict[str, dict[str, Any]] = {
    "otter": {
        "label": "Otter PR",
        "headlineFont": "Inter", "contentFont": "Roboto",
        "primary": "#37CA37", "ink": "#002D62", "body": "#334E68",
        "muted": "#627D98", "surface": "#FFFFFF", "soft": "#F3F7FA",
        "line": "#D9E2EC", "accentInk": "#002D62",
    },
    "editorial": {
        "label": "Editorial authority",
        "headlineFont": "Inter", "contentFont": "Roboto",
        "primary": "#B45309", "ink": "#1C1917", "body": "#44403C",
        "muted": "#78716C", "surface": "#FFFEFA", "soft": "#F7F3EA",
        "line": "#E7E0D2", "accentInk": "#FFFFFF",
    },
    "modern": {
        "label": "Modern product",
        "headlineFont": "Inter", "contentFont": "Roboto",
        "primary": "#6D5EF5", "ink": "#16152B", "body": "#45435F",
        "muted": "#74718F", "surface": "#FFFFFF", "soft": "#F6F5FF",
        "line": "#E5E2F7", "accentInk": "#FFFFFF",
    },
    "warm": {
        "label": "Warm service",
        "headlineFont": "Inter", "contentFont": "Roboto",
        "primary": "#E85D3F", "ink": "#292524", "body": "#57534E",
        "muted": "#78716C", "surface": "#FFFCF8", "soft": "#FFF1E8",
        "line": "#E9DDD4", "accentInk": "#FFFFFF",
    },
}

TEMPLATE_INFO = {
    "vsl": "Video-first sales or webinar page with one action path",
    "vsl-application": "Proof-led VSL for a qualified high-ticket application",
    "sales-letter": "Long-form paid offer with mechanism, proof, stack, and guarantee",
    "roadmap": "Fast diagnostic or personalized-roadmap opt-in",
    "application": "Guarantee-led qualifier with a short application",
    "membership": "Premium recurring offer with proof, plans, and comparison",
    "pricing": "Three-plan pricing page with featured plan, proof, FAQ, and CTA",
    "optin": "Short two-column lead capture page with a focused form card",
    "calendar": "Qualification-led booking page with an embedded calendar",
    "intake": "Calm onboarding and intake page with expectations and a form",
}

TEMPLATE_FRAMEWORKS = {
    "vsl": ("warm", "problem-aware", "low", "Promise → video → outcomes → fit → CTA"),
    "vsl-application": ("warm", "solution-aware", "high", "Guarantee → VSL → proof → mechanism → fit → application"),
    "sales-letter": ("warm", "solution-aware", "medium", "Promise → belief shift → diagnosis → mechanism → proof → fit → offer → guarantee → FAQ"),
    "roadmap": ("cold", "problem-aware", "low", "Specific promise + speed → visual deliverable → sequential diagnostic → proof"),
    "application": ("warm", "solution-aware", "high", "Guarantee → authority → fit → application → expectations"),
    "membership": ("warm", "product-aware", "medium", "Benefit stack → proof → case studies → plans → comparison → FAQ → CTA"),
    "pricing": ("warm", "product-aware", "medium", "Decision promise → plans → proof → FAQ → recommendation"),
    "optin": ("cold", "problem-aware", "low", "Specific promise → deliverable → form → proof → fit"),
    "calendar": ("warm", "solution-aware", "medium", "Call outcome → calendar → expectations → trust"),
    "intake": ("customer", "most-aware", "task", "Welcome → preparation → intake → next steps"),
}

PLACEHOLDER_PREFIX = "REPLACE_WITH_"


def _rgb(value: str) -> tuple[float, float, float] | None:
    value = value.strip().lstrip("#")
    if len(value) == 3:
        value = "".join(ch * 2 for ch in value)
    if len(value) != 6:
        return None
    try:
        return tuple(int(value[i:i + 2], 16) / 255 for i in (0, 2, 4))
    except ValueError:
        return None


def _contrast(foreground: str, background: str) -> float | None:
    pair = (_rgb(foreground), _rgb(background))
    if None in pair:
        return None
    def luminance(rgb: tuple[float, float, float]) -> float:
        channels = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb]
        return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2]
    a, b = (luminance(x) for x in pair)  # type: ignore[arg-type]
    return (max(a, b) + .05) / (min(a, b) + .05)


def _classes(spec: dict[str, Any], *names: str) -> None:
    current = spec.get("customClass", [])
    if isinstance(current, str):
        current = [current]
    spec["customClass"] = list(dict.fromkeys([*current, *names]))


def _is_logo(spec: dict[str, Any]) -> bool:
    if str(spec.get("role", "")).lower() == "logo":
        return True
    classes = spec.get("customClass", [])
    class_text = " ".join(classes) if isinstance(classes, list) else str(classes)
    identity = " ".join(str(spec.get(key, "")) for key in ("url", "alt", "title"))
    return "logo" in f"{class_text} {identity}".lower()


def _is_media_block(spec: dict[str, Any]) -> bool:
    if spec.get("type") == "video":
        return True
    if spec.get("type") != "customCode":
        return False
    classes = spec.get("customClass", [])
    class_text = " ".join(classes) if isinstance(classes, list) else str(classes)
    payload = f"{spec.get('role', '')} {class_text} {spec.get('html', '')}".lower()
    return "video" in payload


def _number(value: Any) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value or "0").strip().lower()
    for suffix in ("px", "rem", "em"):
        if text.endswith(suffix):
            text = text[:-len(suffix)]
            break
    try:
        return float(text)
    except ValueError:
        return 0.0


def _design_css(t: dict[str, Any]) -> str:
    return f"""
html{{scroll-behavior:smooth}}body{{margin:0;background:{t['surface']};color:{t['body']};-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}}
.hl_page-preview--content *{{box-sizing:border-box}}.hl_page-preview--content p{{max-width:68ch}}
.hl_page-preview--content h1,.hl_page-preview--content h2,.hl_page-preview--content h3,.hl_page-preview--content h4,.hl_page-preview--content h5,.hl_page-preview--content h6{{font-family:Inter,sans-serif!important;font-weight:700!important}}
.hl_page-preview--content .lp-centered p{{margin-left:auto;margin-right:auto}}
.hl_page-preview--content .lp-single-column>.inner{{justify-content:center}}
.hl_page-preview--content .lp-single-column>.inner>.column{{margin-left:auto;margin-right:auto}}
.hl_page-preview--content .lp-single-column>.inner>.column>.inner{{align-items:center;text-align:center}}
.hl_page-preview--content .lp-single-column ul{{width:fit-content;max-width:100%;margin-left:auto;margin-right:auto;text-align:left}}
.hl_page-preview--content .lp-single-column form,.hl_page-preview--content .lp-single-column iframe{{margin-left:auto;margin-right:auto}}
.hl_page-preview--content .lp-logo,.hl_page-preview--content .lp-centered-image{{display:block!important;margin-left:auto!important;margin-right:auto!important;text-align:center!important}}
.hl_page-preview--content .lp-logo img,.hl_page-preview--content .lp-centered-image img{{display:block!important;margin-left:auto!important;margin-right:auto!important}}
.hl_page-preview--content .lp-eyebrow{{text-transform:uppercase;letter-spacing:.14em}}
.hl_page-preview--content .lp-grid{{display:flex;gap:24px;align-items:stretch}}.hl_page-preview--content .lp-grid>.inner{{display:flex;gap:24px;align-items:stretch;width:100%}}.hl_page-preview--content .lp-grid>.inner>*,.hl_page-preview--content .lp-grid>.column{{flex:1 1 0;width:auto!important;min-width:0}}
.hl_page-preview--content .lp-card{{border:1px solid {t['line']};border-radius:20px;box-shadow:0 12px 35px rgba(0,45,98,.07);overflow:hidden}}
.hl_page-preview--content .lp-card-soft{{background:{t['soft']};border:1px solid {t['line']};border-radius:20px}}
.hl_page-preview--content .lp-featured{{border:2px solid {t['primary']};box-shadow:0 22px 55px rgba(0,45,98,.14);position:relative;transform:translateY(-10px)}}
.hl_page-preview--content .lp-button{{transition:transform .18s ease,box-shadow .18s ease;min-height:52px}}
.hl_page-preview--content .lp-button:hover{{transform:translateY(-2px);box-shadow:0 12px 24px rgba(0,45,98,.18)}}
.hl_page-preview--content .lp-button:focus-visible{{outline:3px solid {t['ink']};outline-offset:3px}}
.hl_page-preview--content .lp-media-frame{{border-radius:22px;overflow:hidden;box-shadow:0 24px 65px rgba(0,45,98,.16)}}
.hl_page-preview--content .lp-form-card,.hl_page-preview--content .lp-calendar-card{{background:{t['surface']};border:1px solid {t['line']};border-radius:22px;padding:12px;box-shadow:0 22px 60px rgba(0,45,98,.12)}}
.hl_page-preview--content .lp-form-card .ghl-footer{{height:76px!important;min-height:76px!important;background:{t['surface']}!important;border-top:1px solid {t['line']}!important;box-shadow:none!important}}
.hl_page-preview--content .lp-form-card .ghl-footer-buttons{{height:76px!important;min-height:76px!important;padding:12px 16px!important;align-items:center!important;justify-content:center!important}}
.hl_page-preview--content .lp-form-card .ghl-btn-placeholder{{display:none!important}}
.hl_page-preview--content .lp-form-card .ghl-footer-back,.hl_page-preview--content .lp-form-card .ghl-footer-next{{height:52px!important;min-height:52px!important;margin:0!important;align-self:center!important}}
.hl_page-preview--content .lp-proof{{filter:grayscale(1);opacity:.72}}
.hl_page-preview--content .lp-icon{{width:48px;height:48px;border-radius:14px;background:{t['soft']};display:grid;place-items:center;color:{t['primary']};margin-bottom:18px}}
.hl_page-preview--content .lp-icon svg{{width:24px;height:24px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}}
.hl_page-preview--content .lp-price{{font-variant-numeric:tabular-nums;letter-spacing:-.04em}}
.hl_page-preview--content .lp-kicker{{display:inline-block;border:1px solid {t['line']};border-radius:999px;padding:7px 12px;background:{t['soft']}}}
.hl_page-preview--content .lp-fine-print{{opacity:.78}}
@media(max-width:991px){{.hl_page-preview--content .lp-stack-tablet,.hl_page-preview--content .lp-stack-tablet>.inner{{display:block;gap:0}}.hl_page-preview--content .lp-stack-tablet>.inner>*,.hl_page-preview--content .lp-stack-tablet>.column{{width:100%!important}}.hl_page-preview--content .lp-stack-tablet>.inner>*+*{{margin-top:24px}}}}
@media(max-width:767px){{.hl_page-preview--content .lp-grid,.hl_page-preview--content .lp-grid>.inner{{display:block;gap:0}}.hl_page-preview--content .lp-grid>.inner>*,.hl_page-preview--content .lp-grid>.column{{width:100%!important}}.hl_page-preview--content .lp-featured{{transform:none}}.hl_page-preview--content .lp-card,.hl_page-preview--content .lp-card-soft{{margin-bottom:16px}}.hl_page-preview--content .lp-button{{width:100%!important}}}}
@media(prefers-reduced-motion:reduce){{html{{scroll-behavior:auto}}.hl_page-preview--content .lp-button{{transition:none}}}}
""".strip()


def apply_design_system(source: dict[str, Any]) -> dict[str, Any]:
    """Apply a named theme and responsive defaults without mutating input."""
    spec = copy.deepcopy(source)
    config = spec.get("designSystem")
    if config is False or config is None:
        return spec
    if config is True:
        config = {}
    theme_name = config.get("theme", "otter")
    if theme_name not in THEMES:
        raise ValueError(f"unknown landing-page theme {theme_name!r}; choose {', '.join(THEMES)}")
    t = THEMES[theme_name]
    spec["designSystem"] = {"version": 1, **config, "theme": theme_name}
    spec.setdefault("primaryColor", t["primary"])
    spec.setdefault("headlineFont", t["headlineFont"])
    spec.setdefault("contentFont", t["contentFont"])
    spec.setdefault("textColor", t["body"])
    spec["customCss"] = _design_css(t) + "\n" + spec.get("customCss", "")

    for si, section in enumerate(spec.get("sections", [])):
        section.setdefault("background", t["surface"])
        section.setdefault("maxWidth", 1120)
        section.setdefault("paddingTop", 88 if si else 72)
        section.setdefault("paddingBottom", 88 if si else 80)
        section.setdefault("paddingLeft", 24)
        section.setdefault("paddingRight", 24)
        section.setdefault("mobilePaddingTop", 58 if si else 44)
        section.setdefault("mobilePaddingBottom", 58 if si else 52)
        section.setdefault("mobilePaddingLeft", 20)
        section.setdefault("mobilePaddingRight", 20)
        if section.get("align") == "center":
            _classes(section, "lp-centered")
        for row in section.get("rows", []):
            columns = row.get("columns", [])
            if len(columns) > 1:
                _classes(row, "lp-grid")
            elif len(columns) == 1:
                _classes(row, "lp-single-column")
                column = columns[0]
                column["alignItems"] = "center"
                for element in column.get("elements", []):
                    if element.get("type") in {
                        "heading", "subHeading", "subheading", "paragraph",
                        "button", "image", "divider", "logoShowcase",
                    }:
                        element["align"] = "center"
            if row.get("stackOnTablet"):
                _classes(row, "lp-stack-tablet")
            for col in columns:
                col.setdefault("paddingLeft", 12)
                col.setdefault("paddingRight", 12)
                col.setdefault("paddingTop", 12)
                col.setdefault("paddingBottom", 12)
                for el in col.get("elements", []):
                    kind = el.get("type", "paragraph")
                    if kind == "heading":
                        el.setdefault("fontSize", 58)
                        el.setdefault("mobileFontSize", 38)
                        el.setdefault("weight", "700")
                        el.setdefault("lineHeight", 1.08)
                        el.setdefault("letterSpacing", -1.5)
                        el.setdefault("color", t["ink"])
                        el.setdefault("marginBottom", 20)
                    elif kind in {"subHeading", "subheading"}:
                        el.setdefault("fontSize", 38)
                        el.setdefault("mobileFontSize", 29)
                        el.setdefault("weight", "700")
                        el.setdefault("lineHeight", 1.15)
                        el.setdefault("letterSpacing", -.6)
                        el.setdefault("color", t["ink"])
                        el.setdefault("marginBottom", 16)
                    elif kind == "paragraph":
                        el.setdefault("fontSize", 18)
                        el.setdefault("mobileFontSize", 17)
                        el.setdefault("lineHeight", 1.65)
                        el.setdefault("color", t["body"])
                        el.setdefault("marginBottom", 16)
                        if el.get("role") == "eyebrow":
                            el.update({"fontSize": el.get("fontSize", 13), "mobileFontSize": el.get("mobileFontSize", 12),
                                       "weight": "700", "letterSpacing": 1.8, "color": el.get("color", t["primary"])})
                            _classes(el, "lp-eyebrow")
                    elif kind == "bulletList":
                        el.setdefault("fontSize", 17)
                        el.setdefault("mobileFontSize", 16)
                        el.setdefault("lineHeight", 1.6)
                        el.setdefault("color", t["body"])
                        el.setdefault("iconColor", t["primary"])
                        el.setdefault("marginBottom", 20)
                    elif kind == "button":
                        if "backgroundColor" in el and "background" not in el:
                            el["background"] = el["backgroundColor"]
                        if "textColor" in el and "color" not in el:
                            el["color"] = el["textColor"]
                        el.setdefault("background", t["primary"])
                        el.setdefault("color", t["accentInk"])
                        el.setdefault("fontSize", 17)
                        el.setdefault("mobileFontSize", 17)
                        el.setdefault("paddingTop", 16)
                        el.setdefault("paddingBottom", 16)
                        el.setdefault("paddingLeft", 24)
                        el.setdefault("paddingRight", 24)
                        el.setdefault("radius", "radius10")
                        _classes(el, "lp-button")
                    elif kind == "image":
                        el.setdefault("alt", "")
                        if _is_logo(el):
                            el["role"] = "logo"
                            el["align"] = "center"
                            el.setdefault("marginBottom", 24)
                            _classes(el, "lp-logo")
                        elif el.get("align") == "center":
                            el.setdefault("marginBottom", 20)
                            _classes(el, "lp-centered-image")
                    elif kind == "video":
                        el.setdefault("marginBottom", 24)
                        _classes(el, "lp-media-frame")
                    elif kind == "customCode" and _is_media_block(el):
                        el.setdefault("marginBottom", 24)
                    elif kind == "form":
                        _classes(el, "lp-form-card")
                    elif kind == "calendar":
                        _classes(el, "lp-calendar-card")
    return spec


def _text(kind: str, text: str, **kw: Any) -> dict[str, Any]:
    return {"type": kind, "text": text, **kw}


def _button(text: str, **kw: Any) -> dict[str, Any]:
    button = {"type": "button", "text": text, "action": "url", "url": "#primary-action"}
    button.update(kw)
    if button.get("scrollToElement"):
        button.update({"action": "scroll-to-element", "url": ""})
    return button


def _icon(name: str) -> dict[str, Any]:
    paths = {
        "play": '<polygon points="9 7 19 12 9 17 9 7"></polygon><circle cx="12" cy="12" r="10"></circle>',
        "check": '<path d="M20 6 9 17l-5-5"></path>',
        "spark": '<path d="m12 3-1.9 5.1L5 10l5.1 1.9L12 17l1.9-5.1L19 10l-5.1-1.9L12 3Z"></path>',
        "calendar": '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 11h18"></path>',
        "shield": '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"></path><path d="m9 12 2 2 4-4"></path>',
    }
    return {"type": "customCode", "html": f'<div class="lp-icon" aria-hidden="true"><svg viewBox="0 0 24 24">{paths.get(name, paths["spark"])}</svg></div>'}


def template_spec(template: str, theme: str = "otter") -> dict[str, Any]:
    """Return a polished, editable compact spec for a funnel archetype."""
    if template not in TEMPLATE_INFO:
        raise ValueError(f"unknown template {template!r}; choose {', '.join(TEMPLATE_INFO)}")
    if theme not in THEMES:
        raise ValueError(f"unknown theme {theme!r}; choose {', '.join(THEMES)}")
    factory = globals()[f"_{template.replace('-', '_')}_template"]
    spec = factory()
    spec["designSystem"] = {"version": 1, "theme": theme, "template": template}
    spec.setdefault("framework", _framework(*TEMPLATE_FRAMEWORKS[template]))
    spec.setdefault("seo", {"title": spec["name"], "description": "Replace with a specific, benefit-led page description."})
    return spec


def _framework(traffic: str, awareness: str, friction: str, copy: str) -> dict[str, str]:
    """Machine-readable strategy metadata for agents and future generators."""
    return {"traffic": traffic, "awareness": awareness, "friction": friction, "copyFramework": copy}


def _proof_card(headline: str, detail: str) -> dict[str, Any]:
    return {"width": 33.33, "customClass": ["lp-card"], "paddingTop": 28, "paddingBottom": 28,
            "paddingLeft": 26, "paddingRight": 26, "elements": [
                _text("subHeading", headline, fontSize=23, mobileFontSize=22),
                _text("paragraph", detail, fontSize=16),
            ]}


def _vsl_template() -> dict[str, Any]:
    return {"name": "VSL Funnel", "path": "/vsl", "framework": _framework("warm", "problem-aware", "low", "Promise → video → outcomes → fit → CTA"), "sections": [
        {"name": "Video Hero", "align": "center", "maxWidth": 920, "rows": [{"columns": [{"elements": [
            _text("paragraph", "FREE 12-MINUTE TRAINING", role="eyebrow", align="center"),
            _text("heading", "The PR System That Turns Expertise Into Authority", align="center"),
            _text("paragraph", "See how growth-stage founders earn credible media coverage without chasing reporters or signing a long agency contract.", align="center", fontSize=20),
            {"type": "video", "url": "https://www.youtube.com/watch?v=REPLACE_WITH_VIDEO_ID", "controls": True, "autoplay": False, "marginTop": 18, "marginBottom": 24},
            _button("Watch, Then Build My PR Plan", subText="Free strategy session. No pressure."),
            _text("paragraph", "Trusted by founders featured in Forbes, CNBC, USA Today, TIME, and Bloomberg.", align="center", fontSize=14, weight="600"),
        ]}]}]},
        {"name": "Three Outcomes", "background": "#F3F7FA", "rows": [{"columns": [
            {"width": 33.33, "customClass": ["lp-card"], "paddingTop": 28, "paddingBottom": 28, "paddingLeft": 26, "paddingRight": 26, "elements": [_icon("spark"), _text("subHeading", "Find Your Story", fontSize=23, mobileFontSize=22), _text("paragraph", "Identify the angle journalists can understand and audiences remember.", fontSize=16)]},
            {"width": 33.33, "customClass": ["lp-card"], "paddingTop": 28, "paddingBottom": 28, "paddingLeft": 26, "paddingRight": 26, "elements": [_icon("play"), _text("subHeading", "Pitch With Precision", fontSize=23, mobileFontSize=22), _text("paragraph", "Match the right message to the right outlet at the right moment.", fontSize=16)]},
            {"width": 33.34, "customClass": ["lp-card"], "paddingTop": 28, "paddingBottom": 28, "paddingLeft": 26, "paddingRight": 26, "elements": [_icon("shield"), _text("subHeading", "Compound Credibility", fontSize=23, mobileFontSize=22), _text("paragraph", "Turn earned coverage into trust across sales, search, and social.", fontSize=16)]},
        ]}]},
        {"name": "Qualification", "align": "center", "maxWidth": 760, "rows": [{"columns": [{"customClass": ["lp-card-soft"], "paddingTop": 34, "paddingBottom": 34, "paddingLeft": 34, "paddingRight": 34, "elements": [_text("subHeading", "Built for leaders with a real story to tell", align="center", fontSize=30), _text("paragraph", "Best for founders, executives, and experts ready to turn proven work into visible authority. Not for businesses looking for instant publicity without a credible point of view.", align="center")]}]}]},
        {"name": "Final CTA", "align": "center", "maxWidth": 720, "background": "#002D62", "rows": [{"columns": [{"elements": [_text("subHeading", "Ready to become the name your market trusts?", color="#FFFFFF", align="center"), _text("paragraph", "Watch the training, then choose the next step that fits your goals.", color="#D9E6F2", align="center"), _button("Build My PR Plan")]}]}]},
    ]}


def _vsl_application_template() -> dict[str, Any]:
    return {"name": "Application VSL", "path": "/apply", "framework": _framework(
        "warm", "solution-aware", "high", "Guarantee → VSL → proof → mechanism → fit → application"), "sections": [
        {"name": "Guarantee VSL Hero", "align": "center", "maxWidth": 930, "rows": [{"columns": [{"elements": [
            _text("paragraph", "FOR ESTABLISHED FOUNDERS READY TO BECOME THE CATEGORY AUTHORITY", role="eyebrow", align="center"),
            _text("heading", "Earn Meaningful Media Coverage in 90 Days—or We Keep Working at No Cost", align="center"),
            _text("paragraph", "Watch the short briefing to see the performance-backed system, who it is built for, and what happens after you apply.", align="center", fontSize=20),
            {"type": "video", "url": "https://www.youtube.com/watch?v=REPLACE_WITH_VIDEO_ID", "controls": True, "autoplay": False, "marginTop": 18, "marginBottom": 24},
            _button("See If I Qualify", subText="Takes two minutes. No obligation.", scrollToElement="application"),
            _text("paragraph", "Trusted by leaders featured in Forbes, CNBC, TIME, and Bloomberg.", align="center", fontSize=14, weight="600"),
        ]}]}]},
        {"name": "Verified Results Proof", "background": "#F3F7FA", "rows": [{"columns": [
            _proof_card("Coverage That Matters", "Replace with one verified placement and the business outcome it supported."),
            _proof_card("A Repeatable System", "Replace with a client result that proves the mechanism—not just satisfaction."),
            _proof_card("Senior-Level Guidance", "Replace with a testimonial that answers the trust or time objection."),
        ]}]},
        {"name": "Named Mechanism", "maxWidth": 900, "align": "center", "rows": [{"columns": [{"elements": [
            _text("paragraph", "THE AUTHORITY COMPOUNDING SYSTEM", role="eyebrow", align="center"),
            _text("subHeading", "One credible story, placed strategically, can strengthen every channel", align="center"),
            _text("paragraph", "Show the three to five steps that make your approach distinct. Explain why the old way fails and why this process produces a more dependable result.", align="center"),
        ]}]}]},
        {"name": "Fit and Disqualification", "background": "#F3F7FA", "rows": [{"columns": [
            {"width": 50, "customClass": ["lp-card"], "paddingTop": 30, "paddingBottom": 30, "paddingLeft": 28, "paddingRight": 28, "elements": [_text("subHeading", "You are likely a fit if…", fontSize=28), {"type": "bulletList", "items": ["You have a proven offer or body of work", "You can support clear, defensible claims", "You are ready to participate in the story"]}]},
            {"width": 50, "customClass": ["lp-card-soft"], "paddingTop": 30, "paddingBottom": 30, "paddingLeft": 28, "paddingRight": 28, "elements": [_text("subHeading", "This is not for you if…", fontSize=28), {"type": "bulletList", "items": ["You need instant fame without substance", "You want guaranteed publication names", "You cannot commit time to the process"]}]},
        ]}]},
        {"id": "application", "name": "Application", "maxWidth": 820, "rows": [{"columns": [{"customClass": ["lp-form-card"], "elements": [
            _text("subHeading", "Tell us where you are—and where you want to go", align="center"),
            _text("paragraph", "A strategist reviews every application. Qualified applicants receive a link to choose a conversation time.", align="center"),
            {"type": "survey", "surveyId": "REPLACE_WITH_GHL_APPLICATION_SURVEY_ID", "name": "Qualification application"},
        ]}]}]},
    ]}


def _sales_letter_template() -> dict[str, Any]:
    return {"name": "Long-form Sales Letter", "path": "/offer", "framework": _framework(
        "warm", "solution-aware", "medium", "Promise → belief shift → diagnosis → mechanism → proof → fit → offer → guarantee → FAQ"), "sections": [
        {"name": "Sales Letter Hero", "align": "center", "maxWidth": 940, "rows": [{"columns": [{"elements": [
            _text("paragraph", "FOR FOUNDERS WHO HAVE OUTGROWN RANDOM-ACT PR", role="eyebrow", align="center"),
            _text("heading", "Turn One Defensible Point of View Into a Media System That Compounds Authority", align="center"),
            _text("paragraph", "Without chasing reporters, guessing at angles, or signing a vague long-term agency agreement.", align="center", fontSize=20),
            _button("Get the Complete System", subText="One-time purchase. 30-day guarantee."),
        ]}]}]},
        {"name": "Belief Shift", "maxWidth": 760, "rows": [{"columns": [{"elements": [_text("subHeading", "The problem is rarely a lack of expertise. It is a lack of narrative structure."), _text("paragraph", "Use this section to replace the prospect’s current explanation with a more useful one. Name the cost of continuing with the old belief.")]}]}]},
        {"name": "Failure Diagnosis", "background": "#F3F7FA", "rows": [{"columns": [
            _proof_card("The Story Trap", "You lead with your company instead of the tension the audience already cares about."),
            _proof_card("The Pitch Lottery", "You send broad outreach without a relevance window or publication fit."),
            _proof_card("The Coverage Cliff", "A placement goes live, then disappears instead of supporting sales and search."),
        ]}]},
        {"name": "Named Mechanism", "maxWidth": 880, "align": "center", "rows": [{"columns": [{"elements": [_text("paragraph", "THE AUTHORITY COMPOUNDING SYSTEM", role="eyebrow", align="center"), _text("subHeading", "A named process makes the result understandable—and believable", align="center"), _text("paragraph", "Explain the sequence, why each step exists, and what becomes possible after the mechanism is installed.", align="center")]}]}]},
        {"name": "Proof and ROI", "background": "#F3F7FA", "rows": [{"columns": [
            _proof_card("Before → After", "Replace with a quantified result and the exact timeframe."),
            _proof_card("What Changed", "Connect the result to the mechanism, not luck or vague service quality."),
            _proof_card("Business Impact", "Translate attention into trust, pipeline, conversion, or deal velocity."),
        ]}]},
        {"name": "Fit and Disqualification", "maxWidth": 800, "rows": [{"columns": [{"elements": [_text("subHeading", "Built for serious experts with something real to say"), _text("paragraph", "Name the two or three best-fit segments, then explicitly disqualify buyers who will not get value. Specificity improves both conversion and customer quality.")]}]}]},
        {"name": "Offer Stack", "background": "#F3F7FA", "maxWidth": 900, "rows": [{"columns": [{"customClass": ["lp-card"], "paddingTop": 38, "paddingBottom": 38, "paddingLeft": 38, "paddingRight": 38, "elements": [_text("paragraph", "EVERYTHING INCLUDED", role="eyebrow"), _text("subHeading", "The Authority System", fontSize=34), {"type": "bulletList", "items": ["Core system with specific outcome", "Implementation templates that remove delay", "Objection-solving bonus tied to speed or certainty", "Clear support and access terms"]}, _text("subHeading", "$997", fontSize=46, customClass=["lp-price"]), _button("Get Instant Access", subText="Secure checkout. 30-day guarantee.")]}]}]},
        {"name": "Guarantee", "maxWidth": 760, "align": "center", "rows": [{"columns": [{"elements": [_icon("shield"), _text("subHeading", "Use the system for 30 days. If it is not useful, ask for a refund.", align="center"), _text("paragraph", "State the exact conditions, timeframe, and process in plain language. Never hide material exclusions.", align="center")]}]}]},
        {"name": "FAQ", "maxWidth": 820, "rows": [{"columns": [{"elements": [_text("subHeading", "Questions to answer before you decide", align="center"), {"type": "faq", "items": [{"question": "Who is this designed for?", "answer": "Define the ideal customer and starting point precisely."}, {"question": "How quickly can I implement it?", "answer": "Give a realistic time-to-value and required effort."}, {"question": "What is covered by the guarantee?", "answer": "Repeat the material guarantee terms without ambiguity."}]}]}]}]},
        {"name": "Final Close", "background": "#002D62", "align": "center", "maxWidth": 740, "rows": [{"columns": [{"elements": [_text("subHeading", "Make the decision around the cost of staying stuck", color="#FFFFFF", align="center"), _text("paragraph", "Summarize the result, mechanism, risk reversal, and immediate next step.", color="#D9E6F2", align="center"), _button("Get the Complete System", subText="One-time purchase. Immediate access.")]}]}]},
    ]}


def _roadmap_template() -> dict[str, Any]:
    return {"name": "Personalized Roadmap", "path": "/roadmap", "framework": _framework(
        "cold", "problem-aware", "low", "Specific promise + speed → visual deliverable → sequential diagnostic → proof"), "sections": [
        {"name": "Roadmap Hero and Survey", "maxWidth": 1080, "rows": [{"columns": [
            {"width": 52, "elements": [_text("paragraph", "FREE 2-MINUTE DIAGNOSTIC", role="eyebrow"), _text("heading", "Get Your Personalized PR Authority Roadmap in Under Two Minutes"), _text("paragraph", "Answer a few focused questions and receive the next three moves for building credible visibility at your stage.", fontSize=20), {"type": "image", "url": "REPLACE_WITH_ROADMAP_MOCKUP_URL", "alt": "Preview of the personalized authority roadmap", "width": "88%"}]},
            {"width": 48, "customClass": ["lp-form-card"], "elements": [_text("subHeading", "First, where are you today?", fontSize=30), _text("paragraph", "One question per screen. Your answers personalize the result."), {"type": "survey", "surveyId": "REPLACE_WITH_GHL_ROADMAP_SURVEY_ID", "name": "Roadmap diagnostic"}]},
        ]}]},
        {"name": "Roadmap Proof", "compact": True, "background": "#F3F7FA", "align": "center", "rows": [{"columns": [{"elements": [_text("subHeading", "Requested by 2,500+ founders and experts", align="center", fontSize=28), _text("paragraph", "Replace with a verified usage count or one outcome-specific testimonial. Never invent scale.", align="center", fontSize=16)]}]}]},
        {"name": "What You Receive", "rows": [{"columns": [
            _proof_card("Your Strongest Angle", "The narrative most likely to create relevance now."),
            _proof_card("Your Priority Channel", "Where credibility can compound fastest for your goals."),
            _proof_card("Your Next Three Moves", "A short sequence you can act on immediately."),
        ]}]},
    ]}


def _application_template() -> dict[str, Any]:
    return {"name": "Qualification Application", "path": "/qualify", "framework": _framework(
        "warm", "solution-aware", "high", "Guarantee → authority → fit → application → expectations"), "sections": [
        {"name": "Application Hero", "align": "center", "maxWidth": 880, "rows": [{"columns": [{"elements": [_text("paragraph", "A PERFORMANCE-BACKED PR PARTNERSHIP", role="eyebrow", align="center"), _text("heading", "Meaningful Media Coverage in 90 Days—Guaranteed", align="center"), _text("paragraph", "See whether your story, goals, and timing are a fit for our senior strategy team.", align="center", fontSize=20), _button("See If I Qualify", subText="Two-minute application. No obligation.", scrollToElement="qualifier"), {"type": "logoShowcase", "logos": [], "customClass": ["lp-proof"]}]}]}]},
        {"name": "Fit Criteria", "background": "#F3F7FA", "rows": [{"columns": [
            _proof_card("A Proven Foundation", "You have customers, expertise, or results worth examining."),
            _proof_card("A Defensible Story", "You can support your point of view with evidence and experience."),
            _proof_card("A Real Commitment", "You are available to collaborate and respond when opportunities arise."),
        ]}]},
        {"id": "qualifier", "name": "Qualification Survey", "maxWidth": 820, "rows": [{"columns": [{"customClass": ["lp-form-card"], "elements": [_text("subHeading", "Tell us about your goals", align="center"), _text("paragraph", "Use progressive questions, explain why sensitive fields are needed, and request contact details last.", align="center"), {"type": "survey", "surveyId": "REPLACE_WITH_GHL_QUALIFICATION_SURVEY_ID", "name": "PR qualification survey"}]}]}]},
        {"name": "Application Expectations", "maxWidth": 760, "align": "center", "rows": [{"columns": [{"elements": [_text("subHeading", "What happens after you apply", align="center"), _text("paragraph", "A strategist reviews your answers. If there is a credible path to the outcome, we will invite you to choose a conversation time. If not, we will tell you directly.", align="center")]}]}]},
    ]}


def _membership_template() -> dict[str, Any]:
    return {"name": "Premium Membership", "path": "/membership", "framework": _framework(
        "warm", "product-aware", "medium", "Benefit stack → proof → case studies → plans → comparison → FAQ → CTA"), "sections": [
        {"name": "Membership Hero", "rows": [{"columns": [
            {"width": 52, "elements": [_text("paragraph", "THE AUTHORITY OPERATING SYSTEM", role="eyebrow"), _text("heading", "Strategy, Support, and Tools to Build Authority Every Month"), {"type": "bulletList", "items": ["Senior strategy without a full agency retainer", "A peer network of proven operators", "New campaigns and training every month"]}, _button("Join Now — Starting at $1,000/mo", subText="Cancel according to the plan terms.")]},
            {"width": 48, "elements": [{"type": "video", "url": "https://www.youtube.com/watch?v=REPLACE_WITH_VIDEO_ID", "controls": True, "autoplay": False}]},
        ]}]},
        {"name": "Case Study Proof", "background": "#F3F7FA", "rows": [{"columns": [
            _proof_card("The Challenge", "State the relevant starting constraint in the customer’s own language."),
            _proof_card("What Changed", "Name the feature, behavior, or mechanism that produced movement."),
            _proof_card("The Win", "Use a verified number, timeframe, or operational outcome."),
        ]}]},
        {"name": "Membership Plans", "align": "center", "rows": [{"columns": [
            {"width": 50, "customClass": ["lp-card"], "paddingTop": 34, "paddingBottom": 34, "paddingLeft": 30, "paddingRight": 30, "elements": [_text("subHeading", "Standard", fontSize=28), _text("subHeading", "$1,000/mo", fontSize=42, customClass=["lp-price"]), {"type": "bulletList", "items": ["Core platform and training", "Monthly group strategy", "Member community"]}, _button("Choose Standard", subText="Best for self-directed operators.")]},
            {"width": 50, "customClass": ["lp-card", "lp-featured"], "paddingTop": 34, "paddingBottom": 34, "paddingLeft": 30, "paddingRight": 30, "elements": [_text("paragraph", "MOST SUPPORT", role="eyebrow"), _text("subHeading", "VIP", fontSize=28), _text("subHeading", "$3,000/mo", fontSize=42, customClass=["lp-price"]), {"type": "bulletList", "items": ["Everything in Standard", "Private implementation reviews", "Priority expert access"]}, _button("Choose VIP", subText="Best for faster implementation.")]},
        ]}]},
        {"name": "Feature Comparison", "maxWidth": 900, "rows": [{"columns": [{"elements": [_text("subHeading", "Choose based on support—not artificial feature complexity", align="center"), _text("paragraph", "Use a scannable comparison table in the live builder. Group features by outcome and keep differences to the few that matter.", align="center")]}]}]},
        {"name": "FAQ", "maxWidth": 820, "rows": [{"columns": [{"elements": [_text("subHeading", "Questions before joining", align="center"), {"type": "faq", "items": [{"question": "Which plan is right for me?", "answer": "Choose based on how much implementation support you need."}, {"question": "Can I change plans?", "answer": "State upgrade, downgrade, and cancellation terms plainly."}, {"question": "What happens in the first 30 days?", "answer": "Describe the onboarding path and first useful result."}]}]}]}]},
        {"name": "Membership CTA", "background": "#002D62", "align": "center", "maxWidth": 740, "rows": [{"columns": [{"elements": [_text("subHeading", "Install the operating system your authority has been missing", color="#FFFFFF", align="center"), _text("paragraph", "Reinforce who it is for, the first outcome, and the terms.", color="#D9E6F2", align="center"), _button("Join Now — Starting at $1,000/mo", subText="Choose your support level next.")]}]}]},
    ]}


def _pricing_template() -> dict[str, Any]:
    plans = [
        ("Essential", "$995", "For consistent visibility", False, ["3 targeted placements", "Monthly coverage report", "Month-to-month terms"]),
        ("Authority", "$1,995", "For leaders building a category", True, ["Everything in Essential", "Priority pitching", "Executive thought leadership"]),
        ("Enterprise", "Custom", "For complex reputation goals", False, ["Dedicated strategy team", "Multi-market campaigns", "Custom reporting and support"]),
    ]
    cols = []
    for name, price, desc, featured, items in plans:
        classes = ["lp-card", "lp-featured"] if featured else ["lp-card"]
        els = []
        if featured:
            els.append(_text("paragraph", "MOST POPULAR", role="eyebrow", align="center"))
        els += [_text("subHeading", name, fontSize=25, mobileFontSize=24), _text("subHeading", price, fontSize=44, mobileFontSize=40, customClass=["lp-price"]), _text("paragraph", desc, fontSize=16), {"type": "bulletList", "items": items, "fontSize": 16, "marginBottom": 22}, _button("Choose " + name)]
        cols.append({"width": 33.33, "customClass": classes, "paddingTop": 34, "paddingBottom": 34, "paddingLeft": 28, "paddingRight": 28, "elements": els})
    return {"name": "Pricing Page", "path": "/pricing", "sections": [
        {"name": "Pricing Hero", "align": "center", "maxWidth": 820, "rows": [{"columns": [{"elements": [_text("paragraph", "SIMPLE, TRANSPARENT PR PLANS", role="eyebrow", align="center"), _text("heading", "Choose the Visibility Your Next Stage Requires", align="center"), _text("paragraph", "Clear scope, real accountability, and a plan that grows with your reputation goals.", align="center", fontSize=20), _button("Compare the Plans", scrollToElement="plans")]}]}]},
        {"id": "plans", "name": "Plan Grid", "compact": True, "paddingTop": 28, "rows": [{"columns": cols}]},
        {"name": "Proof", "background": "#F3F7FA", "align": "center", "maxWidth": 900, "rows": [{"columns": [{"elements": [_text("subHeading", "Coverage is promised in writing, not left to chance", align="center"), _text("paragraph", "Replace this block with verified client results, recognizable publication logos, and one objection-matching testimonial.", align="center"), {"type": "logoShowcase", "logos": [], "customClass": ["lp-proof"]}]}]}]},
        {"name": "FAQ", "maxWidth": 820, "rows": [{"columns": [{"elements": [_text("subHeading", "What to know before choosing a plan", align="center"), {"type": "faq", "items": [{"question": "Can I change plans later?", "answer": "Yes. Your team can recommend a change as your goals evolve."}, {"question": "What happens after I start?", "answer": "You will receive a clear kickoff plan, timeline, and point of contact."}, {"question": "Are there long-term contracts?", "answer": "Replace this answer with the exact terms for this offer."}]}]}]}]},
        {"name": "Pricing CTA", "background": "#002D62", "align": "center", "maxWidth": 720, "rows": [{"columns": [{"elements": [_text("subHeading", "Still deciding which plan fits?", color="#FFFFFF", align="center"), _text("paragraph", "Get a recommendation based on your goals, timing, and current visibility.", color="#D9E6F2", align="center"), _button("Get My Plan Recommendation")]}]}]},
    ]}


def _optin_template() -> dict[str, Any]:
    return {"name": "Simple Opt-in", "path": "/free-guide", "sections": [
        {"name": "Opt-in Hero", "rows": [{"columns": [
            {"width": 55, "elements": [_text("paragraph", "FREE FOUNDER PR GUIDE", role="eyebrow", align="left"), _text("heading", "Find the Story Journalists Want to Cover", align="left"), _text("paragraph", "Use this 7-point framework to turn your expertise into a timely, credible media angle.", align="left", fontSize=20), {"type": "bulletList", "items": ["Spot the strongest newsworthy angle", "Avoid the pitches editors ignore", "Build authority before outreach begins"]}]},
            {"width": 45, "customClass": ["lp-card"], "paddingTop": 36, "paddingBottom": 36, "paddingLeft": 34, "paddingRight": 34, "elements": [_text("subHeading", "Send me the guide", align="left", fontSize=28), _text("paragraph", "Enter your details and we will email it immediately.", align="left", fontSize=16), {"type": "form", "formId": "REPLACE_WITH_GHL_FORM_ID", "name": "Guide opt-in form"}, _text("paragraph", "Free. No spam. Unsubscribe anytime.", align="center", fontSize=13, customClass=["lp-fine-print"])]},
        ]}]},
        {"name": "Proof Strip", "compact": True, "background": "#F3F7FA", "align": "center", "paddingTop": 34, "paddingBottom": 34, "rows": [{"columns": [{"elements": [_text("paragraph", "Replace with one verified authority stat or a short row of publication logos.", align="center", weight="600")]}]}]},
        {"name": "Who It Is For", "align": "center", "maxWidth": 740, "rows": [{"columns": [{"elements": [_text("subHeading", "For experts with substance, not manufactured hype", align="center"), _text("paragraph", "Built for founders and executives with real experience who need a sharper way to communicate why their work matters now.", align="center")]}]}]},
    ]}


def _calendar_template() -> dict[str, Any]:
    return {"name": "Calendar Booking", "path": "/book", "sections": [
        {"name": "Booking Hero", "align": "center", "maxWidth": 850, "rows": [{"columns": [{"elements": [_text("paragraph", "FREE 30-MINUTE PR STRATEGY SESSION", role="eyebrow", align="center"), _text("heading", "Leave With a Clearer Path to Credible Media Coverage", align="center"), _text("paragraph", "Choose a time below. We will review your goals, identify your strongest story, and outline the right next step.", align="center", fontSize=20)]}]}]},
        {"id": "booking-calendar", "name": "Calendar", "compact": True, "paddingTop": 24, "maxWidth": 980, "rows": [{"columns": [{"customClass": ["lp-calendar-card"], "paddingTop": 20, "paddingBottom": 20, "paddingLeft": 20, "paddingRight": 20, "elements": [{"type": "calendar", "calendarId": "REPLACE_WITH_GHL_CALENDAR_ID", "name": "Strategy calendar"}]}]}]},
        {"name": "Expectations", "background": "#F3F7FA", "rows": [{"columns": [
            {"width": 33.33, "elements": [_icon("calendar"), _text("subHeading", "Pick a Time", fontSize=24), _text("paragraph", "Choose the slot that works best for your schedule.", fontSize=16)]},
            {"width": 33.33, "elements": [_icon("spark"), _text("subHeading", "Share Your Goals", fontSize=24), _text("paragraph", "Answer a few questions so the conversation starts with context.", fontSize=16)]},
            {"width": 33.34, "elements": [_icon("check"), _text("subHeading", "Get a Clear Plan", fontSize=24), _text("paragraph", "Leave knowing what to prioritize and what to avoid.", fontSize=16)]},
        ]}]},
        {"name": "Trust", "align": "center", "maxWidth": 780, "rows": [{"columns": [{"elements": [_text("subHeading", "A useful conversation, whether or not we work together", align="center"), _text("paragraph", "Add one verified testimonial from a client who valued the strategy and clarity of the first conversation.", align="center")]}]}]},
    ]}


def _intake_template() -> dict[str, Any]:
    return {"name": "Client Onboarding Intake", "path": "/welcome", "sections": [
        {"name": "Welcome", "align": "center", "maxWidth": 820, "rows": [{"columns": [{"elements": [_text("paragraph", "WELCOME TO OTTER PR", role="eyebrow", align="center"), _text("heading", "Let’s Build the Foundation for a Strong Campaign", align="center"), _text("paragraph", "This secure intake gives your team the context, assets, and access needed to begin with momentum.", align="center", fontSize=20), _button("Start My Intake", scrollToElement="client-intake")]}]}]},
        {"name": "Before You Begin", "background": "#F3F7FA", "rows": [{"columns": [
            {"width": 33.33, "elements": [_icon("calendar"), _text("subHeading", "Set Aside 15 Minutes", fontSize=23), _text("paragraph", "Complete the intake in one sitting when possible.", fontSize=16)]},
            {"width": 33.33, "elements": [_icon("spark"), _text("subHeading", "Gather Key Assets", fontSize=23), _text("paragraph", "Have your bio, headshot, links, and brand materials ready.", fontSize=16)]},
            {"width": 33.34, "elements": [_icon("shield"), _text("subHeading", "Be Specific", fontSize=23), _text("paragraph", "Concrete goals and examples help the team move faster.", fontSize=16)]},
        ]}]},
        {"id": "client-intake", "name": "Intake Form", "maxWidth": 900, "rows": [{"columns": [{"customClass": ["lp-form-card"], "paddingTop": 26, "paddingBottom": 26, "paddingLeft": 26, "paddingRight": 26, "elements": [_text("subHeading", "Tell us what success looks like", align="left"), _text("paragraph", "Required fields are marked. Your progress and next steps should be explained inside the form.", align="left"), {"type": "form", "formId": "REPLACE_WITH_GHL_INTAKE_FORM_ID", "name": "Client intake form"}]}]}]},
        {"name": "What Happens Next", "align": "center", "maxWidth": 760, "rows": [{"columns": [{"elements": [_text("subHeading", "After you submit, your team takes it from here", align="center"), _text("paragraph", "You will receive confirmation immediately. Your account lead will review the intake and contact you with any follow-up questions before kickoff.", align="center")]}]}]},
    ]}


def lint_spec(source: dict[str, Any], *, strict: bool = False) -> dict[str, Any]:
    """Return a scored, machine-readable design and conversion audit."""
    spec = apply_design_system(source)
    issues: list[dict[str, str]] = []

    def add(severity: str, code: str, path: str, message: str) -> None:
        issues.append({"severity": severity, "code": code, "path": path, "message": message})

    sections = spec.get("sections", [])
    if not sections:
        add("error", "structure.empty", "sections", "Page needs at least one section.")
    headings: list[tuple[str, dict[str, Any]]] = []
    desktop_h1_count = 0
    mobile_h1_count = 0
    buttons: list[tuple[str, dict[str, Any]]] = []
    visuals = 0
    images = 0
    videos = 0
    embeds = 0
    trust = 0
    action_targets: set[str] = set()
    calendar_section_ids = {
        str(section.get("id"))
        for section in sections
        if section.get("id") and any(
            el.get("type") == "calendar"
            for row in section.get("rows", []) for col in row.get("columns", [])
            for el in col.get("elements", [])
        )
    }
    for si, section in enumerate(sections):
        sp = f"sections[{si}]"
        section_elements = [el for row in section.get("rows", []) for col in row.get("columns", [])
                            for el in col.get("elements", [])]
        if si == 0 and len(section_elements) > 8:
            add("warning", "hero.overloaded", sp, "Keep the first screen to one promise, one explanation, one visual, proof, and one action.")
        if section.get("maxWidth", 1120) > 1280:
            add("warning", "layout.too-wide", sp, "Content width above 1280px weakens hierarchy and readability.")
        if not section.get("compact") and (section.get("paddingTop", 0) < 48 or section.get("paddingBottom", 0) < 48):
            add("warning", "spacing.section", sp, "Use at least 48px vertical section padding unless this is a compact strip.")
        for ri, row in enumerate(section.get("rows", [])):
            cols = row.get("columns", [])
            if cols and abs(sum(float(c.get("width", 100 / len(cols))) for c in cols) - 100) > .5:
                add("error", "grid.width", f"{sp}.rows[{ri}]", "Column widths should total 100%.")
            for ci, col in enumerate(cols):
                surface = col.get("background") or section.get("background") or "#FFFFFF"
                elements = col.get("elements", [])
                for ei, el in enumerate(elements):
                    path = f"{sp}.rows[{ri}].columns[{ci}].elements[{ei}]"
                    kind = el.get("type", "paragraph")
                    if kind == "heading":
                        headings.append((path, el))
                        hidden_desktop = any(bool(node.get("hideDesktop")) for node in (section, row, col, el))
                        hidden_mobile = any(bool(node.get("hideMobile")) for node in (section, row, col, el))
                        if not hidden_desktop:
                            desktop_h1_count += 1
                        if not hidden_mobile:
                            mobile_h1_count += 1
                        word_count = len(str(el.get("text", "")).split())
                        if word_count > 18:
                            add("warning", "type.long-h1", path, "Hero heading exceeds 18 words; confirm it scans in three mobile lines or fewer.")
                        if el.get("mobileFontSize", 38) > 44:
                            add("warning", "type.mobile-h1", path, "Mobile hero headings should usually stay at or below 44px.")
                    elif kind in {"paragraph", "bulletList"}:
                        text_value = (el.get("text") or el.get("html") or "").lower()
                        if any(word in text_value for word in ("trusted by", "featured in", "verified result", "client result")):
                            trust += 1
                        if el.get("mobileFontSize", el.get("fontSize", 18)) < 16:
                            add("warning", "type.small-body", path, "Body copy below 16px is difficult to read on mobile.")
                        if kind == "paragraph" and el.get("lineHeight", 1.65) < 1.4:
                            add("warning", "type.tight-leading", path, "Paragraph line height should be at least 1.4.")
                    elif kind == "button":
                        buttons.append((path, el))
                        target = "" if el.get("scrollToElement") else (el.get("url") or el.get("action", ""))
                        if target:
                            action_targets.add(target)
                        if el.get("paddingTop", 16) + el.get("paddingBottom", 16) + el.get("fontSize", 17) < 48:
                            add("error", "cta.target-size", path, "Primary controls must be at least 48px tall.")
                        if el.get("text", "").strip().lower() in {"submit", "click here", "learn more"}:
                            add("warning", "cta.generic", path, "Use an action-and-benefit CTA instead of generic button copy.")
                        if (el.get("action") == "scroll-to-element"
                                and str(el.get("scrollToElement", "")) in calendar_section_ids):
                            add("error", "cta.calendar-redundant", path,
                                "Remove the jump button when the embedded calendar is the primary action; place the calendar directly after the booking copy.")
                    elif kind == "image":
                        visuals += 1
                        images += 1
                        if not el.get("alt"):
                            add("warning", "media.alt", path, "Meaningful images need concise alt text; decorative images should use alt=''.")
                        if _is_logo(el) and el.get("align") != "center":
                            add("error", "media.logo-center", path,
                                "Brand logos must be explicitly centered; use role='logo' or a logo-identifying alt/URL together with align='center'.")
                    elif kind in {"video", "logoShowcase"}:
                        visuals += 1
                        trust += kind == "logoShowcase"
                        if kind == "video":
                            videos += 1
                            if el.get("autoplay"):
                                add("warning", "media.autoplay", path, "Autoplay is an explicit exception, not a template default; preserve controls and a reduced-motion path.")
                    elif kind in {"form", "calendar", "survey"}:
                        visuals += 1
                        embeds += 1
                        asset_key = f"{kind}Id"
                        value = str(el.get(asset_key, ""))
                        if not value or value.startswith(PLACEHOLDER_PREFIX):
                            add("error", "integration.placeholder", path, f"Replace {asset_key} with a real GHL asset id before publishing.")
                    elif kind in {"countdown", "timer"}:
                        if not el.get("urgencyReason"):
                            add("warning", "urgency.unexplained", path, "State the real event or availability change this timer represents.")
                        if kind == "timer":
                            add("warning", "urgency.evergreen", path, "Evergreen timers require explicit review; never reset a deadline that the visitor was told was real.")
                        if not any(el.get(key) for key in ("redirectUrl", "expireAction", "hideOnExpire")):
                            add("warning", "urgency.expiry", path, "Define what visitors see or where they go when the timer expires.")
                    payload = json.dumps(el)
                    if PLACEHOLDER_PREFIX in payload and kind not in {"form", "calendar", "survey"}:
                        add("error", "content.placeholder", path, "Replace template placeholder content before publishing.")
                    if kind in {"heading", "subHeading", "subheading", "paragraph", "bulletList", "button"}:
                        foreground = el.get("color")
                        background = el.get("background") if kind == "button" else surface
                        ratio = _contrast(str(foreground or ""), str(background or ""))
                        font_size = float(el.get("fontSize", 18))
                        threshold = 3 if font_size >= 24 else 4.5
                        if ratio is not None and ratio < threshold:
                            add("error", "color.contrast", path,
                                f"Text contrast is {ratio:.2f}:1; use at least {threshold:.1f}:1 for this size.")
                    if ei < len(elements) - 1:
                        following = elements[ei + 1]
                        gap = _number(el.get("marginBottom", 0)) + _number(following.get("marginTop", 0))
                        if (_is_logo(el) or _is_media_block(el) or kind == "image") and gap < 12:
                            add("error", "spacing.element-collapse", path,
                                "Add at least 12px of explicit vertical space after a logo, image, or primary media block so adjacent content does not touch it.")
        name = section.get("name", "").lower()
        if any(word in name for word in ("proof", "trust", "result", "testimonial")):
            trust += 1

        generic_headings = {"how it works", "features", "what you get", "about us", "why choose us",
                            "our process", "testimonials", "pricing"}
        for el in section_elements:
            if el.get("type") in {"subHeading", "subheading"} and str(el.get("text", "")).strip().lower() in generic_headings:
                add("warning", "copy.generic-heading", sp, "Make section headings advance the sales argument instead of labeling the section.")

    if desktop_h1_count != 1 or mobile_h1_count != 1:
        add("error", "type.h1-count", "sections",
            f"Use exactly one primary heading per viewport; found {desktop_h1_count} desktop and {mobile_h1_count} mobile.")
    if not buttons and not any(el.get("type") in {"form", "calendar", "survey"} for s in sections for r in s.get("rows", []) for c in r.get("columns", []) for el in c.get("elements", [])):
        add("error", "cta.missing", "sections", "Page needs one obvious conversion action.")
    if len(action_targets) > 1:
        add("warning", "cta.competing", "sections", "Buttons lead to multiple destinations; landing pages should keep one action path.")
    if sections:
        first = json.dumps(sections[0])
        second = json.dumps(sections[1]) if len(sections) > 1 else ""
        calendar_follows_hero = '"type": "calendar"' in second
        if (not any(k in first for k in ('"type": "button"', '"type": "form"', '"type": "calendar"', '"type": "survey"'))
                and not calendar_follows_hero):
            add("error", "hero.cta", "sections[0]", "The primary action must be visible above the fold.")
        if visuals == 0:
            add("info", "media.none", "sections", "Consider one explanatory visual, product image, or video; avoid decoration for its own sake.")
        template_name = ((spec.get("designSystem") or {}).get("template") or "")
        if trust == 0 and len(sections) > 2 and template_name not in {"intake"}:
            add("warning", "proof.missing", "sections", "Add verified proof near the claim or objection it supports.")
        if images > 20:
            add("warning", "media.image-budget", "sections", f"Page contains {images} images. Curate the strongest proof and lazy-load below-fold media.")
        if videos > 3:
            add("warning", "media.video-budget", "sections", f"Page contains {videos} videos. Use one primary story and only objection-matched supporting clips.")
        if template_name in {"vsl", "vsl-application"} and videos != 1:
            add("error", "media.vsl-count", "sections", f"A VSL page should have exactly one primary video; found {videos}.")
        if template_name in {"roadmap", "application", "vsl-application"} and embeds != 1:
            add("error", "form.flow-count", "sections", f"This funnel should have one focused form or survey; found {embeds}.")
        ceilings = {"optin": 4, "roadmap": 4, "calendar": 5, "intake": 5, "vsl": 6,
                    "application": 6, "vsl-application": 8, "membership": 9, "sales-letter": 14}
        if template_name in ceilings and len(sections) > ceilings[template_name]:
            add("warning", "structure.too-long", "sections", f"{template_name} pages should usually stay within {ceilings[template_name]} sections.")
        if template_name in {"optin", "roadmap", "calendar"} and any("faq" in str(s.get("name", "")).lower() for s in sections):
            add("warning", "structure.low-friction-faq", "sections", "Low-friction pages rarely need an FAQ; resolve the objection closer to the action.")
        required_names = {
            "sales-letter": ("mechanism", "proof", "fit", "offer", "guarantee", "faq", "final"),
            "membership": ("proof", "plans", "comparison", "faq", "cta"),
            "vsl-application": ("proof", "mechanism", "fit", "application"),
        }
        section_names = " ".join(str(s.get("name", "")).lower() for s in sections)
        for required in required_names.get(template_name, ()):
            if required not in section_names:
                add("error", "structure.required-stage", "sections", f"The {template_name} argument needs a clearly named {required} stage.")
        if template_name in {"sales-letter", "membership", "application", "vsl-application"}:
            for path, button in buttons:
                if not button.get("subText"):
                    add("warning", "cta.microcopy", path, "High-consideration CTAs need concise risk, time, price, or next-step microcopy.")
    if source.get("popup"):
        popup = source["popup"]
        if popup.get("exitIntent") and len(popup.get("rows", [])) > 1:
            add("warning", "popup.complex", "popup", "Exit popups should make one offer and request minimal information.")
        if float(popup.get("width", 720)) > 760:
            add("warning", "popup.width", "popup", "Keep popups at 760px or narrower and preserve mobile gutters.")
        popup_elements = [el for row in popup.get("rows", []) for col in row.get("columns", [])
                          for el in col.get("elements", [])]
        if not any(el.get("type") in {"heading", "subHeading", "subheading"} for el in popup_elements):
            add("error", "popup.label", "popup", "Popup needs a visible, descriptive heading.")
        actions = sum(el.get("type") in {"button", "form", "survey", "calendar"} for el in popup_elements)
        if actions > 1:
            add("warning", "popup.actions", "popup", "Popup should have one primary action or embed.")
        if ((spec.get("designSystem") or {}).get("template") == "intake"):
            add("error", "popup.intake", "popup", "Do not interrupt an onboarding/intake flow with a popup.")

    deductions = {"error": 12, "warning": 5, "info": 1}
    score = max(0, 100 - sum(deductions[i["severity"]] for i in issues))
    errors = sum(i["severity"] == "error" for i in issues)
    return {"score": score, "passed": errors == 0 and (not strict or not issues),
            "summary": {s: sum(i["severity"] == s for i in issues) for s in ("error", "warning", "info")},
            "issues": issues}


def render_preview(source: dict[str, Any], output: str | Path) -> Path:
    """Render a dependency-free, approximate desktop/mobile design preview."""
    spec = apply_design_system(source)
    t = THEMES[(spec.get("designSystem") or {}).get("theme", "otter")]

    def styles(data: dict[str, Any], keys: tuple[str, ...]) -> str:
        rules = []
        mapping = {"background": "background", "color": "color", "fontSize": "font-size", "lineHeight": "line-height",
                   "paddingTop": "padding-top", "paddingBottom": "padding-bottom", "paddingLeft": "padding-left", "paddingRight": "padding-right",
                   "marginTop": "margin-top", "marginBottom": "margin-bottom", "maxWidth": "max-width", "width": "width", "align": "text-align"}
        for key in keys:
            if key not in data:
                continue
            value = data[key]
            if key in {"fontSize", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "marginTop", "marginBottom", "maxWidth"} and isinstance(value, (int, float)):
                value = f"{value}px"
            if key == "width" and isinstance(value, (int, float)):
                value = f"{value}%"
            rules.append(f"{mapping[key]}:{value}")
        return ";".join(rules)

    def cls(data: dict[str, Any]) -> str:
        value = data.get("customClass", [])
        return html.escape(" ".join([value] if isinstance(value, str) else value))

    def element(el: dict[str, Any]) -> str:
        kind = el.get("type", "paragraph")
        content = el.get("html") or html.escape(str(el.get("text", "")))
        style = styles(el, ("color", "fontSize", "lineHeight", "marginTop", "marginBottom", "align"))
        classes = cls(el)
        if kind == "heading": return f'<h1 class="{classes}" style="{style}">{content}</h1>'
        if kind in {"subHeading", "subheading"}: return f'<h2 class="{classes}" style="{style}">{content}</h2>'
        if kind == "paragraph": return f'<div class="text {classes}" style="{style}">{content}</div>'
        if kind == "bulletList": return f'<ul class="{classes}" style="{style}">' + "".join(f'<li>{html.escape(str(x))}</li>' for x in el.get("items", [])) + "</ul>"
        if kind == "button": return f'<a class="button {classes}" href="#" style="{style};background:{el.get("background", t["primary"])};color:{el.get("color", t["accentInk"])}">{html.escape(el.get("text", "Continue"))}<small>{html.escape(el.get("subText", ""))}</small></a>'
        if kind == "image": return f'<img class="{classes}" src="{html.escape(el.get("url", ""))}" alt="{html.escape(el.get("alt", ""))}" style="max-width:{el.get("width", "100%")} ">'
        if kind == "video": return f'<div class="placeholder video {classes}"><span>▶</span><b>Video</b><small>{html.escape(el.get("url", "Add video URL"))}</small></div>'
        if kind in {"form", "calendar", "survey"}: return f'<div class="placeholder embed {classes}"><b>{kind.title()} embed</b><div class="fake-field">Persistent field label</div><div class="fake-input"></div><div class="fake-submit">Primary action</div></div>'
        if kind == "faq": return '<div class="faq">' + "".join(f'<details><summary>{html.escape(x.get("question", "Question"))}</summary><p>{html.escape(x.get("answer", "Answer"))}</p></details>' for x in el.get("items", [])) + "</div>"
        if kind == "logoShowcase": return '<div class="logos">VERIFIED LOGOS / PROOF</div>'
        if kind == "customCode": return el.get("html", "")
        return f'<div class="placeholder">{html.escape(kind)} element</div>'

    body = []
    for section in spec.get("sections", []):
        sec_style = styles(section, ("background", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight"))
        rows = []
        for row in section.get("rows", []):
            columns = []
            for col in row.get("columns", []):
                col_style = styles(col, ("background", "width", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight"))
                columns.append(f'<div class="column {cls(col)}" style="{col_style}">' + "".join(element(e) for e in col.get("elements", [])) + "</div>")
            rows.append(f'<div class="row {cls(row)}">' + "".join(columns) + "</div>")
        body.append(f'<section class="{cls(section)}" style="{sec_style}"><div class="container" style="max-width:{section.get("maxWidth",1120)}px">' + "".join(rows) + "</div></section>")
    design_css = spec.get("customCss", "").replace(".hl_page-preview--content ", "")
    base_css = """
    :root{--headline:'%(headlineFont)s';--body:'%(contentFont)s'}*{box-sizing:border-box}body{margin:0;font-family:var(--body);color:%(body)s}h1,h2{font-family:var(--headline);margin-top:0}h1{font-size:58px;line-height:1.08}h2{font-size:38px;line-height:1.15}.container{margin:auto}.row{display:flex;align-items:stretch}.column{min-width:0}.text{margin-bottom:16px}.lp-centered .button{display:flex;width:max-content;margin-left:auto;margin-right:auto}ul{padding-left:22px}li{margin:10px 0}.button{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;padding:16px 24px;border-radius:10px;text-decoration:none;font-weight:700;min-height:52px}.button small{font-weight:500;opacity:.8;margin-top:3px}.placeholder{border:1px dashed %(line)s;border-radius:18px;padding:32px;text-align:center;background:%(soft)s}.video{aspect-ratio:16/9;display:grid;place-content:center;gap:8px}.video span{font-size:48px}.video small{display:block}.embed{text-align:left}.fake-field{font-size:13px;font-weight:700;margin:22px 0 7px}.fake-input{height:48px;background:white;border:1px solid %(line)s;border-radius:8px}.fake-submit{background:%(primary)s;color:%(accentInk)s;padding:15px;border-radius:8px;text-align:center;font-weight:700;margin-top:16px}details{border-bottom:1px solid %(line)s;padding:18px 0}summary{font-weight:700;cursor:pointer}.logos{padding:28px;border:1px dashed %(line)s;text-align:center;letter-spacing:.12em;font-size:12px}
    """ % t
    doc = f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(spec.get("name","Landing Page Preview"))}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family={t['headlineFont'].replace(' ','+')}:wght@500;600;700&family={t['contentFont'].replace(' ','+')}:wght@400;500;600;700&display=swap" rel="stylesheet"><style>
    {base_css}{design_css}
    @media(max-width:767px){{section{{padding:52px 20px!important}}.row{{display:block}}.column{{width:100%!important}}h1{{font-size:38px!important}}h2{{font-size:29px!important}}.button{{width:100%}}}}
    </style></head><body>{''.join(body)}</body></html>'''
    path = Path(output)
    path.write_text(doc, encoding="utf-8")
    return path
