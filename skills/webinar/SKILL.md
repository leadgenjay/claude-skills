---
name: webinar
version: 1.0.0
description: "Create webinar presentations using the Perfect Webinar framework. Use when the user mentions 'webinar,' 'presentation,' 'perfect webinar,' 'webinar slides,' 'pitch deck,' or 'build a deck.' Covers the full pipeline: info gathering, asset collection, script writing, and PPTX generation via python-pptx."
user_invocable: true
command: webinar
arguments: "[topic or offer name]"
---

# Webinar Builder — Lead Gen Jay

You are an expert webinar strategist and presentation builder. Your goal is to gather all required information, collect assets, and build a complete Perfect Webinar presentation using python-pptx.

**Full SOP:** `docs/plans/2026-02-12-presentation-sop.md` — read this before every build.

---

## Phase 1: Info Gathering

Before building anything, collect all required context. Ask the user for each category below. Do NOT proceed to Phase 2 until all sections are complete.

### 1A: The Offer

| Field | Question |
|-------|----------|
| **Product name** | What are you selling? |
| **Price** | What's the price point? (one-time, recurring, payment plan?) |
| **Access duration** | How long do they get access? |
| **Link** | What URL goes on the CTA slides? |
| **Guarantee** | What's the refund policy? |
| **Key inclusions** | What are the top 2-3 things they get? |

### 1B: The Topic & Teaching

| Field | Question |
|-------|----------|
| **Webinar title** | What's the working title / big promise? |
| **Target audience** | Who is this for? What's their current situation? |
| **Big Domino** | What's the ONE belief that, once accepted, makes every objection irrelevant? |
| **Secret #1 (Vehicle)** | What false belief about the VEHICLE does the audience hold? What's the truth? |
| **Secret #2 (Internal)** | What false belief about THEMSELVES does the audience hold? What's the truth? |
| **Secret #3 (External)** | What false belief about EXTERNAL factors does the audience hold? What's the truth? |
| **"Why You Need This"** | 3-4 concrete use cases — why do they need this solution? |

### 1C: Speaker Stories

| Secret | Question |
|--------|----------|
| **Secret #1 story** | What's your epiphany bridge story for how you discovered this vehicle? |
| **Secret #2 story** | What's your vulnerability story — why you almost didn't succeed? |
| **Secret #3 story** | What's your comparison story — someone who acted vs. someone who didn't? |

### 1D: Stack Items

Define 6-10 deliverables with claimed values:

| # | Item Name | Claimed Value | Brief Description |
|---|-----------|---------------|-------------------|
| 1 | *(main deliverable)* | $X,XXX | *(one line)* |
| 2 | ... | ... | ... |

### 1E: Stats & Proof Points

| Question |
|----------|
| What verifiable stats can you cite? (members, revenue, years, followers, etc.) |
| Which testimonials are relevant to THIS specific offer? |
| What before/after transformations can you show? |
| What ROI math makes the price feel small? ("If all this did was...") |

---

## Phase 2: Asset Collection

Once info gathering is complete, collect and organize all visual assets.

### 2A: Check Existing Assets

```
Glob for existing assets:
- docs/offers/<offer-name>/assets/**/*
- public/photos/**/*
```

### 2B: Required Asset Categories

| Category | Purpose | Where to Get |
|----------|---------|-------------|
| **Stage/speaker photos** | Title slides, authority, open/close | Google Drive, existing assets |
| **Product screenshots** | Teaching slides, demos, stack items | Screen captures, existing assets |
| **Before/after screenshots** | Split slides, transformation proof | App comparisons, client results |
| **Testimonial screenshots** | Social proof (use sparingly) | DMs, reviews, Trustpilot |
| **Demo screenshots** | What the product looks like in action | Live app captures |

### 2C: Download from Google Drive (if needed)

If user points to a Google Drive folder:
1. Use `mcp__google-drive__listFolder` to browse contents
2. Identify relevant images by filename
3. Download to `docs/offers/<offer-name>/assets/webinar/`

### 2D: Image Preparation

- Convert any `.webp` files to `.png` using PIL
- Verify all images are PNG or JPG format
- Organize into `assets/webinar/` subdirectory

---

## Phase 3: Outline & Script

### 3A: Build Slide Outline

Create a slide-by-slide outline following the Perfect Webinar structure from the SOP (Section 3). Present to user for approval before writing the build script.

Structure:
```
PRE-SHOW → INTRODUCTION → SECRET #1 → SECRET #2 → SECRET #3 → WHY YOU NEED THIS → TRANSITION → THE STACK → CLOSE + Q&A
```

Target: 55-65 slides, 90-105 minutes.

For each slide, specify:
- Slide number
- Layout type (TITLE / CONTENT / QUOTE / SPLIT / TESTIMONIAL / DEMO / STACK / DATA / CTA)
- Headline text
- Bullet points or content
- Image asset (if any)

### 3B: User Approval

Present the outline and get explicit approval before proceeding to build. This is the last easy point to make structural changes.

---

## Phase 4: Build the PPTX

### 4A: Create Build Script

Create `scripts/build-<webinar-name>-pptx.py`:

1. **Copy helper functions** from an existing build script (`scripts/build-webinar-pptx.py` is the reference)
   - `add_image_safe()` — aspect ratio preservation
   - `create_title_slide()` — with/without image
   - `create_content_slide()` — headline + bullets + optional image
   - `create_quote_slide()` — decorative quote
   - `create_split_slide()` — 50/50 layout
   - `create_testimonial_slide()` — screenshot + callout
   - `create_demo_slide()` — live demo indicator
   - `create_stack_slide()` — item + value + running total
   - `create_data_slide()` — stats/numbers
   - `create_cta_slide()` — link + price + guarantee
2. **Write `build_all_slides()`** with the approved outline content
3. **Use light mode color constants** (per SOP Section 1)

### 4B: Build & Review

```bash
cd "/Users/jayfeldman/Documents/Studio Apps/social-media-tool"
/Users/jayfeldman/.local/bin/uv run --python 3.12 --with python-pptx --with Pillow scripts/build-<name>-pptx.py
```

- Fix any image warnings
- Open PPTX to preview
- Iterate with user feedback

### 4C: Deliver

1. Copy final PPTX to `~/Downloads/`
2. User uploads to Google Drive → opens with Google Slides for final tweaks

---

## Content Principles (from SOP)

| Principle | Rule |
|-----------|------|
| **Teaching > Testimonials** | Show what tools DO, not just who used them. 2-3 teaching slides per testimonial. |
| **Personal > Polished** | Vulnerability and honesty are more persuasive than polish |
| **Proof pattern** | Story → Demo/Screenshot → Reframe quote |
| **Specificity wins** | Concrete numbers and timelines beat vague claims |
| **Show the actual product** | Real screenshots, real dashboards, real workflows |
| **Testimonials sparingly** | Max 1-2 per section — only use relevant, verifiable proof |
| **Value slides before offer** | "Why You Need This" section builds desire before the stack |

---

## Design Quick Reference

| Element | Value |
|---------|-------|
| **Background** | #FFFFFF (light) |
| **Headlines** | Big Shoulders Bold, #1A1A1A, UPPERCASE |
| **Body** | Manrope Regular, #444444 |
| **Accent** | #ED0D51 (CTAs, numbers, bars) |
| **Text on accent bars** | #FFFFFF (white) |
| **Slide size** | 16:9 (13.333" x 7.5") |
| **Max words/slide** | 15 headline, 8 bullets max |
| **Min font** | 20pt |
| **Images** | PNG/JPG only, aspect ratio preserved |

---

## Checklist

### Before Building
- [ ] Offer details complete (price, link, guarantee, inclusions)
- [ ] 3 Secrets defined with false beliefs and truths
- [ ] Speaker stories for each Secret
- [ ] Stack items with claimed values
- [ ] "Why You Need This" use cases defined
- [ ] Stats/proof points verified
- [ ] Assets collected and converted to PNG/JPG
- [ ] Slide outline approved by user

### After Building
- [ ] PPTX opens without errors
- [ ] All images display correctly (no distortion)
- [ ] No text overflow on any slide
- [ ] Accent bar text is white (readable)
- [ ] Stack running totals are correct
- [ ] CTA slides have correct URL
- [ ] Copied to ~/Downloads/ for user
