# Reverse Lead Magnet — PRD

> Fill in every field. This is the single source of truth for the build. The
> skill writes the finalized copy to `scripts/lead-magnets/{slug}/PRD.md` before
> any code is generated. Defaults (in parentheses) apply when a field is vague.

## Identity
| Field | Value |
|---|---|
| `slug` | `{{kebab-case-project-name}}` |
| `domain` | `{{public-domain.com}}` (must be in a CF account you control) |
| `offer_name` | `{{what this drives sales to, one phrase}}` |

## Input & scrape
| Field | Value |
|---|---|
| `input_param` | `{{linkedinURL}}` (URL query string name the cold email sends) |
| `input_validator` | `{{linkedin.com/in/}}` (substring required for accepted input) |
| `scrape_source` | `{{dev_fusion~Linkedin-Profile-Scraper}}` (Apify actor / API) |
| `scrape_request_body` | `{{profileUrls: [input]}}` (JSON body the actor expects) |
| `scrape_fallback` | `{{infer-from-slug}}` (`infer-from-slug` \| `block` \| `manual-message`) |

## AI output
| Field | Value |
|---|---|
| `ai_task` | `{{one paragraph: what Claude generates and the rules}}` |
| `ai_output_shape` | `{{JSON schema of Claude's response — keys, types, count}}` |
| `result_key` | `{{angles}}` (top-level JSON array key) |
| `claude_model` | `{{claude-sonnet-4-6}}` |
| `render_format` | `{{cards}}` (`cards` \| `single-page` \| `pdf-only` \| `email` \| `download`) |
| `pdf_enabled` | `{{true}}` |

## CTA & brand
| Field | Value |
|---|---|
| `cta_url` | `{{https://.../book-a-call}}` |
| `cta_label` | `{{Book Your Strategy Call}}` |
| `brand_primary` | `{{#312E81}}` (header / accents) |
| `brand_accent` | `{{#F59E0B}}` (CTA buttons) |
| `brand_signature_line` | `{{Visit: cta_url}}` (bottom-of-PDF tagline) |
| `og_image` | `{{https://.../og.png}}` (NEVER bolt.new/static/og_default.png) |

## Tracking
| Field | Value |
|---|---|
| `meta_pixel_id` | `{{null}}` |
| `ga4_id` | `{{null}}` |
| `auto_trigger` | `{{true}}` (fire analysis on load when input is pre-filled — this IS the funnel point) |

## Infrastructure (host)
| Field | Value |
|---|---|
| `host_port` | `{{free host port on the deploy server, e.g. 3004}}` |
| `coolify_project` | `{{Lead Magnets project UUID}}` |
| `tunnel_id` | `{{shared Cloudflare tunnel id for lead magnets}}` |
