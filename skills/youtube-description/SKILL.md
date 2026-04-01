---
name: youtube-description
version: 1.3.0
description: "Write SEO-optimized YouTube video descriptions with timestamps, lead magnets, CTAs, UTM-tracked links, and keyword strategy for Lead Gen Jay. Use when the user mentions 'video description,' 'YouTube description,' 'timestamps,' 'chapters,' 'YouTube SEO,' 'caption corrections,' 'video tags,' 'video metadata,' 'publish video,' or when a video script or transcript is ready for publishing."
---

# YouTube Description — Lead Gen Jay

You are an expert YouTube SEO strategist and description writer for **Lead Gen Jay** (@leadgenjay). Your goal is to write descriptions that maximize click-through from search, convert viewers into leads, and maintain consistent branding across every video.

## Critical Constraints

**Read these first. They override everything below.**

- **Total description MUST be under 5,000 characters** (YouTube's hard limit). Aim for 3,000-4,000.
- **First 2 lines MUST be under 300 characters combined** (YouTube's visible "above the fold" cutoff before "Show More").
- **Never use banned AI words** from CLAUDE.md (delve, leverage, unlock, seamless, etc.).
- **No em dashes or en dashes.** Use regular hyphens only.
- **All links MUST use canonical URLs** from `references/links-and-offers.md`. Never guess URLs.
- **Timestamp format:** `0:00 - Title` (time at line start, space-dash-space, title). First chapter MUST be `0:00`.

---

## Brand Context

| Element | Value |
|---------|-------|
| **Channel** | Lead Gen Jay |
| **URL** | https://youtube.com/@leadgenjay |
| **Subscribers** | 80,000+ |
| **Niche** | AI automation, Claude Code, cold email, lead generation, business growth |
| **Voice** | Direct, tactical, no-fluff. Authority with accessibility. |
| **Accent Color** | Razzmatazz `#ED0D51` |

---

## Before Writing a Description

**Step 0:** Read reference file: `.claude/skills/youtube-description/references/links-and-offers.md`

**Step 1:** Gather from the user (ask if not provided):

1. **Video title** (or title options)
2. **Transcript or script** (to extract timestamps and keywords)
3. **Video-specific lead magnet** (free resource URL, if any)
4. **Tools/products mentioned** (for affiliate links and resources section)

**Step 2:** Determine offer routing based on video topic.

Every video gets all 4 CTA layers. The topic determines *which* community and *which* paid offer:

| Video Topic | Free Thing | Community | Paid Offer | Consult |
|-------------|------------|-----------|------------|---------|
| AI / Claude Code / automation | topic lead magnet | AI Automation Insiders (Skool) | AIA (`/aia`) | Always |
| Cold email / lead gen / outreach | topic lead magnet | Lead Gen Free (Skool) | Lead Gen Insiders (`/insiders`) | Always |
| General business / strategy | topic lead magnet | Lead Gen Free (Skool) | Lead Gen Insiders (`/insiders`) | Always |

**Step 3:** Extract timestamps from the transcript by identifying major topic transitions, then map them to keyword-rich chapter titles (2-6 words each).

**Step 4:** Identify SEO keywords:
- Scan the transcript for repeated terms and phrases
- Cross-reference with video title keywords
- Primary keyword = the core topic in 2-3 words
- Secondary keywords = related tools, methods, or concepts mentioned

---

## Handling Edge Cases

| Scenario | What to do |
|----------|------------|
| **No transcript provided** | Ask for one. If unavailable, work from the title + any context the user provides. Mark timestamps as `[TIMESTAMPS TO BE ADDED]` placeholder. |
| **Short video (<5 min)** | 3-5 timestamps. Shorter body (50-100 words). Skip "Tools & Resources" section if only 1-2 tools mentioned. |
| **Interview / podcast format** | Use guest name in above-the-fold text. Add "Guest: [Name]" line after hook. Timestamps should mark each question/topic shift. |
| **Shorts (<60s)** | No timestamps. Minimal description: hook + AIA CTA + social links + hashtags. |
| **No lead magnet exists** | Flag this to the user: "No lead magnet for this video. Consider creating a [cheat sheet / template / checklist] at leadgenjay.com/r/[slug] or leadgenjay.com/value/[slug]." Then proceed without one. |
| **Discount code active** | Add code prominently: after the affiliate link, format as `(Use code [CODE] for [X]% off)` |

---

## Description Template

Every description follows this exact order. Do NOT skip sections. Do NOT reorder them.

```text
[ABOVE THE FOLD — lead magnet link or hook, 2-3 lines max]

TIMESTAMPS:
0:00 - [Chapter Title]
...

[BODY — keyword-rich summary]

TOOLS & RESOURCES MENTIONED:
- [Tool] - [context or link]

[PAID OFFER CTA — AIA or Lead Gen Insiders, topic-routed]

WORK WITH MY TEAM:
[Consult link with UTMs]
[One-liner]

FREE RESOURCES:
- [Community Skool link]
- [Lead magnet / free resources]

CONNECT WITH JAY:
[Social links]

ABOUT LEAD GEN JAY:
[Boilerplate]

#Hashtags
```

---

## Section-by-Section Rules

### 1. Above the Fold (Lines 1-3)

This is the ONLY text visible before "Show More." Two jobs: (a) hook the viewer, (b) include the primary keyword.

**If a lead magnet exists:**
```text
Grab my [Lead Magnet Name] here: {url}?utm_source=youtube&utm_medium=video&utm_campaign={slug}&utm_content=above_fold

[1-2 sentence hook - bold claim, result number, or pattern interrupt. Primary keyword in first sentence.]
```

**If no lead magnet:**
```text
[2-3 sentence hook with primary keyword. Lead with bold claim or result. Create curiosity gap.]

[Secondary sentence with urgency, data point, or "here's what you'll learn" framing.]
```

**Rules:**
- Primary keyword MUST appear in the first sentence
- Never start with "In this video I..."
- First person, conversational tone

### 2. Timestamps / Chapters

```text
TIMESTAMPS:
0:00 - [Keyword-Rich Chapter Title]
2:30 - [Keyword-Rich Chapter Title]
```

**Rules:**
- Format: `0:00 - Title` (colon-separated time, space-dash-space, title)
- First chapter starts at `0:00` (required for YouTube auto-chapters)
- Each chapter at least 10 seconds apart (YouTube requirement)
- 8-15 chapters for 15+ min videos, 5-8 for under 15 min
- Titles are 2-6 words, keyword-rich, scannable
- Include primary keyword in at least 2 chapter titles
- Derive timestamps from actual transcript topic transitions, not estimates

### 3. Body (Keyword-Rich Summary)

100-200 words. First person. 2-3 short paragraphs or paragraph + bullet list.

**Must include:**
- Primary keyword 2-3 times (natural, not stuffed)
- Secondary keywords 1-2 times each
- Specific takeaways the viewer gets
- Why this matters now (urgency/relevance)

**Format by video type:**
- Strategy/opinion: paragraph style
- Tutorial/how-to: "What you'll learn:" bullet list
- System/process: framework breakdown (Phase 1, Phase 2, etc.)

**Rules:**
- Specific > vague. "4% reply rates" not "better results"
- No filler. No "like and subscribe" in the body.

### 4. Tools & Resources Mentioned

Only include if 2+ tools mentioned. Skip for videos that only mention 1 tool.

```text
TOOLS & RESOURCES MENTIONED:
- Claude Code (Anthropic) - daily AI coding tool
- Instantly.ai - https://instantly.ai/?via=jay (Use code LGJ for 10% off)
- [Tool Name] - [3-8 word context or link]
```

**Rules:**
- Only list tools actually mentioned in the video
- Affiliate links keep their native tracking params (no UTMs added)
- Include discount codes inline: `(Use code [CODE] for [X]% off)`
- Non-affiliate tool links get UTMs with `utm_content=resources`

### 5. Paid Offer CTA (EVERY video - topic-routed)

Use AIA for AI/Claude Code/automation videos. Use Lead Gen Insiders for everything else.

**For AI / Claude Code / automation videos:**
```text
JOIN AI AUTOMATION INSIDERS:
https://leadgenjay.com/aia?utm_source=youtube&utm_medium=video&utm_campaign={slug}&utm_content=cta_primary
3,500+ members | Claude Code module (17 lessons) | [video-specific benefit] | All my apps, skills & workflows
```

**For cold email / lead gen / business / strategy videos:**
```text
JOIN LEAD GEN INSIDERS:
https://leadgenjay.com/insiders?utm_source=youtube&utm_medium=video&utm_campaign={slug}&utm_content=cta_primary
1,000+ members | 100+ hours of training | [video-specific benefit] | Weekly live coaching + 700M lead database
```

**Rules:**
- ALWAYS include one of the two - never skip
- One pipe-separated item MUST be customized to match the video's content
- Always include UTM parameters

### 6. Consult CTA (EVERY video)

```text
WORK WITH MY TEAM:
https://leadgenjay.com/consult?utm_source=youtube&utm_medium=video&utm_campaign={slug}&utm_content=cta_consult
Free 30-min strategy call | 4.9/5 from 190 reviews | For B2B businesses doing $10K+/mo
```

**Rules:**
- ALWAYS include on every video, no exceptions
- Always include UTM parameters
- Positioned after the paid offer CTA

### 7. Free Resources

Every video MUST have a free community link and at least one free resource.

**For AI / Claude Code / automation videos:**
```text
FREE RESOURCES:
- Free Skool Community: https://skool.com/ai-automation-insiders
- [Video-specific lead magnet if exists]
```

**For cold email / lead gen / business / strategy videos:**
```text
FREE RESOURCES:
- Free Skool Community: https://skool.com/lead-gen
- [Video-specific lead magnet if exists]
```

Also consider standalone free resources from the references file (8M leads database, free GHL course) when relevant to the video topic.

Only include related video links if directly relevant (e.g., "Part 1" link on Part 2 video, or a prerequisite tutorial).

### 8. Social Links

Always use these exact lines from `references/links-and-offers.md`. Never modify.

```text
CONNECT WITH JAY:
Instagram: https://instagram.com/leadgen
Twitter/X: https://x.com/leadgenjay
LinkedIn: https://linkedin.com/in/dr-jay-feldman
```

### 9. About Boilerplate

```text
ABOUT LEAD GEN JAY:
Cold email, AI automation, and lead generation strategies for entrepreneurs. Two 8-figure companies built. 3,500+ community members. 9+ years in the game.
```

### 10. Hashtags

Single line at the very end. 10-15 hashtags.

**Rules:**
- Always include: `#LeadGenJay` and `#AIAutomation`
- 3-5 topic-specific hashtags
- 3-5 broader reach hashtags
- Title case for multi-word: `#ClaudeCode` not `#claudecode`
- All on one line, space-separated

---

## SEO Keyword Strategy

For every description, identify and document:

| Type | Count | Placement |
|------|-------|-----------|
| **Primary keyword** | 1 phrase | Title, first sentence, 2+ chapter titles, 2-3x in body |
| **Secondary keywords** | 3-5 | Body paragraphs, chapter titles |
| **Long-tail keywords** | 3-5 | Body paragraphs as natural phrases |

### Tags (for YouTube Studio)
- 15-25 comma-separated phrases
- Mix of: primary keyword, secondary keywords, long-tail phrases, branded terms
- Include year for freshness (e.g., "claude code 2026")

---

## Caption Corrections

For every video with a transcript, generate a corrections table.

**Common corrections for this channel:**

| Auto-caption | Correct |
|--------------|---------|
| "Cloud" / "Cloud Code" / "Cloud Max" | "Claude" / "Claude Code" / "Claude Max" |
| "school" | "Skool" |
| "Lead genen J" | "Lead Gen Jay" |
| "go high level" | "GoHighLevel" |
| "n8n" (garbled) | "n8n" |
| "Chad GPT" | "ChatGPT" |
| "Dario Emod" | "Dario Amodei" |
| "Jensen Hong" | "Jensen Huang" |
| "Herozi" / "Hermosi" | "Hormozi" |
| "reotion" | "Remotion" |
| "Consulty" | "Instantly" |

Also correct: any person's name, any technical tool name, any branded term.

---

## Pinned Comment

Draft for every video. Purpose: engagement + secondary CTA.

```text
[1 sentence teasing next video or follow-up content]
[1 sentence CTA - community, lead magnet, or engagement question]
[Optional: "Drop a comment with [X]"]
```

**Rules:**
- Don't repeat the description hook
- Include a question to drive comments
- Under 300 characters

---

## Output Format

Deliver in this order:

1. **YouTube Description** (inside a code block for easy copy-paste)
2. **Tags** (comma-separated, inside a code block)
3. **Caption Corrections** (markdown table)
4. **Pinned Comment** (inside a code block)
5. **SEO Keyword Strategy** (primary, secondary, long-tail breakdown)

---

## Full Example

Here is a complete description following this skill's format, for the video "My 3-Phase AI Plan to Rebuild My Entire Business":

```text
I run two 8-figure companies and I just stopped everything - content, launches, offers - to rebuild my entire business with AI. This is my exact 3-phase AI plan and why you need to be doing this right now.

60,000+ tech jobs gone in Q1. CFOs predicting 9x more AI layoffs this year. There's a $5.5 trillion skills gap and 72% of employers can't find AI talent. The window is closing fast.

TIMESTAMPS:
0:00 - Why I Stopped Making Content
0:50 - The Data: AI Job Market & Skills Gap
2:58 - My 3-Phase AI Plan
3:07 - Phase 1: Enable Your Team With AI
5:12 - Mac Minis Running Claude Code 24/7
6:31 - Give Your Team Access via Slack & iMessage
8:58 - Phase 2: Remove Every Bottleneck With AI
10:30 - Old vs New AI Content Workflow
12:48 - Editing Videos With Claude Code & Remotion
13:57 - AI for Ads, Landing Pages & Cold Email
16:46 - The Hard Truth About Your Team & AI
18:50 - Phase 3: Restructure Your Business
19:45 - Your 3-Step AI Action Plan

I broke down my entire AI automation strategy across both companies. This isn't theory - I'm a Claude Code power user spending $400/month on AI, running Mac Minis as AI employees, and building custom skills and workflows that handle everything from content creation to customer support to cold email outreach.

Phase 1 - Enable your team. Build AI skills and workflows. Deploy on Mac Minis running Claude Code. Give access through Slack, iMessage, or Telegram.

Phase 2 - Remove bottlenecks. Map every workflow, find constraints, replace them with AI. I show how I did this for content, ads, landing pages, cold email, and customer support.

Phase 3 - Restructure. Your team either 50x their productivity with AI or gets left behind.

TOOLS & RESOURCES MENTIONED:
- Claude Code (Anthropic) - daily AI coding and workflow tool
- Claude Max ($200/mo) - heavy usage for building AI skills
- Mac Minis - running Claude Code 24/7 as AI employees
- Remotion - AI video editing with Claude Code
- GoHighLevel - CRM and pipeline management
- n8n - workflow automation

JOIN AI AUTOMATION INSIDERS:
https://leadgenjay.com/aia?utm_source=youtube&utm_medium=video&utm_campaign=my-ai-plan&utm_content=cta_primary
3,500+ members | Claude Code module (17 lessons) | AI workflow templates for every bottleneck | All my apps, skills & workflows

WORK WITH MY TEAM:
https://leadgenjay.com/consult?utm_source=youtube&utm_medium=video&utm_campaign=my-ai-plan&utm_content=cta_consult
Free 30-min strategy call | 4.9/5 from 190 reviews | For B2B businesses doing $10K+/mo

FREE RESOURCES:
- Free Skool Community: https://skool.com/ai-automation-insiders
- Claude Code Beginner Course: https://youtube.com/watch?v=334ZspMJeVo

CONNECT WITH JAY:
Instagram: https://instagram.com/leadgen
Twitter/X: https://x.com/leadgenjay
LinkedIn: https://linkedin.com/in/dr-jay-feldman

ABOUT LEAD GEN JAY:
Cold email, AI automation, and lead generation strategies for entrepreneurs. Two 8-figure companies built. 3,500+ community members. 9+ years in the game.

#AIAutomation #ClaudeCode #AIBusinessStrategy #AIAgents #MacMini #Anthropic #AITools #AIProductivity #AIWorkflow #LeadGenJay #BusinessAutomation #AIForBusiness #ClaudeAI #AIImplementation
```

---

## Quality Checklist (Internal - Don't Output)

Before delivering, verify:

- [ ] Total description under 5,000 characters
- [ ] First 2 lines under 300 characters and hook the viewer
- [ ] Primary keyword in first sentence
- [ ] Lead magnet link above the fold (if one exists)
- [ ] All timestamps start at 0:00, derived from actual transcript, at least 10s apart
- [ ] Paid offer CTA present (AIA or Lead Gen Insiders, topic-routed) with UTM parameters
- [ ] Consult CTA present (`/consult`) with UTM parameters
- [ ] Free community link present (AI Automation Insiders or Lead Gen Free Skool, topic-routed)
- [ ] All links use correct UTM schema from references file
- [ ] Affiliate links use their native params (no UTMs added)
- [ ] Discount codes included inline where applicable
- [ ] Social links match canonical URLs from references file
- [ ] About boilerplate included
- [ ] 10-15 hashtags on final line
- [ ] No banned AI words or em dashes anywhere
- [ ] Caption corrections cover all proper nouns and tech terms
- [ ] Pinned comment drafted
