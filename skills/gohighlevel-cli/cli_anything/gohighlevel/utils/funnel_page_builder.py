"""Compact JSON specs -> GHL page-builder v2 data.

This is an unofficial, production-schema adapter.  GHL stores a section's
nodes as a flat list and links them with ``child`` ids; this module lets callers
author the more natural section -> row -> column -> element hierarchy.
"""
from __future__ import annotations

import html
import copy
import secrets
from typing import Any


def _id(kind: str) -> str:
    return f"{kind}-{secrets.token_urlsafe(8).replace('-', '_')}"


def _v(value: Any, unit: str | None = None) -> dict[str, Any]:
    out = {"value": value}
    if unit is not None:
        out["unit"] = unit
    return out


def _visibility(spec: dict[str, Any]) -> dict[str, Any]:
    return _v({"hideDesktop": bool(spec.get("hideDesktop", False)),
               "hideMobile": bool(spec.get("hideMobile", False))})


def _box_class() -> dict[str, Any]:
    return {"boxShadow": _v("none"), "borders": _v("noBorder"),
            "borderRadius": _v("radius0"), "radiusEdge": _v("none")}


def _border_styles() -> dict[str, Any]:
    return {"borderColor": _v("var(--black)"), "borderWidth": _v("2", "px"),
            "borderStyle": _v("solid")}


def _bg_image(spec: dict[str, Any] | None = None) -> dict[str, Any]:
    spec = spec or {}
    video_url = spec.get("backgroundVideo", "")
    return _v({"mediaType": "video" if video_url else "image",
               "url": spec.get("backgroundImage", ""),
               "opacity": str(spec.get("backgroundOpacity", 1)),
               "options": spec.get("backgroundSize", "bgCover"),
               "svgCode": spec.get("backgroundSvg", ""), "videoUrl": video_url,
               "videoThumbnail": spec.get("backgroundVideoThumbnail", ""),
               "videoLoop": bool(spec.get("backgroundVideoLoop", True))})


def _spacing(spec: dict[str, Any], default: int = 0) -> dict[str, Any]:
    return {
        "paddingLeft": _v(spec.get("paddingLeft", default), "px"),
        "paddingRight": _v(spec.get("paddingRight", default), "px"),
        "paddingTop": _v(spec.get("paddingTop", default), "px"),
        "paddingBottom": _v(spec.get("paddingBottom", default), "px"),
    }


def _default_margin_bottom(spec: dict[str, Any], kind: str) -> Any:
    """Preserve explicit rhythm while preventing compact elements from touching."""
    if "marginBottom" in spec:
        return spec["marginBottom"]
    if kind == "heading":
        return 20
    if kind in {"subHeading", "subheading", "paragraph"}:
        return 16
    if kind in {"image", "bulletList", "video"}:
        return 20
    if kind == "customCode":
        role = str(spec.get("role", "")).lower()
        classes = " ".join(spec.get("customClass", [])) if isinstance(spec.get("customClass"), list) else str(spec.get("customClass", ""))
        markup = str(spec.get("html", ""))
        if "video" in f"{role} {classes} {markup}".lower():
            return 24
    return 0


def _css_length(value: Any, default_unit: str = "px") -> str:
    text = str(value)
    return text if any(text.endswith(u) for u in ("px", "%", "em", "rem", "vh", "vw")) else f"{text}{default_unit}"


def _section_css(section_id: str, section_spec: dict[str, Any], nodes: list[dict[str, Any]]) -> str:
    """Generate the CSS artifact the GHL renderer expects beside node data."""
    rules = [
        f".hl_page-preview--content .{section_id}{{"
        f"padding:{_css_length(section_spec.get('paddingTop', 20))} "
        f"{_css_length(section_spec.get('paddingRight', 20))} "
        f"{_css_length(section_spec.get('paddingBottom', 20))} "
        f"{_css_length(section_spec.get('paddingLeft', 20))};"
        f"background-color:{section_spec.get('background', 'var(--white)')};"
        + (f"background-image:url('{section_spec['backgroundImage']}');background-size:cover;background-position:center;" if section_spec.get("backgroundImage") else "")
        + "}",
        f"#{section_id}>.inner{{max-width:{_css_length(section_spec.get('maxWidth', 1170))}}}",
        f"@media(max-width:767px){{.hl_page-preview--content .{section_id}{{"
        f"padding:{_css_length(section_spec.get('mobilePaddingTop', section_spec.get('paddingTop', 20)))} "
        f"{_css_length(section_spec.get('mobilePaddingRight', section_spec.get('paddingRight', 20)))} "
        f"{_css_length(section_spec.get('mobilePaddingBottom', section_spec.get('paddingBottom', 20)))} "
        f"{_css_length(section_spec.get('mobilePaddingLeft', section_spec.get('paddingLeft', 20)))}!important}}}}",
    ]
    for node in nodes:
        nid = node["id"]
        styles = node.get("styles", {})
        def val(name: str, fallback: Any = "") -> Any:
            return styles.get(name, {}).get("value", fallback)
        if node.get("meta") == "row":
            rules.append(
                f".hl_page-preview--content .{nid}{{padding:{_css_length(val('paddingTop', 0))} "
                f"{_css_length(val('paddingRight', 0))} {_css_length(val('paddingBottom', 0))} "
                f"{_css_length(val('paddingLeft', 0))};background-color:{val('backgroundColor', 'var(--transparent)')}}}"
            )
        elif node.get("meta") == "col":
            justify = node.get("extra", {}).get("justifyContentColumnLayout", {}).get("value", "flex-start")
            align = node.get("extra", {}).get("alignContentColumnLayout", {}).get("value", "inherit")
            rules.extend([
                f".hl_page-preview--content .{nid}{{padding:{_css_length(val('paddingTop', 10))} "
                f"{_css_length(val('paddingRight', 10))} {_css_length(val('paddingBottom', 10))} "
                f"{_css_length(val('paddingLeft', 10))};background-color:{val('backgroundColor', 'var(--transparent)')};"
                f"width:{_css_length(val('width', 100), '%')}}}",
                f"#{nid}>.inner{{display:flex;flex-direction:column;justify-content:{justify};align-items:{align}}}",
            ])
        elif node.get("type") == "element":
            extra = node.get("extra", {})
            margin_top = node.get("wrapper", {}).get("marginTop", {}).get("value", 0)
            margin_bottom = node.get("wrapper", {}).get("marginBottom", {}).get("value", 0)
            rules.append(f".{nid}{{margin-top:{_css_length(margin_top)};margin-bottom:{_css_length(margin_bottom)}}}")
            if node.get("meta") in {"heading", "sub-heading", "paragraph"}:
                node_id = extra.get("nodeId") or f"c{nid}"
                rules.append(
                    f".{node_id}{{font-family:{extra.get('typography', {}).get('value', 'var(--contentfont)')};"
                    f"color:{val('color', 'var(--text-color)')};font-weight:{val('fontWeight', 'normal')};"
                    f"line-height:{_css_length(val('lineHeight', 1.3), 'em')};"
                    f"letter-spacing:{_css_length(val('letterSpacing', 0))};text-align:{val('textAlign', 'center')}}}"
                )
                desktop = extra.get("desktopFontSize", {}).get("value", 18)
                mobile = extra.get("mobileFontSize", {}).get("value", desktop)
                rules.extend([
                    f"@media(max-width:480px){{.{nid}.text-output, .{nid}.text-output *{{font-size:{_css_length(mobile)}!important}}}}",
                    f"@media(min-width:481px){{.{nid}.text-output, .{nid}.text-output *{{font-size:{_css_length(desktop)}!important}}}}",
                ])
            elif node.get("meta") == "bulletList":
                node_id = extra.get("nodeId") or f"c{nid}"
                desktop = extra.get("desktopFontSize", {}).get("value", 18)
                mobile = extra.get("mobileFontSize", {}).get("value", desktop)
                rules.extend([
                    f".{node_id}{{font-family:{extra.get('typography', {}).get('value', 'var(--contentfont)')};"
                    f"color:{val('color', 'var(--text-color)')};line-height:{_css_length(val('lineHeight', 1.4), 'em')};"
                    f"text-align:{val('textAlign', 'left')}}}",
                    f"@media(max-width:480px){{.{nid},.{nid} *{{font-size:{_css_length(mobile)}!important}}}}",
                    f"@media(min-width:481px){{.{nid},.{nid} *{{font-size:{_css_length(desktop)}!important}}}}",
                ])
            elif node.get("meta") == "button":
                node_id = extra.get("nodeId") or f"c{nid}"
                desktop = extra.get("desktopFontSize", {}).get("value", 18)
                mobile = extra.get("mobileFontSize", {}).get("value", desktop)
                rules.extend([
                    f".{node_id}{{font-family:{extra.get('typography', {}).get('value', 'var(--contentfont)')};"
                    f"background:{val('backgroundColor', 'var(--primary)')};color:{val('color', 'var(--white)')};"
                    f"padding:{_css_length(val('paddingTop', 15))} {_css_length(val('paddingRight', 20))};"
                    f"border:{_css_length(val('borderWidth', 1))} {val('borderStyle', 'solid')} {val('borderColor', '#00000033')};"
                    f"font-weight:{val('fontWeight', 'bold')};text-transform:{val('textTransform', 'none')}}}",
                    f"@media(max-width:480px){{.{node_id}{{font-size:{_css_length(mobile)}!important}}}}",
                    f"@media(min-width:481px){{.{node_id}{{font-size:{_css_length(desktop)}!important}}}}",
                ])
            elif node.get("meta") == "image":
                align = val("textAlign", "center")
                rules.append(f".{nid}{{text-align:{align}}}")
                if align == "center":
                    rules.append(f".{nid} img{{display:block;margin-left:auto;margin-right:auto}}")
    return "".join(rules)


def _text_element(spec: dict[str, Any], meta: str) -> dict[str, Any]:
    schema_meta = "sub-heading" if meta == "subHeading" else meta
    eid = spec.get("id") or _id(schema_meta)
    tag = spec.get("tag") or ("h1" if meta == "heading" else "p")
    if spec.get("html") is not None:
        raw = str(spec.get("html") or "")
        if not raw.lstrip().lower().startswith(f"<{tag}"):
            raw = f"<{tag}>{raw}</{tag}>"
    else:
        raw = f"<{tag}>{html.escape(str(spec.get('text') or ''))}</{tag}>"
    size = int(spec.get("fontSize", 18 if meta == "paragraph" else 42))
    default_weight = "700" if meta in {"heading", "subHeading"} else "normal"
    return {
        "id": eid, "type": "element", "child": [], "meta": schema_meta,
        "tagName": f"c-{schema_meta}", "title": spec.get("title", schema_meta.title()), "tag": tag,
        "class": _box_class(),
        "styles": {
            "backgroundColor": _v(spec.get("background", "var(--transparent)")),
            "color": _v(spec.get("color", "var(--text-color)")),
            "boldTextColor": _v(spec.get("color", "var(--text-color)")),
            "italicTextColor": _v(spec.get("color", "var(--text-color)")),
            "underlineTextColor": _v(spec.get("color", "var(--text-color)")),
            "linkTextColor": _v(spec.get("linkColor", "var(--link-color)")),
            "iconColor": _v(spec.get("color", "var(--text-color)")),
            "fontFamily": _v(""), "fontWeight": _v(spec.get("weight", default_weight)),
            **_spacing(spec), "opacity": _v("1"),
            "textShadow": _v("0px 0px 0px rgba(0,0,0,0)"), **_border_styles(),
            "lineHeight": _v(spec.get("lineHeight", 1.3), "em"),
            "textTransform": _v(""),
            "letterSpacing": _v(spec.get("letterSpacing", 0), "px"),
            "textAlign": _v(spec.get("align", "center")),
        },
        "extra": {
            "nodeId": f"c{eid}", "visibility": _visibility(spec), "text": _v(raw),
            "mobileFontSize": _v(int(spec.get("mobileFontSize", size)), "px"),
            "desktopFontSize": _v(size, "px"),
            "typography": _v("var(--headlinefont)" if meta == "heading" else "var(--contentfont)"),
            "icon": _v({"name": "", "unicode": "", "fontFamily": ""}),
            "customClass": _v(spec.get("customClass", [])),
        },
        "wrapper": {"marginTop": _v(spec.get("marginTop", 0), "px"),
                    "marginBottom": _v(_default_margin_bottom(spec, meta), "px")},
        "customCss": [], "mobileStyles": {},
    }


def _asset_element(spec: dict[str, Any], kind: str, id_key: str) -> dict[str, Any]:
    asset_id = spec.get(id_key)
    if not asset_id:
        raise ValueError(f"{kind} element requires {id_key!r}")
    eid = spec.get("id") or _id(kind)
    return {
        "id": eid, "type": "element", "child": [], "meta": kind,
        "tagName": f"c-{kind}", "title": spec.get("title", kind.title()), "tag": "",
        "class": {}, "styles": _spacing(spec),
        "extra": {"nodeId": f"c{eid}", "visibility": _visibility(spec),
                  id_key: {"value": asset_id, "text": spec.get("name", kind.title())},
                  "action": _v(spec.get("action", "go-to-next-funnel-step")),
                  "visitWebsite": _v({"url": spec.get("redirectUrl", ""),
                                      "newTab": bool(spec.get("newTab", False))}),
                  "customClass": _v(spec.get("customClass", []))},
        "wrapper": {"marginTop": _v(spec.get("marginTop", 0), "px"),
                    "marginBottom": _v(spec.get("marginBottom", 0), "px"),
                    "marginLeft": _v(spec.get("marginLeft", 0), "px"),
                    "marginRight": _v(spec.get("marginRight", 0), "px")},
        "customCss": [], "mobileStyles": None,
    }


def _button_element(spec: dict[str, Any]) -> dict[str, Any]:
    eid = spec.get("id") or _id("button")
    return {
        "id": eid, "type": "element", "child": [], "meta": "button",
        "tagName": "c-button", "title": spec.get("title", "Button"), "tag": "",
        "class": {"buttonEffects": _v(spec.get("effect", "buttonElevate")),
                  "buttonBoxShadow": _v(spec.get("shadow", "button-shadow-sharp1")),
                  "buttonBgStyle": _v("custom"), "buttonVp": _v("btn-vp"),
                  "buttonHp": _v("btn-hp"), "borders": _v("borderFull"),
                  "borderRadius": _v(spec.get("radius", "radius5")), "radiusEdge": _v("none")},
        "styles": {"backgroundColor": _v(spec.get("background", spec.get("backgroundColor", "var(--primary)"))),
                   "color": _v(spec.get("color", spec.get("textColor", "var(--white)"))),
                   "secondaryColor": _v(spec.get("color", spec.get("textColor", "var(--white)"))),
                   "textDecoration": _v("none"), **_spacing(spec, 15),
                   "fontWeight": _v(spec.get("weight", "bold")),
                   "borderColor": _v(spec.get("borderColor", "#00000033")),
                   "borderWidth": _v(spec.get("borderWidth", 1), "px"),
                   "borderStyle": _v("solid"), "letterSpacing": _v(spec.get("letterSpacing", 0), "px"),
                   "textTransform": _v(spec.get("textTransform", "none")),
                   "textShadow": _v("0px 0px 0px rgba(0,0,0,0)"),
                   "width": _v(spec.get("width", "auto"), "%")},
        "extra": {"nodeId": f"c{eid}", "visibility": _visibility(spec),
                  "text": _v(spec.get("text", "Click Here")), "subText": _v(spec.get("subText", "")),
                  "mobileFontSize": _v(spec.get("mobileFontSize", 18), "px"),
                  "desktopFontSize": _v(spec.get("fontSize", 20), "px"),
                  "subTextDesktopFontSize": _v(spec.get("subTextFontSize", 14), "px"),
                  "subTextMobileFontSize": _v(spec.get("subTextMobileFontSize", 14), "px"),
                  "typography": _v(spec.get("typography", "var(--contentfont)")),
                  "iconStart": _v(spec.get("iconStart", {"name": "", "unicode": "", "fontFamily": ""})),
                  "iconEnd": _v(spec.get("iconEnd", {"name": "", "unicode": "", "fontFamily": ""})),
                  "action": _v(spec.get("action", "go-to-next-funnel-step")),
                  "visitWebsite": _v({"url": spec.get("url", ""), "newTab": bool(spec.get("newTab", False))}),
                  "hideElements": _v(spec.get("hideElements", [])),
                  "scrollToElement": _v(spec.get("scrollToElement", "")),
                  "phoneNumber": _v(spec.get("phoneNumber", "")), "emailAddress": _v(spec.get("email", "")),
                  "productId": _v(spec.get("productId", "")), "stepPath": _v(spec.get("stepPath", "")),
                  "saleAction": _v(spec.get("saleAction", "go-to-next-funnel-step")),
                  "theme": _v(spec.get("theme", "button_theme_1")), "customClass": _v(spec.get("customClass", []))},
        "wrapper": {"marginTop": _v(spec.get("marginTop", 0), "px"),
                    "marginBottom": _v(spec.get("marginBottom", 0), "px"),
                    "textAlign": _v(spec.get("align", "center"))},
        "customCss": [], "mobileStyles": None,
    }


def _native_element(spec: dict[str, Any]) -> dict[str, Any]:
    """Embed any GHL-native node while safely assigning a fresh element id."""
    node = copy.deepcopy(spec.get("node"))
    if not isinstance(node, dict) or node.get("type") != "element":
        raise ValueError("native element requires a full GHL element object in 'node'")
    old_id = node.get("id", "")
    new_id = spec.get("id") or _id(node.get("meta", "native"))
    node["id"] = new_id
    node["child"] = []
    if isinstance(node.get("extra"), dict):
        node["extra"]["nodeId"] = f"c{new_id}"
        node["extra"]["visibility"] = _visibility(spec)
    if old_id and isinstance(node.get("element"), dict):
        node["element"]["id"] = new_id
        if isinstance(node["element"].get("extra"), dict):
            node["element"]["extra"]["nodeId"] = f"c{new_id}"
    return node


def _deep_merge(target: dict[str, Any], updates: dict[str, Any]) -> dict[str, Any]:
    for key, value in updates.items():
        if isinstance(value, dict) and isinstance(target.get(key), dict):
            _deep_merge(target[key], value)
        else:
            target[key] = copy.deepcopy(value)
    return target


def _apply_overrides(node: dict[str, Any], spec: dict[str, Any]) -> dict[str, Any]:
    """Apply advanced GHL-native controls without weakening compact defaults."""
    for group in ("class", "styles", "extra", "wrapper", "mobileStyles"):
        value = spec.get(group)
        if isinstance(value, dict):
            if not isinstance(node.get(group), dict):
                node[group] = {}
            _deep_merge(node[group], value)
    if "customCss" in spec:
        node["customCss"] = copy.deepcopy(spec["customCss"])
    return node


def _build_popup(spec: dict[str, Any]) -> list[dict[str, Any]]:
    """Build the flat modal node list used by GHL's page-level popup."""
    nodes: list[dict[str, Any]] = []
    row_ids: list[str] = []
    for rs in spec.get("rows", []):
        rid = rs.get("id") or _id("row")
        row_ids.append(rid)
        columns = rs.get("columns", [])
        col_ids: list[str] = []
        row_nodes: list[dict[str, Any]] = []
        for cs in columns:
            cid = cs.get("id") or _id("col")
            col_ids.append(cid)
            elems = [_element(es) for es in cs.get("elements", [])]
            row_nodes.append({"id": cid, "type": "col", "child": [e["id"] for e in elems],
                "class": _box_class(), "styles": {**_spacing(cs, 10),
                    "width": _v(str(cs.get("width", round(100 / max(1, len(columns))))), "%"),
                    **_border_styles()},
                "extra": {"visibility": _visibility(cs), "bgImage": _bg_image(cs),
                          "elementVersion": _v(2)}, "wrapper": {},
                "tagName": "c-column", "meta": "col", "title": "Column"})
            row_nodes.extend(elems)
        nodes.append({"id": rid, "type": "row", "child": col_ids, "class": {
            **_box_class(), "alignRow": _v("row-align-center")},
            "styles": {**_spacing(rs, 10), **_border_styles()},
            "extra": {"visibility": _visibility(rs), "rowWidth": _v(100, "%"),
                      "bgImage": _bg_image(rs)}, "wrapper": {}, "tagName": "c-row",
            "meta": "row", "title": f"{len(columns)} Column Row"})
        nodes.extend(row_nodes)
    root = {"id": "hl_main_popup", "meta": "hl_main_popup", "child": row_ids,
        "title": spec.get("title", "Modal"), "tag": "", "class": {
            "boxShadow": _v(spec.get("shadow", "none")),
            "borderRadius": _v(spec.get("radius", "radius10")),
            "borders": _v("borderFull"), "radiusEdge": _v("none")},
        "styles": {**_spacing(spec, 30), "marginTop": _v(spec.get("marginTop", 60), "px"),
            "width": _v(spec.get("width", 720), "px"),
            "backgroundColor": _v(spec.get("background", "var(--white)")),
            "borderColor": _v(spec.get("borderColor", "var(--gray)")),
            "borderWidth": _v(spec.get("borderWidth", 5), "px"), "borderStyle": _v("solid")},
        "extra": {"popupDisabled": _v(bool(spec.get("disabled", False))),
            "typography": _v("var(--contentfont)"),
            "visibility": _v({"hideMobile": False, "hideDesktop": False}),
            "left": _v(50, "%"), "minWidth": _v(spec.get("minWidth", "medium-page")),
            "bgImage": _v({"options": "bgCover", "url": spec.get("backgroundImage", "")}),
            "desktopFontSize": _v(16, "px"), "mobileFontSize": _v(16, "px"),
            "overlayColor": _v(spec.get("overlayColor", "var(--overlay)")),
            "showPopupOnMouseOut": _v(bool(spec.get("exitIntent", False)))},
        "wrapper": {}, "customCss": []}
    return [root, *nodes]


def _element(spec: dict[str, Any]) -> dict[str, Any]:
    kind = spec.get("type", "paragraph")
    aliases = {"subheading": "subHeading", "bullet-list": "bulletList",
               "custom-code": "customCode", "minute-timer": "timer",
               "fixed-countdown": "countdown",
               "logo-showcase": "logoShowcase", "one-step-order": "oneStepOrder",
               "two-step-order": "twoStepOrder", "order-confirmation": "orderConfirmation"}
    kind = aliases.get(kind, kind)
    if kind in {"heading", "subHeading", "paragraph"}:
        return _apply_overrides(_text_element(spec, kind), spec)
    if kind == "button":
        return _apply_overrides(_button_element(spec), spec)
    if kind == "native":
        return _apply_overrides(_native_element(spec), spec)
    if kind in {"form", "survey", "calendar"}:
        return _apply_overrides(_asset_element(spec, kind, f"{kind}Id"), spec)
    eid = spec.get("id") or _id(kind)
    base = {"id": eid, "type": "element", "child": [], "meta": kind,
            "tagName": f"c-{kind}", "title": spec.get("title", kind.title()), "tag": "",
            "class": {}, "styles": _spacing(spec),
            "extra": {"nodeId": f"c{eid}", "visibility": _visibility(spec),
                      "customClass": _v(spec.get("customClass", []))},
            "wrapper": {"marginTop": _v(spec.get("marginTop", 0), "px"),
                        "marginBottom": _v(_default_margin_bottom(spec, kind), "px")},
            "customCss": [], "mobileStyles": None}
    if kind == "image":
        base["class"] = {"imageRadius": _v("img-none"), "imageBorder": _v("img-border-none"),
                         "imageShadow": _v("img-shadow-none"), "imageEffects": _v("img-effects-none")}
        base["styles"].update({"backgroundColor": _v("var(--transparent)"),
                               "opacity": _v("1"), "textAlign": _v(spec.get("align", "center"))})
        base["extra"].update({"imageActions": _v("none"),
                              "visitWebsite": _v({"url": spec.get("link", ""), "newTab": bool(spec.get("newTab"))}),
                              "imageProperties": _v({"width": str(spec.get("width", "100%")), "height": "",
                                  "url": spec.get("url", ""), "altText": spec.get("alt", ""),
                                  "compression": True, "placeholderBase64": "", "servingUrl": "", "imageMeta": ""}),
                              "theme": _v("none")})
        base["wrapper"]["textAlign"] = _v(spec.get("align", "center"))
    elif kind == "divider":
        base["extra"]["dividerProperties"] = _v({"width": str(spec.get("width", "60%")),
            "height": str(spec.get("height", "2px")), "borderStyle": "solid",
            "align": spec.get("align", "center"), "color": spec.get("color", "var(--gray)")})
    elif kind == "bulletList":
        items = spec.get("items", [])
        raw = spec.get("html") or "<ul>" + "".join(
            f"<li><p>{html.escape(str(item))}</p></li>" for item in items) + "</ul>"
        base.update({"meta": "bulletList", "tagName": "c-bullet-list", "title": "Bullet List", "tag": "ul"})
        base["class"] = _box_class()
        base["styles"].update({"backgroundColor": _v(spec.get("background", "var(--transparent)")),
                               "color": _v(spec.get("color", "var(--text-color)")),
                               "iconColor": _v(spec.get("iconColor", "var(--primary)")),
                               "boldTextColor": _v(spec.get("color", "var(--text-color)")),
                               "italicTextColor": _v("var(--text-color)"),
                               "underlineTextColor": _v("var(--text-color)"),
                               "linkTextColor": _v("var(--link-color)"),
                               "fontFamily": _v(spec.get("fontFamily", "var(--contentfont)")),
                               "fontWeight": _v(spec.get("weight", "")), "opacity": _v("1"),
                               "textShadow": _v("0px 0px 0px rgba(0,0,0,0)"), **_border_styles(),
                               "lineHeight": _v(spec.get("lineHeight", 1.4), "em"),
                               "textTransform": _v("none"), "letterSpacing": _v(0, "px"),
                               "textAlign": _v(spec.get("align", "left"))})
        base["extra"].update({"text": _v(raw), "mobileFontSize": _v(spec.get("mobileFontSize", 18), "px"),
                              "desktopFontSize": _v(spec.get("fontSize", 20), "px"),
                              "typography": _v("var(--contentfont)"),
                              "icon": _v(spec.get("icon", {"name": "check-square", "unicode": "f14a",
                                                             "fontFamily": "Font Awesome 5 Free",
                                                             "color": spec.get("iconColor", "var(--primary)")}))})
    elif kind == "video":
        url = spec.get("url", "")
        video_type = spec.get("videoType") or ("youtube" if "youtu" in url else "vimeo" if "vimeo" in url else "custom")
        base.update({"tagName": "c-video", "title": "Video"})
        base["class"] = {"borders": _v("noBorder"), "borderRadius": _v("radius0"), "radiusEdge": _v("none")}
        base["styles"].update({"boxShadow": _v("none"), "backgroundColor": _v("var(--transparent)"),
                               **_border_styles()})
        base["extra"].update({"videoProperties": _v({"url": url, "type": video_type,
                              "autoplay": int(bool(spec.get("autoplay", False))),
                              "controls": int(bool(spec.get("controls", True))),
                              "thumbnailURL": spec.get("thumbnail", ""), "embedURL": "",
                              "width": spec.get("width", 100),
                              "selfHostedVideo": {"id": "", "name": "", "thumbnail": "", "thumbnailName": ""},
                              "domain": spec.get("domain", "")}),
                              "playBackControls": {"autoplay": bool(spec.get("autoplay", False)),
                              "allowPlayPause": True, "playBackSpeed": True, "showPendingTime": True,
                              "showProgressBar": True, "showFullScreenToggle": True},
                              "leadVideoOptions": {"isLeadGenVideo": False, "isVideoPlayAllowed": False,
                                                   "timeStamp": 0, "formElement": None},
                              "checkStep": {"checkStep": False, "step": {}}})
    elif kind == "customCode":
        base.update({"meta": "custom-code", "tagName": "c-custom-code", "title": "Custom JS / HTML"})
        base["class"] = {"borderRadius": _v("radius0"), "borders": _v("noBorder")}
        base["styles"] = {"italicTextColor": _v("var(--black)"), "underlineTextColor": _v("var(--black)"),
                          "color": _v(spec.get("color", "var(--black)")), "textAlign": _v(spec.get("align", "left")),
                          "iconColor": _v("var(--black)"), "boldTextColor": _v("var(--black)"),
                          "lineHeight": _v(""), "linkTextColor": _v("var(--link-color)"),
                          "marginTop": _v(spec.get("marginTop", 0), "px")}
        base["extra"].update({"typography": _v("var(--contentfont)"),
                              "desktopFontSize": _v(spec.get("fontSize", 16), "px"),
                              "mobileFontSize": _v(spec.get("mobileFontSize", 16), "px"),
                              "customCode": _v({"html": spec.get("html", ""), "script": spec.get("script", "")})})
    elif kind == "countdown":
        end_date = spec.get("endDate")
        if not end_date:
            raise ValueError("countdown element requires 'endDate'")
        base.update({"meta": "countdown", "tagName": "c-countdown", "title": "Countdown"})
        base["styles"] = {"color": _v(spec.get("color", "var(--text-color)")),
                          "justifyContent": _v(spec.get("align", "center")),
                          "secondaryColor": _v(spec.get("labelColor", "var(--black)")),
                          "fontWeight": {"value": spec.get("weight", ""),
                                         "desktop": str(spec.get("fontWeight", 700))}}
        base["extra"].update({
            "typography": _v("var(--contentfont)"),
            "useWebinarSettings": _v(False),
            "timerType": {"value": spec.get("timerType", "countdown"), "disabled": True},
            "countdownTimerId": _v(spec.get("countdownTimerId", "")),
            "startDate": _v(spec.get("startDate", end_date)),
            "startTime": _v(spec.get("startTime", "00:00")),
            "timerLoop": _v(spec.get("timerLoop", 0)),
            "timerDuration": _v(spec.get("timerDuration", {
                "days": 0, "hours": 0, "minutes": 0, "seconds": 0,
            })),
            "timerTrigger": {"value": spec.get("timerTrigger", ""), "disabled": True},
            "endDate": _v(end_date),
            "endTime": _v(spec.get("endTime", "23:59")),
            "translate": _v(spec.get("language", "English")),
            "expireAction": _v(spec.get("expireAction", "url")),
            "redirectUrl": _v(spec.get("redirectUrl", "#")),
            "hideElements": _v(spec.get("hideElements", [])),
            "showElements": _v(spec.get("showElements", [])),
            "timezone": _v(spec.get("timezone", "America/New_York")),
            "mobileFontSize": _v(spec.get("mobileFontSize", 48), "px"),
            "desktopFontSize": _v(spec.get("fontSize", 48), "px"),
            "subTextDesktopFontSize": _v(spec.get("labelFontSize", 16), "px"),
            "subTextMobileFontSize": _v(spec.get("mobileLabelFontSize", 16), "px"),
        })
    elif kind == "timer":
        base.update({"meta": "minute-timer", "tagName": "c-countdown", "title": "Minute Timer"})
        base["styles"] = {"color": _v(spec.get("color", "var(--text-color)")),
                          "justifyContent": _v(spec.get("align", "center")),
                          "secondaryColor": _v(spec.get("labelColor", "var(--text-color)"))}
        base["extra"].update({"typography": _v("var(--headlinefont)"), "hours": _v(spec.get("hours", 0)),
                              "minutes": _v(str(spec.get("minutes", 5))), "seconds": _v(spec.get("seconds", 0)),
                              "translate": _v(spec.get("language", "English")),
                              "expireAction": _v(spec.get("expireAction", "url")),
                              "redirectUrl": _v(spec.get("redirectUrl", "#")),
                              "hideElements": _v(spec.get("hideElements", [])),
                              "showElements": _v(spec.get("showElements", [])),
                              "timezone": _v(spec.get("timezone", "America/New_York")),
                              "revisitAction": _v(spec.get("revisitAction", "auto-reset")),
                              "showElementsOnRevisit": _v([]), "cookieDate": _v(""),
                              "mobileFontSize": _v(spec.get("mobileFontSize", 22), "px"),
                              "desktopFontSize": _v(spec.get("fontSize", 22), "px"),
                              "subTextDesktopFontSize": _v(15, "px"), "subTextMobileFontSize": _v(15, "px")})
    elif kind == "faq":
        items = [{"id": i + 1, "heading": q.get("heading", q.get("question", "Question")),
                  "text": q.get("text", q.get("answer", "Answer")), "showImage": bool(q.get("image")),
                  "image": q.get("image", ""), "active": i == 0 and bool(spec.get("firstOpen", True)),
                  "compression": True} for i, q in enumerate(spec.get("items", []))]
        base.update({"tagName": "c-faq", "title": "FAQ"})
        base["class"] = _box_class()
        base["styles"] = {"faqOpenTitleTextColor": _v(spec.get("primaryColor", "var(--primary)")),
            "faqOpenTitleBackgroundColor": _v("var(--white)"), "faqDividerColor": _v("var(--gray)"),
            "faqContentTextColor": _v("var(--black)"), "faqOpenBackgroundColor": _v("var(--white)"),
            "faqClosedTitleTextColor": _v("var(--black)"), "faqClosedTitleBackgroundColor": _v("var(--white)"),
            "faqExpandAllButtonTextColor": _v("var(--primary)"), "faqExpandAllButtonBorderColor": _v("var(--gray)"),
            ("faqExpandAllButton" + "BackgroundColor"): _v("var(--transparent)"), "linkTextColor": _v("var(--primary)"),
            "faqHeadingFontFamily": _v("var(--headlinefont)"), "faqContentFontFamily": _v("var(--contentfont)"),
            **_spacing(spec, 10), **_border_styles()}
        base["extra"].update({"faqType": _v(spec.get("layout", "separated")), "faqList": _v(items),
            "typography": _v("var(--contentfont)"), "faqCustomOptions": _v({
                "openIcon": {"color": "var(--black)", "fontFamily": "Font Awesome 5 Free", "name": "chevron-down", "unicode": "f078"},
                "closeIcon": {"color": "var(--black)", "fontFamily": "Font Awesome 5 Free", "name": "chevron-up", "unicode": "f077"},
                "iconPosition": "right", "lineHeight": "1.5", "showImagePopup": True,
                "expandAllToggle": bool(spec.get("expandAllToggle", False)), "expandAll": True,
                "firstItemOpen": bool(spec.get("firstOpen", True))}),
            "featureHeadlineDesktopFontSize": _v(spec.get("headingFontSize", 20), "px"),
            "featureHeadlineMobileFontSize": _v(spec.get("headingMobileFontSize", 16), "px"),
            "desktopFontSize": _v(spec.get("fontSize", 16), "px"),
            "mobileFontSize": _v(spec.get("mobileFontSize", 14), "px")})
    elif kind == "logoShowcase":
        logos = [{"id": i + 1, "ctaTarget": "_blank" if x.get("newTab", True) else "_self",
                  "cta": x.get("url", ""), "backgroundImage": x.get("image", ""), "active": False,
                  "compression": True, "imageTitle": x.get("title", ""),
                  "imageDescription": x.get("description", ""), "imageAltText": x.get("alt", "")}
                 for i, x in enumerate(spec.get("logos", []))]
        base.update({"meta": "logo-showcase", "tagName": "c-logo-showcase", "title": "Logo Showcase", "version": 2})
        base["styles"] = {"width": _v(100, "%"), "logoWidth": _v(spec.get("logoWidth", 140), "px"),
            **_spacing(spec, 20), "backgroundColor": _v(spec.get("background", "var(--transparent)")),
            "boxShadow": _v("none"), "borderWidth": _v(0, "px"), "borderStyle": _v("solid"),
            "borderRadius": _v(spec.get("borderRadius", 8), "px"), "borderColor": _v("#000000")}
        base["extra"].update({"logoShowcaseMode": _v(spec.get("mode", "ticker")),
            "imagesPerSlide": _v(spec.get("imagesPerSlide", 4)), "sliderList": _v(logos),
            "sliderPagination": _v({"enable": True, "style": "circle", "activeColor": "#9CA3AF", "inActiveColor": "#E5E7EB", "size": 10}),
            "sliderArrow": _v({"enable": True, "color": "#000000", "animationEffect": "none"}),
            "sliderAnimation": _v({"animationEffect": "slide", "autoAnimationEnable": True,
                                    "interval": spec.get("interval", 5), "infiniteLoop": True, "pauseOnHover": True}),
            "tickerSpeed": _v(spec.get("speed", 1)), "pauseOnHover": _v(bool(spec.get("pauseOnHover", True))),
            "logoSpacing": _v(spec.get("spacing", 32), "px"), "elementVersion": _v(2)})
        base["mobileStyles"] = {"width": _v(100, "%")}
    elif kind in {"oneStepOrder", "twoStepOrder", "orderConfirmation"}:
        meta = {"oneStepOrder": "one-step-order", "twoStepOrder": "two-setp-order",
                "orderConfirmation": "order-confirmation"}[kind]
        base.update({"meta": meta, "tagName": "c-order", "title": {
            "oneStepOrder": "One Step Order", "twoStepOrder": "Two Step Order",
            "orderConfirmation": "Order Confirmation"}[kind]})
        if kind == "orderConfirmation":
            base["styles"] = {"backgroundColor": _v("var(--white)"), "featureHeadlineColor": _v("var(--black)"),
                "color": _v("var(--black)"), "secondaryColor": _v("var(--black)"),
                "boldTextColor": _v("var(--black)"), "featureTextColor": _v("var(--black)"),
                "fontFamily": _v(""), "fontWeight": _v("normal"), **_spacing(spec)}
            base["extra"].update({"typography": _v("var(--contentfont)"),
                "desktopFontSize": _v(spec.get("fontSize", 20), "px"),
                "mobileFontSize": _v(spec.get("mobileFontSize", 20), "px"),
                "subTextDesktopFontSize": _v(15, "px"), "subTextMobileFontSize": _v(15, "px"),
                "orderConfirmation": _v({"itemText": spec.get("itemText", "Product"),
                    "priceText": spec.get("priceText", "Price"), "totalText": spec.get("totalText", "Total"),
                    "showTotal": True, "orderTitle": spec.get("orderTitle", "Order Confirmation"),
                    "shippingDetailsTitle": spec.get("shippingTitle", "Shipping Details"),
                    "showorderTitle": True, "showShippingDetails": bool(spec.get("showShipping", True))})})
        else:
            base["styles"] = {"textAlign": _v("left"), "buttonColor": _v(spec.get("buttonColor", "var(--primary)")),
                "buttonTextColor": _v(spec.get("buttonTextColor", "var(--white)")),
                "buttonSize": _v(spec.get("buttonSize", "1.2rem")), "buttonStyle": _v("none"),
                "formBgColor": _v("var(--white)"), "formRadius": _v(spec.get("radius", 5), "px")}
            contact = {"shippingHeadline": "Shipping", "headline": spec.get("headline", "Your Information"),
                "subHeadline": spec.get("subHeadline", "Contact Information"), "fullName": "Full Name...",
                "companyName": "Company Name...", "email": "Email Address...", "phone": "Phone Number...",
                "address": "Full Address...", "city": "City...", "state": "State / Province...", "zipCode": "Zip Code...",
                "showPhone": bool(spec.get("showPhone", True)), "showShipping": bool(spec.get("showShipping", False)),
                "showCompanyName": bool(spec.get("showCompanyName", False)), "enableCountryPicker": False,
                "fullNameValidation": True, "btnText": spec.get("nextText", "Continue"), "btnSubText": "",
                "footerText": spec.get("footerText", "Secure checkout")}
            payment = {"headline": spec.get("paymentHeadline", "Order Information"), "subHeadline": "Payment",
                "itemText": "Item", "priceText": "Price", "summaryItemText": "item", "summaryPriceText": "amount",
                "btnText": spec.get("buttonText", "Complete Order"), "btnSubText": "", "footerText": "Secure payment",
                "linkText": "Edit Details", "enableMultiProductSelect": bool(spec.get("multiProduct", False)),
                "enableMainProductDescription": True, "enableProductDescription": True,
                "showOrderBump": bool(spec.get("showOrderBump", False)),
                "enableCouponCodes": bool(spec.get("couponCodes", True)), "btnIcon": "fas fa-shopping-cart",
                "stripeLayout": "classic", "enablePostalCode": True}
            step1_value = {**contact, **payment} if kind == "oneStepOrder" else contact
            base["extra"].update({"typography": _v("var(--headlinefont)"), "step1": _v(step1_value),
                **({"step2": _v(payment), "activeMode": _v("step1")} if kind == "twoStepOrder" else {}),
                "enableMultiProductSelect": _v(bool(spec.get("multiProduct", False))),
                "enableMainProductDescription": _v(True), "enableProductDescription": _v(True),
                "showOrderBump": _v(bool(spec.get("showOrderBump", False))),
                "enableCouponCodes": _v(bool(spec.get("couponCodes", True))),
                "termsAndConditions": _v({"isEnabledForStep1": False, "isEnabledForStep2": False,
                                           "step1": "", "step2": ""}), "bumpProduct": _v([]),
                "stickyContact": _v(True), "forceContactCreate": _v(False),
                "saleAction": _v(spec.get("saleAction", "go-to-next-funnel-step")),
                "stepPath": _v(spec.get("stepPath", "")),
                "visitWebsite": _v({"url": spec.get("url", ""), "newTab": False}),
                "validateEmail": _v(True)})
    else:
        raise ValueError(f"unsupported page element type: {kind!r}")
    return _apply_overrides(base, spec)


def build_page_data(spec: dict[str, Any], *, page_id: str, funnel_id: str,
                    location_id: str) -> dict[str, Any]:
    """Expand a compact page spec into the pageData accepted by autosave."""
    if spec.get("designSystem") is not None:
        from cli_anything.gohighlevel.utils.landing_page_design import apply_design_system
        spec = apply_design_system(spec)
    sections = []
    for si, ss in enumerate(spec.get("sections", [])):
        sid = ss.get("id") or _id("section")
        flat: list[dict[str, Any]] = []
        row_ids = []
        for rs in ss.get("rows", []):
            rid = rs.get("id") or _id("row")
            row_ids.append(rid)
            col_ids = []
            columns = rs.get("columns", [])
            for cs in columns:
                cid = cs.get("id") or _id("col")
                col_ids.append(cid)
                elems = [_element(es) for es in cs.get("elements", [])]
                flat.append({"id": cid, "type": "col", "child": [e["id"] for e in elems],
                    "class": _box_class(), "styles": {**_spacing(cs, 10),
                        "backgroundColor": _v(cs.get("background", "var(--transparent)")),
                        "width": _v(str(cs.get("width", round(100 / max(1, len(columns))))), "%"),
                        **_border_styles()},
                    "extra": {"visibility": _visibility(cs), "bgImage": _bg_image(cs),
                        "columnLayout": _v(cs.get("layout", "column")),
                        "justifyContentColumnLayout": _v(cs.get("justify", "flex-start")),
                        "alignContentColumnLayout": _v(cs.get("alignItems", "inherit")),
                        "forceColumnLayoutForMobile": _v(bool(cs.get("stackOnMobile", True))),
                        "customClass": _v(cs.get("customClass", [])), "elementVersion": _v(2)},
                    "wrapper": {"marginLeft": _v(0, "px"), "marginRight": _v(0, "px"),
                                "marginTop": _v(0, "px"), "marginBottom": _v(0, "px")},
                    "tagName": "c-column", "meta": "col", "title": "Column"})
                flat.extend(elems)
            flat.insert(len(flat) - sum(len(c.get("elements", [])) + 1 for c in columns), {
                "id": rid, "type": "row", "child": col_ids, "class": {**_box_class(), "alignRow": _v("row-align-center")},
                "styles": {**_spacing(rs), "backgroundColor": _v(rs.get("background", "var(--transparent)")),
                           **_border_styles()},
                "extra": {"visibility": _visibility(rs), "bgImage": _bg_image(rs),
                          "rowWidth": _v(rs.get("width", 100), "%"),
                          "customClass": _v(rs.get("customClass", []))},
                "wrapper": {"marginTop": _v(0, "px"), "marginBottom": _v(0, "px")},
                "tagName": "c-row", "meta": "row", "title": f"{len(columns)} Column Row"})
        meta = {"id": sid, "type": "section", "child": row_ids, "class": {**_box_class(), "width": _v("fullSection")},
                "styles": {**_spacing(ss, 20), "marginTop": _v(0, "px"), "marginBottom": _v(0, "px"),
                           "backgroundColor": _v(ss.get("background", "var(--white)")), **_border_styles()},
                "extra": {"sticky": _v(ss.get("sticky", "noneSticky")), "visibility": _visibility(ss),
                          "bgImage": _bg_image(ss), "allowRowMaxWidth": _v(bool(ss.get("allowRowMaxWidth", False))),
                          "customClass": _v(ss.get("customClass", []))},
                "wrapper": {}, "meta": "section", "tagName": "c-section", "title": ss.get("name", "Section"), "_id": sid}
        section_colors = [{"label": "Primary", "value": spec.get("primaryColor", "#188bf6")},
                          {"label": "White", "value": "#ffffff"},
                          {"label": "Black", "value": "#000000"},
                          {"label": "Transparent", "value": "transparent"}]
        sections.append({"id": sid, "metaData": meta, "elements": flat, "sequence": si,
                         "pageId": page_id, "funnelId": funnel_id, "locationId": location_id,
                         "general": {"colors": section_colors, "fontsForPreview": [f"'{spec.get('headlineFont', 'Inter')}'", f"'{spec.get('contentFont', 'Roboto')}'"],
                                     "rootVars": {"--primary": spec.get("primaryColor", "#188bf6"),
                                                  "--white": "#ffffff", "--black": "#000000",
                                                  "--transparent": "transparent", "--inter": "'Inter'"},
                                     "sectionStyles": _section_css(sid, ss, flat)}})
    colors = [{"label": "Primary", "value": spec.get("primaryColor", "#188bf6")},
              {"label": "White", "value": "#ffffff"}, {"label": "Black", "value": "#000000"},
              {"label": "Gray", "value": "#cbd5e0"}, {"label": "Transparent", "value": "transparent"},
              {"label": "Overlay", "value": "rgba(0,0,0,.5)"}]
    headline_font = spec.get("headlineFont", "Inter")
    content_font = spec.get("contentFont", "Roboto")
    page_css = (f":root{{--primary:{spec.get('primaryColor', '#188bf6')};--white:#ffffff;"
                "--black:#000000;--gray:#cbd5e0;--transparent:transparent;--overlay:rgba(0,0,0,.5);"
                f"--headlinefont:'{headline_font}';--contentfont:'{content_font}';--text-color:{spec.get('textColor', '#000000')};"
                f"--link-color:{spec.get('primaryColor', '#188bf6')}}}"
                ".bg-fixed{inset:0;position:fixed;overflow:auto;background-color:var(--white)}"
                + spec.get("customCss", ""))
    popups = (_build_popup(spec["popup"]) if isinstance(spec.get("popup"), dict)
              else copy.deepcopy(spec.get("popups", [])))
    return {"sections": sections, "popups": popups,
            "settings": {"settings": {"typography": {"fonts": {
                "headlineFont": {"id": "headlinefont", "text": "Headline Font", "value": {"text": headline_font, "value": f"'{headline_font}'"}},
                "contentFont": {"id": "contentfont", "text": "Content Font", "value": {"text": content_font, "value": f"'{content_font}'"}}},
                "colors": {"textColor": {"value": {"label": "var(--black)", "value": "#000000"}},
                           "linkColor": {"value": {"label": "var(--primary)", "value": spec.get("primaryColor", "#188bf6")}}}},
                "background": {"backgroundColor": _v("var(--white)"), "bgImage": _v({"url": "", "options": "bgCover"})}}},
            "general": {"general": {"colors": colors, "fontsToLoad": [headline_font, content_font],
                                      "fontsToLoadForPreview": [f"'{headline_font}'", f"'{content_font}'"], "pageStyles": ""}},
            "pageStyles": page_css, "trackingCode": copy.deepcopy(spec.get("trackingCode", {})),
            "fontsForPreview": [f"'{headline_font}'", f"'{content_font}'"]}


def count_summary(page_data: dict[str, Any]) -> str:
    sections = page_data.get("sections", [])
    nodes = [n for s in sections for n in s.get("elements", [])]
    return f"{len(sections)} section(s), {sum(n.get('meta') == 'row' for n in nodes)} row(s), {sum(n.get('type') == 'element' for n in nodes)} element(s)"
